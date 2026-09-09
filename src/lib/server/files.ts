import { db } from '$lib/server/db';
import { file, message } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFile, deleteFile } from '$lib/server/seaweedfs';
import { messageBus } from '$lib/server/messages';
import { MAX_UPLOAD_BYTES, formatSize } from '$lib/files';

/** Error carrying an HTTP status, raised by the file helpers on user-facing failures. */
export class FileError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'FileError';
	}
}

/** Strips path separators and control characters from a client-provided filename. */
export function sanitizeFilename(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? '';
	// eslint-disable-next-line no-control-regex
	const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
	return cleaned || 'file';
}

/** Throws a FileError when the upload is empty or exceeds MAX_UPLOAD_BYTES. */
export function assertUploadAllowed(upload: File): void {
	if (upload.size === 0) throw new FileError(400, 'No file selected');
	if (upload.size > MAX_UPLOAD_BYTES) {
		throw new FileError(
			413,
			`"${upload.name}" is too large (${formatSize(upload.size)}). Maximum size is ${formatSize(MAX_UPLOAD_BYTES)}.`
		);
	}
}

export interface StoreUploadOptions {
	teamId: string;
	channelId?: string | null;
	messageId?: string | null;
	userId: string;
	userName: string;
	upload: File;
}

/**
 * Single upload path for every feature (chat attachment, channel Files tab, global Files page).
 * Validates size, sanitizes the name, stores the blob, then the DB row. If the DB insert fails
 * the blob is removed again so SeaweedFS never keeps orphans.
 */
export async function storeUploadedFile(opts: StoreUploadOptions) {
	assertUploadAllowed(opts.upload);

	const name = sanitizeFilename(opts.upload.name);
	const fileId = crypto.randomUUID();
	// Object key: the S3 SDK encodes it on the wire, so the readable name is stored as-is.
	const storagePath = `${opts.teamId}/${fileId}/${name}`;

	await uploadFile(storagePath, opts.upload, opts.upload.type || 'application/octet-stream');

	try {
		const [record] = await db
			.insert(file)
			.values({
				id: fileId,
				teamId: opts.teamId,
				channelId: opts.channelId ?? null,
				messageId: opts.messageId ?? null,
				userId: opts.userId,
				userName: opts.userName,
				name,
				size: opts.upload.size,
				mimeType: opts.upload.type || 'application/octet-stream',
				storagePath
			})
			.returning();
		return record;
	} catch (err) {
		await deleteFile(storagePath).catch(() => {});
		throw err;
	}
}

export type DeleteFileResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * Single delete path for every feature. Removes the blob and the row, then keeps the chat
 * consistent: a message left with no text and no files is deleted, otherwise connected clients
 * are told to drop the attachment. Both cases are broadcast over the message bus.
 */
export async function deleteFileWithCleanup(
	fileId: string,
	userId: string
): Promise<DeleteFileResult> {
	if (!fileId) return { ok: false, status: 400, message: 'File id is required' };

	const [fileRecord] = await db.select().from(file).where(eq(file.id, fileId)).limit(1);
	if (!fileRecord) return { ok: false, status: 404, message: 'File not found' };
	if (fileRecord.userId !== userId) {
		return { ok: false, status: 403, message: 'Only the file owner can delete this file' };
	}

	await deleteFile(fileRecord.storagePath);
	await db.delete(file).where(eq(file.id, fileId));

	if (fileRecord.messageId) {
		const [msg] = await db
			.select()
			.from(message)
			.where(eq(message.id, fileRecord.messageId))
			.limit(1);

		if (msg) {
			const remainingFiles = await db
				.select({ id: file.id })
				.from(file)
				.where(eq(file.messageId, msg.id))
				.limit(1);

			if (remainingFiles.length === 0 && !msg.content.trim()) {
				await db.delete(message).where(eq(message.id, msg.id));
				messageBus.publishEvent(msg.channelId, { type: 'delete', data: { id: msg.id } });
			} else {
				messageBus.publishEvent(msg.channelId, {
					type: 'file_delete',
					data: { id: fileId, messageId: msg.id }
				});
			}
		}
	}

	return { ok: true };
}

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadFile, deleteFile as deleteStorageFile } from '$lib/server/seaweedfs';
import { db } from '$lib/server/db';
import { file, message } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { messageBus } from '$lib/server/messages';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const fileId = url.searchParams.get('id');
	if (!fileId) throw error(400, 'File id is required');

	const [fileRecord] = await db.select().from(file).where(eq(file.id, fileId)).limit(1);
	if (!fileRecord) throw error(404, 'File not found');

	const response = await downloadFile(fileRecord.storagePath);
	const blob = await response.blob();

	const inline = url.searchParams.get('inline') === '1';
	const disposition = inline
		? `inline; filename="${fileRecord.name}"`
		: `attachment; filename="${fileRecord.name}"`;

	return new Response(blob, {
		headers: {
			'Content-Type': fileRecord.mimeType,
			'Content-Disposition': disposition,
			'Content-Length': String(fileRecord.size)
		}
	});
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const fileId = url.searchParams.get('id');
	if (!fileId) throw error(400, 'File id is required');

	const [fileRecord] = await db.select().from(file).where(eq(file.id, fileId)).limit(1);
	if (!fileRecord) throw error(404, 'File not found');
	if (fileRecord.userId !== locals.user.id) throw error(403, 'Not your file');

	// Delete from SeaweedFS + DB
	await deleteStorageFile(fileRecord.storagePath);
	await db.delete(file).where(eq(file.id, fileId));

	// If file was attached to a message, check if message is now empty
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
				.where(eq(file.messageId, fileRecord.messageId))
				.limit(1);

			if (remainingFiles.length === 0 && !msg.content.trim()) {
				// Message has no text and no files left — delete it
				await db.delete(message).where(eq(message.id, msg.id));
				messageBus.publishEvent(msg.channelId, {
					type: 'delete',
					data: { id: msg.id }
				});
			} else {
				// Notify clients to remove the file from the message
				messageBus.publishEvent(msg.channelId, {
					type: 'file_delete',
					data: { id: fileId, messageId: msg.id }
				});
			}
		}
	}

	return json({ ok: true });
};

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { message, file, channel } from '$lib/server/db/schema';
import { messageBus } from '$lib/server/messages';
import type { ChatFile } from '$lib/server/messages';
import { uploadFile, deleteFile as deleteStorageFile } from '$lib/server/seaweedfs';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const contentType = request.headers.get('Content-Type') || '';
	let channelId: string;
	let content: string;
	let uploadedFiles: File[] = [];

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();
		channelId = formData.get('channelId') as string;
		content = (formData.get('content') as string) || '';
		const files = formData.getAll('files');
		uploadedFiles = files.filter((f): f is File => f instanceof File && f.size > 0);
	} else {
		const body = await request.json();
		channelId = body.channelId;
		content = body.content;
	}

	if (!channelId) throw error(400, 'channelId is required');
	if (!content?.trim() && uploadedFiles.length === 0) {
		throw error(400, 'content or files are required');
	}

	const [ch] = await db
		.select({ teamId: channel.teamId })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	const [inserted] = await db
		.insert(message)
		.values({
			channelId,
			userId: locals.user.id,
			userName: locals.user.name,
			content: content?.trim() || ''
		})
		.returning();

	const chatFiles: ChatFile[] = [];
	for (const f of uploadedFiles) {
		const fileId = crypto.randomUUID();
		const storagePath = `equipe/${ch.teamId}/${fileId}/${f.name}`;
		await uploadFile(storagePath, f, f.name);

		const [fileRecord] = await db
			.insert(file)
			.values({
				id: fileId,
				teamId: ch.teamId,
				channelId,
				messageId: inserted.id,
				userId: locals.user.id,
				userName: locals.user.name,
				name: f.name,
				size: f.size,
				mimeType: f.type || 'application/octet-stream',
				storagePath
			})
			.returning();

		chatFiles.push({
			id: fileRecord.id,
			name: fileRecord.name,
			size: fileRecord.size,
			mimeType: fileRecord.mimeType
		});
	}

	const chatMessage = {
		id: inserted.id,
		channelId: inserted.channelId,
		userId: inserted.userId,
		userName: inserted.userName,
		content: inserted.content,
		createdAt: inserted.createdAt.toISOString(),
		files: chatFiles.length > 0 ? chatFiles : undefined
	};

	messageBus.publish(channelId, chatMessage);

	return json(chatMessage, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const { id, content } = await request.json();
	if (!id) throw error(400, 'id is required');
	if (content == null) throw error(400, 'content is required');

	const [msg] = await db.select().from(message).where(eq(message.id, id)).limit(1);
	if (!msg) throw error(404, 'Message not found');
	if (msg.userId !== locals.user.id) throw error(403, 'Not your message');

	const [updated] = await db
		.update(message)
		.set({ content: content.trim() })
		.where(eq(message.id, id))
		.returning();

	const files = await db.select().from(file).where(eq(file.messageId, id));

	const chatMessage = {
		id: updated.id,
		channelId: updated.channelId,
		userId: updated.userId,
		userName: updated.userName,
		content: updated.content,
		createdAt: updated.createdAt.toISOString(),
		files:
			files.length > 0
				? files.map((f) => ({ id: f.id, name: f.name, size: f.size, mimeType: f.mimeType }))
				: undefined
	};

	messageBus.publishEvent(updated.channelId, { type: 'update', data: chatMessage });

	return json(chatMessage);
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const id = url.searchParams.get('id');
	if (!id) throw error(400, 'id is required');

	const [msg] = await db.select().from(message).where(eq(message.id, id)).limit(1);
	if (!msg) throw error(404, 'Message not found');
	if (msg.userId !== locals.user.id) throw error(403, 'Not your message');

	// Delete attached files from SeaweedFS
	const files = await db.select().from(file).where(eq(file.messageId, id));
	for (const f of files) {
		await deleteStorageFile(f.storagePath);
	}
	if (files.length > 0) {
		await db.delete(file).where(eq(file.messageId, id));
	}

	await db.delete(message).where(eq(message.id, id));

	messageBus.publishEvent(msg.channelId, { type: 'delete', data: { id } });

	return json({ ok: true });
};

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { message, file, channel, team, teamMember } from '$lib/server/db/schema';
import { messageBus } from '$lib/server/messages';
import type { ChatFile } from '$lib/server/messages';
import { notificationBus } from '$lib/server/notifications';
import { uploadFile, deleteFile as deleteStorageFile } from '$lib/server/seaweedfs';
import { eq, and, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const channelId = url.searchParams.get('channelId');
	if (!channelId) throw error(400, 'channelId is required');

	const [ch] = await db
		.select({ teamId: channel.teamId })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, locals.user.id)))
		.limit(1);
	if (!membership) throw error(403, 'Not a member of this team');

	const messages = await db
		.select()
		.from(message)
		.where(eq(message.channelId, channelId))
		.orderBy(desc(message.createdAt))
		.limit(50);

	const messageIds = messages.map((m) => m.id);
	const filesByMessage: Record<
		string,
		{ id: string; name: string; size: number; mimeType: string }[]
	> = {};

	if (messageIds.length > 0) {
		const files = await db
			.select({
				id: file.id,
				messageId: file.messageId,
				name: file.name,
				size: file.size,
				mimeType: file.mimeType
			})
			.from(file)
			.where(eq(file.channelId, channelId));

		for (const f of files) {
			if (f.messageId) {
				if (!filesByMessage[f.messageId]) filesByMessage[f.messageId] = [];
				filesByMessage[f.messageId].push({
					id: f.id,
					name: f.name,
					size: f.size,
					mimeType: f.mimeType
				});
			}
		}
	}

	return json(
		messages.reverse().map((m) => ({
			id: m.id,
			channelId: m.channelId,
			userId: m.userId,
			userName: m.userName,
			content: m.content,
			createdAt: m.createdAt.toISOString(),
			files: filesByMessage[m.id] || undefined
		}))
	);
};

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
		.select({ teamId: channel.teamId, channelName: channel.name })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	// Verify user is a member of the channel's team
	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, locals.user.id)))
		.limit(1);
	if (!membership) throw error(403, 'Not a member of this team');

	const [teamRow] = await db
		.select({ name: team.name })
		.from(team)
		.where(eq(team.id, ch.teamId))
		.limit(1);

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

	notificationBus.publish(ch.teamId, {
		id: crypto.randomUUID(),
		type: chatFiles.length > 0 && !content?.trim() ? 'new_file' : 'new_message',
		teamId: ch.teamId,
		teamName: teamRow?.name ?? '',
		channelId,
		channelName: ch.channelName,
		userId: locals.user.id,
		userName: locals.user.name,
		preview: content?.trim()
			? content.trim().slice(0, 100)
			: chatFiles.map((f) => f.name).join(', '),
		createdAt: inserted.createdAt.toISOString()
	});

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

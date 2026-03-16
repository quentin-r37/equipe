import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { message } from '$lib/server/db/schema';
import { messageBus } from '$lib/server/messages';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const body = await request.json();
	const { channelId, content } = body;

	if (!channelId || !content?.trim()) {
		throw error(400, 'channelId and content are required');
	}

	const [inserted] = await db
		.insert(message)
		.values({
			channelId,
			userId: locals.user.id,
			userName: locals.user.name,
			content: content.trim()
		})
		.returning();

	const chatMessage = {
		id: inserted.id,
		channelId: inserted.channelId,
		userId: inserted.userId,
		userName: inserted.userName,
		content: inserted.content,
		createdAt: inserted.createdAt.toISOString()
	};

	messageBus.publish(channelId, chatMessage);

	return json(chatMessage, { status: 201 });
};

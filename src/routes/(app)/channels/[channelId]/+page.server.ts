import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { message, file } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const channelId = event.params.channelId;

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

	return {
		messages: messages.reverse().map((m) => ({
			...m,
			createdAt: m.createdAt.toISOString(),
			files: filesByMessage[m.id] || undefined
		}))
	};
};

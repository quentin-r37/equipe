import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { message, file, channel, teamMember } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const channelId = event.params.channelId;

	// Verify user is a member of the channel's team
	const [ch] = await db
		.select({ teamId: channel.teamId })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	const [membership] = await db
		.select()
		.from(teamMember)
		.where(
			and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, event.locals.user.id))
		)
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

	return {
		messages: messages.reverse().map((m) => ({
			...m,
			createdAt: m.createdAt.toISOString(),
			files: filesByMessage[m.id] || undefined
		}))
	};
};

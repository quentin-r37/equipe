import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { channel, teamMember } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const channelId = event.params.channelId;

	const [ch] = await db.select().from(channel).where(eq(channel.id, channelId)).limit(1);
	if (!ch) throw error(404, 'Channel not found');

	// Verify membership
	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, event.locals.user.id)))
		.limit(1);

	if (!membership) throw error(403, 'Not a member of this team');

	return {
		channel: ch,
		membership
	};
};

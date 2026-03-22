import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { meeting, channel, teamMember } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { createRoomToken } from '$lib/server/livekit';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const meetingId = event.params.meetingId;

	const [m] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);
	if (!m) throw error(404, 'Meeting not found');

	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, m.teamId), eq(teamMember.userId, event.locals.user.id)))
		.limit(1);

	if (!membership) throw error(403, 'Not a member of this team');

	const token = await createRoomToken(
		`meeting-${meetingId}`,
		event.locals.user.name,
		event.locals.user.id
	);

	const teamChannels = await db
		.select({ id: channel.id, name: channel.name })
		.from(channel)
		.where(eq(channel.teamId, m.teamId));

	return {
		meeting: { ...m, createdAt: m.createdAt.toISOString() },
		livekitUrl: env.LIVEKIT_URL || 'ws://localhost:7880',
		token,
		teamChannels,
		userId: event.locals.user.id
	};
};

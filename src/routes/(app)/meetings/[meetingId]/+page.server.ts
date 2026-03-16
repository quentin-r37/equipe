import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { meeting } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createRoomToken } from '$lib/server/livekit';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const meetingId = event.params.meetingId;

	const [m] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);
	if (!m) throw error(404, 'Meeting not found');

	const token = await createRoomToken(
		`meeting-${meetingId}`,
		event.locals.user.name,
		event.locals.user.id
	);

	return {
		meeting: { ...m, createdAt: m.createdAt.toISOString() },
		livekitUrl: env.LIVEKIT_URL?.replace('ws://', 'ws://') || 'ws://localhost:7880',
		token
	};
};

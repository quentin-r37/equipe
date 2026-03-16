import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { channel, meeting } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const channelId = event.params.channelId;

	const [ch] = await db
		.select({ teamId: channel.teamId })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	const meetings = await db
		.select()
		.from(meeting)
		.where(eq(meeting.teamId, ch.teamId))
		.orderBy(desc(meeting.createdAt))
		.limit(50);

	return {
		meetings: meetings.map((m) => ({
			...m,
			createdAt: m.createdAt.toISOString()
		}))
	};
};

export const actions: Actions = {
	create: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const channelId = event.params.channelId;

		const [ch] = await db
			.select({ teamId: channel.teamId })
			.from(channel)
			.where(eq(channel.id, channelId))
			.limit(1);
		if (!ch) throw error(404, 'Channel not found');

		const formData = await event.request.formData();
		const title = formData.get('title')?.toString()?.trim() ?? '';

		if (!title) return fail(400, { message: 'Meeting title is required' });

		const [newMeeting] = await db
			.insert(meeting)
			.values({
				teamId: ch.teamId,
				title,
				status: 'active',
				createdBy: event.locals.user.id
			})
			.returning();

		throw redirect(302, `/meetings/${newMeeting.id}`);
	}
};

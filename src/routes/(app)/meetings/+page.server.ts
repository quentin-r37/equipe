import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { meeting, teamMember } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const meetings = await db.select().from(meeting).orderBy(desc(meeting.createdAt)).limit(50);

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

		const formData = await event.request.formData();
		const title = formData.get('title')?.toString()?.trim() ?? '';
		const teamId = formData.get('teamId')?.toString() ?? '';

		if (!title) return fail(400, { message: 'Meeting title is required' });
		if (!teamId) return fail(400, { message: 'Team is required' });

		const [newMeeting] = await db
			.insert(meeting)
			.values({
				teamId,
				title,
				status: 'active',
				createdBy: event.locals.user.id
			})
			.returning();

		throw redirect(302, `/meetings/${newMeeting.id}`);
	},
	end: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const meetingId = formData.get('meetingId')?.toString() ?? '';

		await db
			.update(meeting)
			.set({ status: 'ended' })
			.where(eq(meeting.id, meetingId));

		return { success: true };
	}
};

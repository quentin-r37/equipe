import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { meeting, team, teamMember } from '$lib/server/db/schema';
import { notificationBus } from '$lib/server/notifications';
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

		const [teamRow] = await db
			.select({ name: team.name })
			.from(team)
			.where(eq(team.id, teamId))
			.limit(1);

		notificationBus.publish(teamId, {
			id: crypto.randomUUID(),
			type: 'new_meeting',
			teamId,
			teamName: teamRow?.name ?? '',
			meetingId: newMeeting.id,
			meetingTitle: title,
			userId: event.locals.user.id,
			userName: event.locals.user.name,
			preview: title,
			createdAt: newMeeting.createdAt.toISOString()
		});

		throw redirect(302, `/meetings/${newMeeting.id}`);
	},
	end: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const meetingId = formData.get('meetingId')?.toString() ?? '';

		await db.update(meeting).set({ status: 'ended' }).where(eq(meeting.id, meetingId));

		return { success: true };
	},
	delete: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const meetingId = formData.get('meetingId')?.toString() ?? '';

		const [m] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);

		if (!m) return fail(404, { message: 'Meeting not found' });
		if (m.createdBy !== event.locals.user.id) {
			return fail(403, { message: 'Only the meeting creator can delete' });
		}

		await db.delete(meeting).where(eq(meeting.id, meetingId));

		return { success: true };
	}
};

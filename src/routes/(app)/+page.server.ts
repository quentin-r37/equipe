import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { team, teamMember, channel, meeting } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const userId = event.locals.user.id;

	const activeMeetings = await db
		.select()
		.from(meeting)
		.where(eq(meeting.status, 'active'));

	return { activeMeetings };
};

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		throw redirect(302, '/login');
	},
	createTeam: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString()?.trim() ?? '';
		const description = formData.get('description')?.toString()?.trim() ?? '';

		if (!name) return fail(400, { message: 'Team name is required' });

		const [newTeam] = await db
			.insert(team)
			.values({ name, description, createdBy: event.locals.user.id })
			.returning();

		// Add creator as owner
		await db.insert(teamMember).values({
			teamId: newTeam.id,
			userId: event.locals.user.id,
			role: 'owner'
		});

		// Create a default "general" channel
		await db.insert(channel).values({
			teamId: newTeam.id,
			name: 'general',
			description: 'General discussion',
			createdBy: event.locals.user.id
		});

		return { success: true };
	},
	createChannel: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const teamId = formData.get('teamId')?.toString() ?? '';
		const name = formData.get('name')?.toString()?.trim() ?? '';

		if (!teamId || !name) return fail(400, { message: 'Team and channel name are required' });

		// Verify membership
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership) return fail(403, { message: 'Not a team member' });

		await db.insert(channel).values({
			teamId,
			name,
			createdBy: event.locals.user.id
		});

		return { success: true };
	}
};

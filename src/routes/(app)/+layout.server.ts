import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { team, teamMember, channel } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const userId = event.locals.user.id;

	// Get teams where user is a member
	const memberships = await db
		.select({ teamId: teamMember.teamId, role: teamMember.role })
		.from(teamMember)
		.where(eq(teamMember.userId, userId));

	const teamIds = memberships.map((m) => m.teamId);

	let teams: { id: string; name: string; description: string | null }[] = [];
	let channels: { id: string; teamId: string; name: string; description: string | null }[] = [];

	if (teamIds.length > 0) {
		const allTeams = await db.select().from(team);
		teams = allTeams.filter((t) => teamIds.includes(t.id));

		const allChannels = await db.select().from(channel);
		channels = allChannels.filter((c) => teamIds.includes(c.teamId));
	}

	return {
		user: event.locals.user,
		teams,
		channels
	};
};

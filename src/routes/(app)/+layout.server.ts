import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { team, teamMember, channel } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { isAdmin } from '$lib/server/admin';

export type TeamRole = 'owner' | 'admin' | 'member';

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const userId = event.locals.user.id;

	// Get teams where user is a member
	const memberships = await db
		.select({ teamId: teamMember.teamId, role: teamMember.role })
		.from(teamMember)
		.where(eq(teamMember.userId, userId));

	const teamIds = memberships.map((m) => m.teamId);

	/** Role of the current user in each of their teams, keyed by team id. */
	const roles: Record<string, TeamRole> = {};
	for (const m of memberships) roles[m.teamId] = m.role as TeamRole;

	let teams: { id: string; name: string; description: string | null }[] = [];
	let channels: {
		id: string;
		teamId: string;
		name: string;
		description: string | null;
		createdBy: string;
	}[] = [];

	if (teamIds.length > 0) {
		teams = await db
			.select({ id: team.id, name: team.name, description: team.description })
			.from(team)
			.where(inArray(team.id, teamIds));

		channels = await db
			.select({
				id: channel.id,
				teamId: channel.teamId,
				name: channel.name,
				description: channel.description,
				createdBy: channel.createdBy
			})
			.from(channel)
			.where(inArray(channel.teamId, teamIds));
	}

	return {
		user: event.locals.user,
		isAdmin: isAdmin(event.locals.user.email),
		teams,
		channels,
		roles
	};
};

import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { team, teamMember, channel, meeting, user } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const teamId = event.params.teamId;

	// Verify membership
	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
		.limit(1);

	if (!membership) throw error(403, 'You are not a member of this team');

	// Get team details
	const [teamData] = await db.select().from(team).where(eq(team.id, teamId)).limit(1);
	if (!teamData) throw error(404, 'Team not found');

	// Get members with user info
	const members = await db
		.select({
			id: teamMember.id,
			userId: teamMember.userId,
			role: teamMember.role,
			joinedAt: teamMember.joinedAt,
			userName: user.name,
			userEmail: user.email
		})
		.from(teamMember)
		.innerJoin(user, eq(teamMember.userId, user.id))
		.where(eq(teamMember.teamId, teamId));

	// Get channel count
	const [channelCount] = await db
		.select({ count: count() })
		.from(channel)
		.where(eq(channel.teamId, teamId));

	// Get meeting count
	const [meetingCount] = await db
		.select({ count: count() })
		.from(meeting)
		.where(eq(meeting.teamId, teamId));

	return {
		team: teamData,
		members: members.map((m) => ({
			...m,
			joinedAt: m.joinedAt.toISOString()
		})),
		currentUserRole: membership.role,
		channelCount: channelCount?.count ?? 0,
		meetingCount: meetingCount?.count ?? 0
	};
};

export const actions: Actions = {
	updateDescription: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const teamId = event.params.teamId;
		const formData = await event.request.formData();
		const description = formData.get('description')?.toString()?.trim() ?? '';

		// Only owner/admin can edit
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership || membership.role === 'member') {
			return fail(403, { message: 'Only team owners and admins can edit the description' });
		}

		await db.update(team).set({ description }).where(eq(team.id, teamId));

		return { success: true };
	},
	addMember: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const teamId = event.params.teamId;
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';

		if (!email) return fail(400, { addMemberError: 'Email is required' });

		// Only owner/admin can add
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership || membership.role === 'member') {
			return fail(403, { addMemberError: 'Only team owners and admins can add members' });
		}

		// Find user by email
		const [targetUser] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, email))
			.limit(1);

		if (!targetUser) {
			return fail(404, { addMemberError: 'No user found with this email' });
		}

		// Check if already a member
		const [existing] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, targetUser.id)))
			.limit(1);

		if (existing) {
			return fail(409, { addMemberError: 'This user is already a member' });
		}

		await db.insert(teamMember).values({
			teamId,
			userId: targetUser.id,
			role: 'member'
		});

		return { success: true };
	},
	removeMember: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const teamId = event.params.teamId;
		const formData = await event.request.formData();
		const memberId = formData.get('memberId')?.toString() ?? '';

		if (!memberId) return fail(400, { message: 'Member ID is required' });

		// Get the current user's role
		const [currentMembership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!currentMembership) return fail(403, { message: 'Not a team member' });

		// Get the target member
		const [target] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.id, memberId), eq(teamMember.teamId, teamId)))
			.limit(1);

		if (!target) return fail(404, { message: 'Member not found' });

		// Cannot remove the owner
		if (target.role === 'owner') {
			return fail(403, { message: 'Cannot remove the team owner' });
		}

		// Only owner/admin can remove others; members can only leave themselves
		const isSelf = target.userId === event.locals.user.id;
		const isOwnerOrAdmin = currentMembership.role === 'owner' || currentMembership.role === 'admin';

		if (!isSelf && !isOwnerOrAdmin) {
			return fail(403, { message: 'Only team owners and admins can remove members' });
		}

		await db.delete(teamMember).where(eq(teamMember.id, memberId));

		// If the user removed themselves, redirect to dashboard
		if (isSelf) {
			throw redirect(302, '/');
		}

		return { success: true };
	},
	updateRole: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const teamId = event.params.teamId;
		const formData = await event.request.formData();
		const memberId = formData.get('memberId')?.toString() ?? '';
		const newRole = formData.get('role')?.toString() ?? '';

		if (!memberId || !newRole) return fail(400, { message: 'Member ID and role are required' });
		if (!['admin', 'member'].includes(newRole)) return fail(400, { message: 'Invalid role' });

		// Only owner can change roles
		const [currentMembership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!currentMembership || currentMembership.role !== 'owner') {
			return fail(403, { message: 'Only the team owner can change roles' });
		}

		// Cannot change owner's role
		const [target] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.id, memberId), eq(teamMember.teamId, teamId)))
			.limit(1);

		if (!target) return fail(404, { message: 'Member not found' });
		if (target.role === 'owner') return fail(403, { message: "Cannot change the owner's role" });

		await db.update(teamMember).set({ role: newRole }).where(eq(teamMember.id, memberId));

		return { success: true };
	}
};

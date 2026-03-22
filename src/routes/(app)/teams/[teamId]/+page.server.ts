import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { team, teamMember, teamInvitation, channel, meeting, user } from '$lib/server/db/schema';
import { eq, and, count, gt } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { sendEmail, invitationEmailHtml } from '$lib/server/email';

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

	// Get pending invitations (owner/admin only)
	let pendingInvitations: {
		id: string;
		email: string;
		role: string;
		createdAt: string;
	}[] = [];

	if (membership.role === 'owner' || membership.role === 'admin') {
		const invitations = await db
			.select({
				id: teamInvitation.id,
				email: teamInvitation.email,
				role: teamInvitation.role,
				createdAt: teamInvitation.createdAt
			})
			.from(teamInvitation)
			.where(and(eq(teamInvitation.teamId, teamId), gt(teamInvitation.expiresAt, new Date())));

		pendingInvitations = invitations.map((i) => ({
			...i,
			createdAt: i.createdAt.toISOString()
		}));
	}

	return {
		team: teamData,
		members: members.map((m) => ({
			...m,
			joinedAt: m.joinedAt.toISOString()
		})),
		currentUserRole: membership.role,
		channelCount: channelCount?.count ?? 0,
		meetingCount: meetingCount?.count ?? 0,
		pendingInvitations
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

		if (targetUser) {
			// User exists — add directly
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

			return { success: true, invited: false };
		}

		// User doesn't exist — send invitation
		const [existingInvitation] = await db
			.select()
			.from(teamInvitation)
			.where(
				and(
					eq(teamInvitation.teamId, teamId),
					eq(teamInvitation.email, email),
					gt(teamInvitation.expiresAt, new Date())
				)
			)
			.limit(1);

		if (existingInvitation) {
			return fail(409, { addMemberError: 'An invitation has already been sent to this email' });
		}

		// Get team name for email
		const [teamData] = await db
			.select({ name: team.name })
			.from(team)
			.where(eq(team.id, teamId))
			.limit(1);

		// Create invitation (expires in 7 days)
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await db.insert(teamInvitation).values({
			teamId,
			email,
			role: 'member',
			invitedBy: event.locals.user.id,
			expiresAt
		});

		// Send invitation email
		const origin = env.ORIGIN || 'http://localhost:5173';
		const signupUrl = `${origin}/login`;

		void sendEmail({
			to: email,
			subject: `Invitation à rejoindre ${teamData?.name ?? 'une équipe'} - Equipe`,
			htmlContent: invitationEmailHtml(
				teamData?.name ?? 'une équipe',
				event.locals.user.name,
				signupUrl
			)
		});

		return { success: true, invited: true };
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
	},
	cancelInvitation: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const teamId = event.params.teamId;
		const formData = await event.request.formData();
		const invitationId = formData.get('invitationId')?.toString() ?? '';

		if (!invitationId) return fail(400, { message: 'Invitation ID is required' });

		// Only owner/admin can cancel
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership || membership.role === 'member') {
			return fail(403, { message: 'Only team owners and admins can cancel invitations' });
		}

		await db
			.delete(teamInvitation)
			.where(and(eq(teamInvitation.id, invitationId), eq(teamInvitation.teamId, teamId)));

		return { success: true };
	}
};

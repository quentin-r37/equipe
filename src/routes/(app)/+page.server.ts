import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { team, teamMember, channel, meeting, file, message } from '$lib/server/db/schema';
import { eq, and, inArray, desc, count } from 'drizzle-orm';
import { deleteFile } from '$lib/server/seaweedfs';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const userId = event.locals.user.id;

	// Get user's team IDs
	const memberships = await db
		.select({ teamId: teamMember.teamId })
		.from(teamMember)
		.where(eq(teamMember.userId, userId));
	const teamIds = memberships.map((m) => m.teamId);

	const activeMeetings = await db.select().from(meeting).where(eq(meeting.status, 'active'));

	// Member counts per team
	let memberCounts: Record<string, number> = {};
	if (teamIds.length > 0) {
		const counts = await db
			.select({ teamId: teamMember.teamId, count: count() })
			.from(teamMember)
			.where(inArray(teamMember.teamId, teamIds))
			.groupBy(teamMember.teamId);
		for (const c of counts) {
			memberCounts[c.teamId] = c.count;
		}
	}

	// File count for stats
	let fileCount = 0;
	if (teamIds.length > 0) {
		const [result] = await db
			.select({ count: count() })
			.from(file)
			.where(inArray(file.teamId, teamIds));
		fileCount = result?.count ?? 0;
	}

	// Recent messages across user's channels
	let recentMessages: {
		id: string;
		channelId: string;
		userName: string;
		content: string;
		createdAt: Date;
	}[] = [];
	if (teamIds.length > 0) {
		const userChannels = await db
			.select({ id: channel.id })
			.from(channel)
			.where(inArray(channel.teamId, teamIds));
		const channelIds = userChannels.map((c) => c.id);
		if (channelIds.length > 0) {
			recentMessages = await db
				.select({
					id: message.id,
					channelId: message.channelId,
					userName: message.userName,
					content: message.content,
					createdAt: message.createdAt
				})
				.from(message)
				.where(inArray(message.channelId, channelIds))
				.orderBy(desc(message.createdAt))
				.limit(5);
		}
	}

	return { activeMeetings, memberCounts, fileCount, recentMessages };
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
	},
	deleteTeam: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const teamId = formData.get('teamId')?.toString() ?? '';

		if (!teamId) return fail(400, { message: 'Team ID is required' });

		// Only the team owner can delete
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(
				and(
					eq(teamMember.teamId, teamId),
					eq(teamMember.userId, event.locals.user.id),
					eq(teamMember.role, 'owner')
				)
			)
			.limit(1);

		if (!membership) return fail(403, { message: 'Only the team owner can delete the team' });

		// Delete associated files from SeaweedFS before cascade removes DB records
		const teamFiles = await db.select().from(file).where(eq(file.teamId, teamId));
		for (const f of teamFiles) {
			await deleteFile(f.storagePath);
		}

		await db.delete(team).where(eq(team.id, teamId));

		return { success: true };
	},
	deleteChannel: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const channelId = formData.get('channelId')?.toString() ?? '';

		if (!channelId) return fail(400, { message: 'Channel ID is required' });

		const [ch] = await db.select().from(channel).where(eq(channel.id, channelId)).limit(1);

		if (!ch) return fail(404, { message: 'Channel not found' });

		// Allow channel creator or team owner/admin
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership) return fail(403, { message: 'Not a team member' });

		const isCreator = ch.createdBy === event.locals.user.id;
		const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin';

		if (!isCreator && !isOwnerOrAdmin) {
			return fail(403, { message: 'Only the channel creator or team admin can delete' });
		}

		await db.delete(channel).where(eq(channel.id, channelId));

		return { success: true };
	}
};

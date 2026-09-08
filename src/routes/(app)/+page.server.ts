import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { team, teamMember, channel, meeting, file, message, user } from '$lib/server/db/schema';
import { eq, and, inArray, desc, count, gte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { deleteFile } from '$lib/server/seaweedfs';

/** Width of the KPI sparkline window, in days. */
const TREND_DAYS = 14;

/** Local-time `YYYY-MM-DD`, matching what `date_trunc` returns for a `timestamp` column. */
function dayKey(d: Date): string {
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${m}-${day}`;
}

/** Per-day `to_char` bucket key for a timestamp column, used in both SELECT and GROUP BY. */
const dayOf = (col: AnyPgColumn) => sql<string>`to_char(date_trunc('day', ${col}), 'YYYY-MM-DD')`;

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
	const memberCounts: Record<string, number> = {};
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

	/*
	 * The series behind each KPI sparkline: how many of that thing were created per day
	 * over the trend window, oldest first. Buckets are dense (missing days are 0) so the
	 * four plots share one time axis and can be read against each other.
	 */
	const since = new Date();
	since.setHours(0, 0, 0, 0);
	since.setDate(since.getDate() - (TREND_DAYS - 1));

	// Bucket key per slot, so a row's day maps straight to its index.
	const slotOf = new Map<string, number>();
	for (let i = 0; i < TREND_DAYS; i++) {
		const d = new Date(since);
		d.setDate(since.getDate() + i);
		slotOf.set(dayKey(d), i);
	}

	const bucketize = (rows: { day: string; total: number }[]): number[] => {
		const series = new Array<number>(TREND_DAYS).fill(0);
		for (const row of rows) {
			const slot = slotOf.get(row.day);
			if (slot !== undefined) series[slot] = row.total;
		}
		return series;
	};

	/** Daily creation counts for one table, scoped to the user's teams. */
	const createdPerDay = async (table: PgTable, col: AnyPgColumn, scope: SQL | undefined) => {
		const day = dayOf(col);
		const rows = await db
			.select({ day, total: count() })
			.from(table)
			.where(and(scope, gte(col, since)))
			.groupBy(day);
		return bucketize(rows);
	};

	const emptySeries = new Array<number>(TREND_DAYS).fill(0);
	const trends =
		teamIds.length === 0
			? { teams: emptySeries, channels: emptySeries, meetings: emptySeries, files: emptySeries }
			: await (async () => {
					const [teams, channels, meetings, files] = await Promise.all([
						createdPerDay(team, team.createdAt, inArray(team.id, teamIds)),
						createdPerDay(channel, channel.createdAt, inArray(channel.teamId, teamIds)),
						createdPerDay(meeting, meeting.createdAt, inArray(meeting.teamId, teamIds)),
						createdPerDay(file, file.createdAt, inArray(file.teamId, teamIds))
					]);
					return { teams, channels, meetings, files };
				})();

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

	return {
		activeMeetings,
		memberCounts,
		fileCount,
		recentMessages,
		trends,
		trendDays: TREND_DAYS
	};
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
		const [general] = await db
			.insert(channel)
			.values({
				teamId: newTeam.id,
				name: 'general',
				description: 'General discussion',
				createdBy: event.locals.user.id
			})
			.returning();

		// Land the user in the new channel instead of leaving them on the dashboard.
		throw redirect(303, `/channels/${general.id}`);
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

		const [created] = await db
			.insert(channel)
			.values({
				teamId,
				name,
				createdBy: event.locals.user.id
			})
			.returning();

		throw redirect(303, `/channels/${created.id}`);
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
		try {
			for (const f of teamFiles) {
				await deleteFile(f.storagePath);
			}
		} catch (err) {
			console.error('Failed to delete team files from storage', err);
			return fail(500, { message: 'Could not delete the team files. Please try again.' });
		}

		await db.delete(team).where(eq(team.id, teamId));

		return { success: true, action: 'deleteTeam' as const };
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

		return { success: true, action: 'deleteChannel' as const };
	},
	addMember: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const teamId = formData.get('teamId')?.toString() ?? '';
		const email = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';

		if (!teamId || !email) return fail(400, { message: 'Team and email are required' });

		// Verify the current user is owner or admin of the team
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership || membership.role === 'member') {
			return fail(403, { message: 'Only team owners and admins can add members' });
		}

		// Find user by email
		const [targetUser] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, email))
			.limit(1);

		if (!targetUser) {
			return fail(404, { message: 'No user found with this email' });
		}

		// Check if already a member
		const [existing] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, targetUser.id)))
			.limit(1);

		if (existing) {
			return fail(409, { message: 'This user is already a member of the team' });
		}

		await db.insert(teamMember).values({
			teamId,
			userId: targetUser.id,
			role: 'member'
		});

		return { success: true, action: 'addMember' as const };
	}
};

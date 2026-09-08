import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { file, fileShare, teamMember } from '$lib/server/db/schema';
import { eq, desc, asc, and, inArray, ilike, count, not, or, sql } from 'drizzle-orm';
import { countActiveSharesByFile, countActiveSharesForTeams } from '$lib/server/fileShare';
import { FileError, storeUploadedFile, deleteFileWithCleanup } from '$lib/server/files';
import { TREND_DAYS, emptySeries, trendWindow } from '$lib/server/trends';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const userId = event.locals.user.id;

	// Get teams the user belongs to
	const memberships = await db
		.select({ teamId: teamMember.teamId })
		.from(teamMember)
		.where(eq(teamMember.userId, userId));

	const teamIds = memberships.map((m) => m.teamId);
	const params = event.url.searchParams;
	const q = (params.get('q') ?? '').trim().slice(0, 200);
	const selectedTeam = params.get('team') ?? '';
	const type = ['image', 'video', 'audio', 'pdf', 'other'].includes(params.get('type') ?? '')
		? params.get('type')!
		: '';
	const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
	const pageSize = 25;
	const requestedPage = Number(params.get('page') ?? '1');
	const fileType = or(
		ilike(file.mimeType, 'image/%'),
		ilike(file.mimeType, 'video/%'),
		ilike(file.mimeType, 'audio/%'),
		eq(file.mimeType, 'application/pdf')
	)!;
	const conditions = and(
		inArray(file.teamId, teamIds),
		selectedTeam ? eq(file.teamId, selectedTeam) : undefined,
		q ? ilike(file.name, `%${q.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
		type === 'pdf'
			? eq(file.mimeType, 'application/pdf')
			: type === 'other'
				? not(fileType)
				: type
					? ilike(file.mimeType, `${type}/%`)
					: undefined
	);
	const [{ total }] = await db.select({ total: count() }).from(file).where(conditions);
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(
		pageCount,
		Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1)
	);

	const files =
		teamIds.length > 0
			? await db
					.select()
					.from(file)
					.where(conditions)
					.orderBy(sort === 'oldest' ? asc(file.createdAt) : desc(file.createdAt), asc(file.id))
					.limit(pageSize)
					.offset((currentPage - 1) * pageSize)
			: [];

	const shareCounts = await countActiveSharesByFile(files.map((f) => f.id));

	/*
	 * The KPI band describes the whole library, not the filtered page: the figures stay put
	 * while a search narrows the table under them, so they can be read as a baseline.
	 */
	const owned = inArray(file.teamId, teamIds);
	const [library] = await db
		.select({
			files: sql<number>`count(*)::int`,
			bytes: sql<number>`coalesce(sum(${file.size}), 0)::float8`,
			mine: sql<number>`(count(*) filter (where ${file.userId} = ${userId}))::int`
		})
		.from(file)
		.where(owned);
	const activeShares = await countActiveSharesForTeams(teamIds);

	/*
	 * The series behind each sparkline: what was added per day over the trend window, oldest
	 * first. Share links are scoped through their file rather than joined, so the bucketing
	 * stays a single-table query like the others.
	 */
	const { countPerDay, sumPerDay } = trendWindow();
	const trends =
		teamIds.length === 0
			? { files: emptySeries(), bytes: emptySeries(), shares: emptySeries(), mine: emptySeries() }
			: await (async () => {
					const [uploads, bytes, shares, mine] = await Promise.all([
						countPerDay(file, file.createdAt, owned),
						sumPerDay(file, file.createdAt, file.size, owned),
						countPerDay(
							fileShare,
							fileShare.createdAt,
							sql`${fileShare.fileId} in (select ${file.id} from ${file} where ${owned})`
						),
						countPerDay(file, file.createdAt, and(owned, eq(file.userId, userId)))
					]);
					return { files: uploads, bytes, shares, mine };
				})();

	return {
		filters: { q, team: selectedTeam, type, sort },
		total,
		currentPage,
		pageCount,
		library: {
			files: library?.files ?? 0,
			bytes: library?.bytes ?? 0,
			shares: activeShares,
			mine: library?.mine ?? 0
		},
		trends,
		trendDays: TREND_DAYS,
		files: files.map((f) => ({
			...f,
			createdAt: f.createdAt.toISOString(),
			shareCount: shareCounts.get(f.id) ?? 0
		}))
	};
};

export const actions: Actions = {
	upload: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const teamId = formData.get('teamId')?.toString() ?? '';
		const uploadedFile = formData.get('file') as File | null;

		if (!teamId) return fail(400, { message: 'Please choose a team' });
		if (!uploadedFile || uploadedFile.size === 0) return fail(400, { message: 'No file selected' });

		// Verify membership
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership) return fail(403, { message: 'You are not a member of this team' });

		try {
			await storeUploadedFile({
				teamId,
				userId: event.locals.user.id,
				userName: event.locals.user.name,
				upload: uploadedFile
			});
		} catch (err) {
			if (err instanceof FileError) return fail(err.status, { message: err.message });
			console.error('File upload failed', err);
			return fail(500, { message: 'Upload failed. Please try again.' });
		}

		return { success: true, action: 'upload' as const, name: uploadedFile.name };
	},
	delete: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const fileId = formData.get('fileId')?.toString() ?? '';

		try {
			const result = await deleteFileWithCleanup(fileId, event.locals.user.id);
			if (!result.ok) return fail(result.status, { message: result.message });
		} catch (err) {
			console.error('File delete failed', err);
			return fail(500, { message: 'Could not delete the file. Please try again.' });
		}

		return { success: true, action: 'delete' as const };
	}
};

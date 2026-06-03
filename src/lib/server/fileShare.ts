import { db } from '$lib/server/db';
import { file, fileShare } from '$lib/server/db/schema';
import { and, eq, or, gt, isNull, inArray, sql, desc } from 'drizzle-orm';

export type ShareDuration = 'hour' | 'day' | 'week' | 'onetime';

export type ActiveShare = {
	share: typeof fileShare.$inferSelect;
	file: typeof file.$inferSelect;
};

/**
 * Compute the share parameters for a given duration.
 * Time-based durations set `expiresAt`; `onetime` leaves it null and flags `oneTime`.
 */
export function shareParams(duration: ShareDuration): { expiresAt: Date | null; oneTime: boolean } {
	const now = Date.now();
	switch (duration) {
		case 'hour':
			return { expiresAt: new Date(now + 60 * 60 * 1000), oneTime: false };
		case 'day':
			return { expiresAt: new Date(now + 24 * 60 * 60 * 1000), oneTime: false };
		case 'week':
			return { expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000), oneTime: false };
		case 'onetime':
			return { expiresAt: null, oneTime: true };
	}
}

/**
 * SQL predicate matching shares that are still usable: not past their expiry
 * (time-based) and not already consumed (one-time). Mirrors the runtime checks
 * in {@link resolveActiveShare}.
 */
function activeShareCondition() {
	return and(
		or(isNull(fileShare.expiresAt), gt(fileShare.expiresAt, new Date())),
		or(eq(fileShare.oneTime, false), eq(fileShare.downloadCount, 0))
	);
}

/**
 * Count active shares for each given file id. Returns a map keyed by file id;
 * files with no active share are absent from the map.
 */
export async function countActiveSharesByFile(fileIds: string[]): Promise<Map<string, number>> {
	if (fileIds.length === 0) return new Map();

	const rows = await db
		.select({ fileId: fileShare.fileId, count: sql<number>`count(*)::int` })
		.from(fileShare)
		.where(and(inArray(fileShare.fileId, fileIds), activeShareCondition()))
		.groupBy(fileShare.fileId);

	return new Map(rows.map((r) => [r.fileId, r.count]));
}

/**
 * List the active shares for a single file, newest first.
 */
export async function listActiveShares(fileId: string): Promise<(typeof fileShare.$inferSelect)[]> {
	return db
		.select()
		.from(fileShare)
		.where(and(eq(fileShare.fileId, fileId), activeShareCondition()))
		.orderBy(desc(fileShare.createdAt));
}

/**
 * Look up a share by token and return it with its file, or null if the share
 * does not exist, has expired (time-based), or has already been consumed (one-time).
 */
export async function resolveActiveShare(token: string): Promise<ActiveShare | null> {
	const [row] = await db
		.select({ share: fileShare, file })
		.from(fileShare)
		.innerJoin(file, eq(fileShare.fileId, file.id))
		.where(eq(fileShare.token, token))
		.limit(1);

	if (!row) return null;

	const { share } = row;
	if (share.expiresAt && share.expiresAt.getTime() < Date.now()) return null;
	if (share.oneTime && share.downloadCount > 0) return null;

	return row;
}

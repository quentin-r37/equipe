import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { file, fileShare, teamMember } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { shareParams, listActiveShares, type ShareDuration } from '$lib/server/fileShare';

const DURATIONS: ShareDuration[] = ['hour', 'day', 'week', 'onetime'];

type ShareDTO = {
	id: string;
	token: string;
	url: string;
	expiresAt: string | null;
	oneTime: boolean;
	downloadCount: number;
};

function toDTO(origin: string, share: typeof fileShare.$inferSelect): ShareDTO {
	return {
		id: share.id,
		token: share.token,
		url: `${origin}/share/${share.token}`,
		expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
		oneTime: share.oneTime,
		downloadCount: share.downloadCount
	};
}

/** Load the file and ensure the current user is a member of its team. */
async function fileForMember(fileId: string, userId: string) {
	const [fileRecord] = await db.select().from(file).where(eq(file.id, fileId)).limit(1);
	if (!fileRecord) throw error(404, 'File not found');

	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, fileRecord.teamId), eq(teamMember.userId, userId)))
		.limit(1);
	if (!membership) throw error(403, 'Not a member of this team');

	return fileRecord;
}

// List the active share links for a file.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const fileId = url.searchParams.get('fileId');
	if (!fileId) throw error(400, 'fileId is required');

	await fileForMember(fileId, locals.user.id);

	const origin = env.ORIGIN ?? url.origin;
	const shares = await listActiveShares(fileId);

	return json(shares.map((s) => toDTO(origin, s)));
};

// Create a new anonymous share link for a file.
export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const body = await request.json().catch(() => null);
	const fileId = body?.fileId as string | undefined;
	const duration = body?.duration as ShareDuration | undefined;

	if (!fileId) throw error(400, 'fileId is required');
	if (!duration || !DURATIONS.includes(duration)) throw error(400, 'Invalid duration');

	await fileForMember(fileId, locals.user.id);

	const { expiresAt, oneTime } = shareParams(duration);

	const [share] = await db
		.insert(fileShare)
		.values({
			fileId,
			expiresAt,
			oneTime,
			createdBy: locals.user.id
		})
		.returning();

	const origin = env.ORIGIN ?? url.origin;

	return json(toDTO(origin, share), { status: 201 });
};

// Revoke (delete) a share link.
export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const shareId = url.searchParams.get('id');
	if (!shareId) throw error(400, 'Share id is required');

	const [share] = await db.select().from(fileShare).where(eq(fileShare.id, shareId)).limit(1);
	if (!share) throw error(404, 'Share not found');

	// Any member of the file's team may revoke a link (same scope as creating one).
	await fileForMember(share.fileId, locals.user.id);

	await db.delete(fileShare).where(eq(fileShare.id, shareId));

	return json({ ok: true });
};

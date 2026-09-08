import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadFile } from '$lib/server/seaweedfs';
import { db } from '$lib/server/db';
import { file, teamMember } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { contentDisposition } from '$lib/server/http';
import { deleteFileWithCleanup } from '$lib/server/files';

/**
 * Only these types may be rendered inline by the browser. Anything else (HTML, SVG, scripts…)
 * is forced to download so a user-supplied Content-Type can never execute on our origin.
 */
const INLINE_SAFE = /^(image\/(?!svg)|video\/|audio\/|application\/pdf$)/;

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const fileId = url.searchParams.get('id');
	if (!fileId) throw error(400, 'File id is required');

	const [fileRecord] = await db.select().from(file).where(eq(file.id, fileId)).limit(1);
	if (!fileRecord) throw error(404, 'File not found');

	// Verify user is a member of the file's team
	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, fileRecord.teamId), eq(teamMember.userId, locals.user.id)))
		.limit(1);
	if (!membership) throw error(403, 'Not a member of this team');

	const upstream = await downloadFile(fileRecord.storagePath);

	const inline = url.searchParams.get('inline') === '1' && INLINE_SAFE.test(fileRecord.mimeType);
	const headers: Record<string, string> = {
		'Content-Type': inline ? fileRecord.mimeType : 'application/octet-stream',
		'Content-Disposition': contentDisposition(inline ? 'inline' : 'attachment', fileRecord.name),
		'X-Content-Type-Options': 'nosniff',
		'Cache-Control': 'private, max-age=0'
	};
	const length = upstream.headers.get('content-length');
	if (length) headers['Content-Length'] = length;

	// Stream the body through instead of buffering the whole file in memory.
	return new Response(upstream.body, { headers });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const fileId = url.searchParams.get('id') ?? '';
	const result = await deleteFileWithCleanup(fileId, locals.user.id);
	if (!result.ok) throw error(result.status, result.message);

	return json({ ok: true });
};

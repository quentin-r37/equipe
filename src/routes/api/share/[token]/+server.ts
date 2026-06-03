import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { fileShare } from '$lib/server/db/schema';
import { downloadFile } from '$lib/server/seaweedfs';
import { resolveActiveShare } from '$lib/server/fileShare';
import { eq, sql } from 'drizzle-orm';

// Public, unauthenticated download endpoint for an anonymous share link.
export const GET: RequestHandler = async ({ params }) => {
	const active = await resolveActiveShare(params.token);
	if (!active) throw error(404, 'Share link expired or not found');

	const { share, file: fileRecord } = active;

	const response = await downloadFile(fileRecord.storagePath);
	const blob = await response.blob();

	// Effective download consumes a one-time link (and counts towards stats).
	await db
		.update(fileShare)
		.set({ downloadCount: sql`${fileShare.downloadCount} + 1` })
		.where(eq(fileShare.id, share.id));

	return new Response(blob, {
		headers: {
			'Content-Type': fileRecord.mimeType,
			'Content-Disposition': `attachment; filename="${fileRecord.name}"`,
			'Content-Length': String(fileRecord.size)
		}
	});
};

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { downloadFile } from '$lib/server/seaweedfs';
import { db } from '$lib/server/db';
import { file } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const fileId = url.searchParams.get('id');
	if (!fileId) throw error(400, 'File id is required');

	const [fileRecord] = await db.select().from(file).where(eq(file.id, fileId)).limit(1);
	if (!fileRecord) throw error(404, 'File not found');

	const response = await downloadFile(fileRecord.storagePath);
	const blob = await response.blob();

	return new Response(blob, {
		headers: {
			'Content-Type': fileRecord.mimeType,
			'Content-Disposition': `attachment; filename="${fileRecord.name}"`,
			'Content-Length': String(fileRecord.size)
		}
	});
};

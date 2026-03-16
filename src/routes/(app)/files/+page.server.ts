import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { file, teamMember } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { uploadFile, deleteFile } from '$lib/server/seaweedfs';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const userId = event.locals.user.id;

	// Get teams the user belongs to
	const memberships = await db
		.select({ teamId: teamMember.teamId })
		.from(teamMember)
		.where(eq(teamMember.userId, userId));

	const teamIds = memberships.map((m) => m.teamId);

	let files: typeof allFiles = [];
	const allFiles = await db.select().from(file).orderBy(desc(file.createdAt)).limit(100);
	files = allFiles.filter((f) => teamIds.includes(f.teamId));

	return {
		files: files.map((f) => ({
			...f,
			createdAt: f.createdAt.toISOString()
		}))
	};
};

export const actions: Actions = {
	upload: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const teamId = formData.get('teamId')?.toString() ?? '';
		const uploadedFile = formData.get('file') as File | null;

		if (!teamId) return fail(400, { message: 'Team is required' });
		if (!uploadedFile || uploadedFile.size === 0) return fail(400, { message: 'No file selected' });

		// Verify membership
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);

		if (!membership) return fail(403, { message: 'Not a team member' });

		const fileId = crypto.randomUUID();
		const storagePath = `equipe/${teamId}/${fileId}/${uploadedFile.name}`;

		// Upload to SeaweedFS
		await uploadFile(storagePath, uploadedFile, uploadedFile.name);

		// Store metadata in DB
		await db.insert(file).values({
			id: fileId,
			teamId,
			userId: event.locals.user.id,
			userName: event.locals.user.name,
			name: uploadedFile.name,
			size: uploadedFile.size,
			mimeType: uploadedFile.type || 'application/octet-stream',
			storagePath
		});

		return { success: true };
	},
	delete: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const fileId = formData.get('fileId')?.toString() ?? '';

		const [fileRecord] = await db.select().from(file).where(eq(file.id, fileId)).limit(1);
		if (!fileRecord) return fail(404, { message: 'File not found' });

		// Only file owner can delete
		if (fileRecord.userId !== event.locals.user.id) {
			return fail(403, { message: 'Only the file owner can delete' });
		}

		await deleteFile(fileRecord.storagePath);
		await db.delete(file).where(eq(file.id, fileId));

		return { success: true };
	}
};

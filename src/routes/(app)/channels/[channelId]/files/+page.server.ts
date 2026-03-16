import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { channel, file } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { uploadFile, deleteFile } from '$lib/server/seaweedfs';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const channelId = event.params.channelId;

	const [ch] = await db
		.select({ teamId: channel.teamId })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	const files = await db
		.select()
		.from(file)
		.where(eq(file.teamId, ch.teamId))
		.orderBy(desc(file.createdAt))
		.limit(100);

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

		const channelId = event.params.channelId;

		const [ch] = await db
			.select({ teamId: channel.teamId })
			.from(channel)
			.where(eq(channel.id, channelId))
			.limit(1);
		if (!ch) throw error(404, 'Channel not found');

		const formData = await event.request.formData();
		const uploadedFile = formData.get('file') as File | null;

		if (!uploadedFile || uploadedFile.size === 0) return fail(400, { message: 'No file selected' });

		const fileId = crypto.randomUUID();
		const storagePath = `equipe/${ch.teamId}/${fileId}/${uploadedFile.name}`;

		await uploadFile(storagePath, uploadedFile, uploadedFile.name);

		await db.insert(file).values({
			id: fileId,
			teamId: ch.teamId,
			channelId,
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

		if (fileRecord.userId !== event.locals.user.id) {
			return fail(403, { message: 'Only the file owner can delete' });
		}

		await deleteFile(fileRecord.storagePath);
		await db.delete(file).where(eq(file.id, fileId));

		return { success: true };
	}
};

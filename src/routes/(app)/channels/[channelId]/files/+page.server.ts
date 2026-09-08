import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { channel, file, teamMember } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { countActiveSharesByFile } from '$lib/server/fileShare';
import { FileError, storeUploadedFile, deleteFileWithCleanup } from '$lib/server/files';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const channelId = event.params.channelId;

	const [ch] = await db
		.select({ teamId: channel.teamId })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	// Verify user is a member of the channel's team
	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, event.locals.user.id)))
		.limit(1);
	if (!membership) throw error(403, 'Not a member of this team');

	// Only files that belong to this channel (uploaded here or attached to one of its messages).
	const files = await db
		.select()
		.from(file)
		.where(and(eq(file.teamId, ch.teamId), eq(file.channelId, channelId)))
		.orderBy(desc(file.createdAt))
		.limit(100);

	const shareCounts = await countActiveSharesByFile(files.map((f) => f.id));

	return {
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

		const channelId = event.params.channelId;

		const [ch] = await db
			.select({ teamId: channel.teamId })
			.from(channel)
			.where(eq(channel.id, channelId))
			.limit(1);
		if (!ch) return fail(404, { message: 'Channel not found' });

		// Verify user is a member of the channel's team
		const [membership] = await db
			.select()
			.from(teamMember)
			.where(and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, event.locals.user.id)))
			.limit(1);
		if (!membership) return fail(403, { message: 'You are not a member of this team' });

		const formData = await event.request.formData();
		const uploadedFile = formData.get('file') as File | null;

		if (!uploadedFile || uploadedFile.size === 0) return fail(400, { message: 'No file selected' });

		try {
			await storeUploadedFile({
				teamId: ch.teamId,
				channelId,
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

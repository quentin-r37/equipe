import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, session, account } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { isAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');
	if (!isAdmin(event.locals.user.email)) throw error(403, 'Admin access required');

	const users = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt
		})
		.from(user);

	return {
		users: users.map((u) => ({
			...u,
			createdAt: u.createdAt.toISOString()
		}))
	};
};

export const actions: Actions = {
	delete: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');
		if (!isAdmin(event.locals.user.email)) throw error(403, 'Admin access required');

		const formData = await event.request.formData();
		const userId = formData.get('userId')?.toString() ?? '';

		if (!userId) return fail(400, { message: 'User ID is required' });

		// Prevent self-deletion
		if (userId === event.locals.user.id) {
			return fail(400, { message: 'You cannot delete your own account' });
		}

		const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
		if (!target) return fail(404, { message: 'User not found' });

		// Cascade: sessions and accounts are FK cascade, so just delete user
		await db.delete(user).where(eq(user.id, userId));

		return { success: true };
	}
};

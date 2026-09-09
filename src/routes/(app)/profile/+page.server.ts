import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, account } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const [profile] = await db
		.select({
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt
		})
		.from(user)
		.where(eq(user.id, event.locals.user.id))
		.limit(1);

	if (!profile) throw redirect(302, '/login');

	const providers = await db
		.select({ providerId: account.providerId })
		.from(account)
		.where(eq(account.userId, event.locals.user.id));

	return {
		profile: {
			...profile,
			createdAt: profile.createdAt.toISOString()
		},
		// Microsoft-only accounts have no password to change.
		hasPassword: providers.some((p) => p.providerId === 'credential'),
		// A user can hold several rows for the same provider, so dedupe: one tag per provider.
		providers: [...new Set(providers.map((p) => p.providerId))].filter((p) => p !== 'credential')
	};
};

export const actions: Actions = {
	updateProfile: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString()?.trim() ?? '';

		if (!name) return fail(400, { message: 'Name is required' });
		if (name.length > 100) return fail(400, { message: 'Name must be 100 characters or fewer' });

		await db
			.update(user)
			.set({ name, updatedAt: new Date() })
			.where(eq(user.id, event.locals.user.id));

		return { success: true, action: 'updateProfile' as const };
	},
	changePassword: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const currentPassword = formData.get('currentPassword')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		if (!currentPassword) return fail(400, { message: 'Current password is required' });
		if (newPassword.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match' });
		}
		if (newPassword === currentPassword) {
			return fail(400, { message: 'The new password must be different from the current one' });
		}

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Password change failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		return { success: true, action: 'changePassword' as const };
	}
};

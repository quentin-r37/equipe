import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) throw redirect(302, '/');

	const token = event.url.searchParams.get('token');
	const error = event.url.searchParams.get('error');

	if (error) {
		return { error: 'Ce lien de réinitialisation est invalide ou a expiré.' };
	}

	if (!token) {
		throw redirect(302, '/forgot-password');
	}

	return { token };
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const token = formData.get('token')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		if (!token) return fail(400, { message: 'Token is missing' });
		if (newPassword.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match' });
		}

		try {
			await auth.api.resetPassword({ body: { token, newPassword } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Password reset failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		return {
			success: true,
			message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.'
		};
	}
};

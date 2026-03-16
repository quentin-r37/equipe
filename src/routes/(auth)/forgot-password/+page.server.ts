import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) throw redirect(302, '/');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';

		if (!email.trim()) return fail(400, { message: 'Email is required' });

		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: '/reset-password' }
			});
		} catch {
			// Don't reveal whether the email exists
		}

		return {
			success: true,
			message: 'Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.'
		};
	}
};

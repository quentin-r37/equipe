import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) throw redirect(302, '/');
	return {
		microsoftEnabled: !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET)
	};
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch (error) {
			if (error instanceof APIError) {
				if (error.body?.code === 'EMAIL_NOT_VERIFIED') {
					return fail(400, {
						message:
							'Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte de réception.'
					});
				}
				return fail(400, { message: error.message || 'Sign in failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		throw redirect(302, '/');
	},
	signInMicrosoft: async () => {
		let url: string | undefined;
		try {
			const result = await auth.api.signInSocial({
				body: { provider: 'microsoft', callbackURL: '/' }
			});
			url = result.url;
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Microsoft sign-in failed' });
			}
			return fail(500, { message: 'Microsoft sign-in failed' });
		}
		if (!url) return fail(500, { message: 'Microsoft sign-in failed' });
		throw redirect(302, url);
	},
	signUp: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		if (!name.trim()) return fail(400, { message: 'Name is required' });

		try {
			await auth.api.signUpEmail({ body: { email, password, name } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Registration failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		return {
			success: true,
			message: 'Un email de vérification a été envoyé. Consultez votre boîte de réception.'
		};
	}
};

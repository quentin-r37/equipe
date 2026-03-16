import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail, verificationEmailHtml, resetPasswordEmailHtml } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	socialProviders: {
		microsoft: {
			clientId: env.MICROSOFT_CLIENT_ID!,
			clientSecret: env.MICROSOFT_CLIENT_SECRET!,
			tenantId: env.MICROSOFT_TENANT_ID || 'common',
			mapProfileToUser: () => ({
				emailVerified: true
			})
		}
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		autoSignIn: false,
		sendResetPassword: async ({ user, url }) => {
			void sendEmail({
				to: user.email,
				toName: user.name,
				subject: 'Réinitialiser votre mot de passe - Equipe',
				htmlContent: resetPasswordEmailHtml(url, user.name)
			});
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			void sendEmail({
				to: user.email,
				toName: user.name,
				subject: 'Vérifiez votre adresse email - Equipe',
				htmlContent: verificationEmailHtml(url, user.name)
			});
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)] // make sure this is the last plugin in the array
});

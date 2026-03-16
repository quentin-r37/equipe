import { env } from '$env/dynamic/private';

export function isAdmin(email: string): boolean {
	const raw = env.ADMIN_EMAILS ?? '';
	if (!raw) return false;
	const adminEmails = raw.split(',').map((e) => e.trim().toLowerCase());
	return adminEmails.includes(email.toLowerCase());
}

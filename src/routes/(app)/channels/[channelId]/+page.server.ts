import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { message } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) throw redirect(302, '/login');

	const channelId = event.params.channelId;

	const messages = await db
		.select()
		.from(message)
		.where(eq(message.channelId, channelId))
		.orderBy(desc(message.createdAt))
		.limit(50);

	return {
		messages: messages.reverse().map((m) => ({
			...m,
			createdAt: m.createdAt.toISOString()
		}))
	};
};

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notificationBus } from '$lib/server/notifications';
import { db } from '$lib/server/db';
import { teamMember } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const userId = locals.user.id;

	const memberships = await db
		.select({ teamId: teamMember.teamId })
		.from(teamMember)
		.where(eq(teamMember.userId, userId));

	const teamIds = memberships.map((m) => m.teamId);

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(': connected\n\n'));

			const unsubscribes: (() => void)[] = [];

			for (const teamId of teamIds) {
				const unsub = notificationBus.subscribe(teamId, (event) => {
					if (event.userId === userId) return;

					try {
						const payload = `event: notification\ndata: ${JSON.stringify(event)}\n\n`;
						controller.enqueue(encoder.encode(payload));
					} catch {
						cleanup();
					}
				});
				unsubscribes.push(unsub);
			}

			const interval = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': ping\n\n'));
				} catch {
					cleanup();
				}
			}, 30000);

			function cleanup() {
				clearInterval(interval);
				for (const unsub of unsubscribes) unsub();
			}

			(controller as unknown as { _cleanup: () => void })._cleanup = cleanup;
		},
		cancel(controller) {
			const ctrl = controller as unknown as { _cleanup?: () => void };
			ctrl._cleanup?.();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};

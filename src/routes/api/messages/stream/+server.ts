import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { messageBus } from '$lib/server/messages';
import { db } from '$lib/server/db';
import { channel, teamMember } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const channelId = url.searchParams.get('channelId');
	if (!channelId) throw error(400, 'channelId is required');

	// Verify user is a member of the channel's team
	const [ch] = await db
		.select({ teamId: channel.teamId })
		.from(channel)
		.where(eq(channel.id, channelId))
		.limit(1);
	if (!ch) throw error(404, 'Channel not found');

	const [membership] = await db
		.select()
		.from(teamMember)
		.where(and(eq(teamMember.teamId, ch.teamId), eq(teamMember.userId, locals.user.id)))
		.limit(1);
	if (!membership) throw error(403, 'Not a member of this team');

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(': connected\n\n'));

			const unsubscribe = messageBus.subscribe(channelId, (event) => {
				try {
					const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
					controller.enqueue(encoder.encode(payload));
				} catch {
					unsubscribe();
				}
			});

			// Keep-alive ping every 30s
			const interval = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': ping\n\n'));
				} catch {
					clearInterval(interval);
					unsubscribe();
				}
			}, 30000);

			// Cleanup when client disconnects
			const cleanup = () => {
				clearInterval(interval);
				unsubscribe();
			};

			// Store cleanup for cancel
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

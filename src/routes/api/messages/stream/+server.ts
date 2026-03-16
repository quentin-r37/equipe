import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { messageBus } from '$lib/server/messages';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Not authenticated');

	const channelId = url.searchParams.get('channelId');
	if (!channelId) throw error(400, 'channelId is required');

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(': connected\n\n'));

			const unsubscribe = messageBus.subscribe(channelId, (msg) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
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

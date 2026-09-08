import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	selectResults: [] as unknown[][],
	insertResults: [] as unknown[][],
	values: vi.fn(),
	publish: vi.fn(),
	notify: vi.fn(),
	storeFile: vi.fn()
}));

vi.mock('$lib/server/db', () => {
	function query(result: unknown[]) {
		const chain = {
			from: () => chain,
			where: () => chain,
			limit: () => chain,
			values: (value: unknown) => {
				mocks.values(value);
				return chain;
			},
			onConflictDoNothing: () => chain,
			returning: () => Promise.resolve(result),
			then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve)
		};
		return chain;
	}
	return {
		db: {
			select: () => query(mocks.selectResults.shift() ?? []),
			insert: () => query(mocks.insertResults.shift() ?? [])
		}
	};
});
vi.mock('$lib/server/messages', () => ({ messageBus: { publish: mocks.publish } }));
vi.mock('$lib/server/notifications', () => ({ notificationBus: { publish: mocks.notify } }));
vi.mock('$lib/server/seaweedfs', () => ({ deleteFile: vi.fn() }));
vi.mock('$lib/server/files', () => ({
	FileError: class extends Error {},
	assertUploadAllowed: vi.fn(),
	storeUploadedFile: mocks.storeFile
}));

import { POST } from './+server';

const id = 'b71cc843-4b0d-41dc-bb0d-55c854f128ee';
const saved = {
	id,
	channelId: 'channel',
	userId: 'user',
	userName: 'Ada',
	content: 'Hello',
	createdAt: new Date('2026-09-08T10:00:00Z')
};

function access() {
	mocks.selectResults.push(
		[{ teamId: 'team', channelName: 'General' }],
		[{ userId: 'user' }],
		[{ name: 'Team' }]
	);
}

function event(body?: FormData, requestId = id) {
	return {
		request: new Request('http://localhost/api/messages', {
			method: 'POST',
			headers: body
				? { 'X-Message-Id': requestId }
				: { 'Content-Type': 'application/json', 'X-Message-Id': requestId },
			body: body ?? JSON.stringify({ channelId: 'channel', content: 'Hello' })
		}),
		locals: { user: { id: 'user', name: 'Ada' } }
	} as Parameters<typeof POST>[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.selectResults.length = 0;
	mocks.insertResults.length = 0;
});

describe('safe message retries', () => {
	it('returns the saved message after a lost acknowledgement without publishing twice', async () => {
		access();
		mocks.insertResults.push([saved]);
		const first = await POST(event());
		access();
		mocks.insertResults.push([]);
		mocks.selectResults.push([saved], []);
		const retry = await POST(event());
		expect(first.status).toBe(201);
		expect(retry.status).toBe(200);
		expect((await retry.json()).id).toBe(id);
		expect(mocks.publish).toHaveBeenCalledTimes(1);
		expect(mocks.notify).toHaveBeenCalledTimes(1);
	});

	it('does not expose another user’s message when a request ID collides', async () => {
		access();
		mocks.insertResults.push([]);
		mocks.selectResults.push([{ ...saved, userId: 'someone-else' }]);
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(mocks.publish).not.toHaveBeenCalled();
	});

	it('does not upload attachments twice while the first request is still processing', async () => {
		access();
		mocks.insertResults.push([]);
		mocks.selectResults.push([saved], []);
		const body = new FormData();
		body.append('channelId', 'channel');
		body.append('content', 'Hello');
		body.append('files', new File(['hello'], 'notes.txt', { type: 'text/plain' }));
		await expect(POST(event(body))).rejects.toMatchObject({ status: 409 });
		expect(mocks.storeFile).not.toHaveBeenCalled();
	});

	it('rejects malformed request IDs before writing', async () => {
		await expect(POST(event(undefined, 'invalid'))).rejects.toMatchObject({ status: 400 });
		expect(mocks.values).not.toHaveBeenCalled();
	});
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { notificationState, type AppNotification } from './notifications.svelte';

const notification: AppNotification = {
	id: 'notice',
	type: 'new_message',
	teamName: 'Team',
	channelName: 'General',
	userName: 'Ada',
	preview: 'Hello',
	href: '/channels/general',
	createdAt: '2026-09-08T10:00:00Z'
};

beforeEach(() => {
	vi.useFakeTimers();
	notificationState.clearAll();
	notificationState.history = [];
});
afterEach(() => {
	notificationState.clearAll();
	vi.useRealTimers();
});

it('keeps an unread history entry after the toast times out', () => {
	notificationState.add(notification);
	vi.advanceTimersByTime(8000);
	expect(notificationState.notifications).toHaveLength(0);
	expect(notificationState.history).toMatchObject([{ id: 'notice', read: false }]);
});

it('marks notifications as read without erasing their destinations or duplicating replays', () => {
	notificationState.add(notification);
	notificationState.add(notification);
	notificationState.clearAll();
	expect(notificationState.history).toHaveLength(1);
	expect(notificationState.history[0]).toMatchObject({ read: true, href: '/channels/general' });
	expect(notificationState.notifications).toHaveLength(0);
});

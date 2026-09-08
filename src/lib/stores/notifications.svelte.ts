import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { Pathname } from '$app/types';
import type { NotificationType } from '$lib/server/notifications';
import * as m from '$lib/paraglide/messages';

export interface AppNotification {
	id: string;
	type: NotificationType;
	teamName: string;
	channelName?: string;
	channelId?: string;
	meetingId?: string;
	meetingTitle?: string;
	userName: string;
	preview: string;
	href: string;
	createdAt: string;
}

const DISMISS_TIMEOUT = 8000;
const TOAST_TIMEOUT: Record<ToastKind, number> = {
	success: 5000,
	info: 6000,
	warning: 8000,
	error: 10000
};

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

/** A local feedback toast (result of a user action), as opposed to a real-time notification. */
export interface LocalToast {
	id: string;
	kind: ToastKind;
	title: string;
	subtitle?: string;
}

class NotificationState {
	notifications: AppNotification[] = $state([]);
	history: (AppNotification & { read: boolean })[] = $state([]);
	unreadCount = $derived(this.history.filter((n) => !n.read).length);
	toasts: LocalToast[] = $state([]);
	permissionState: NotificationPermission = $state(
		browser && 'Notification' in window ? Notification.permission : 'default'
	);
	private eventSource: EventSource | null = null;
	private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

	add(notification: AppNotification) {
		if (this.history.some((n) => n.id === notification.id)) return;
		if (browser && window.location.pathname === notification.href) return;

		this.history = [{ ...notification, read: false }, ...this.history].slice(0, 100);
		this.notifications = [...this.notifications, notification];

		const timer = setTimeout(() => {
			this.dismiss(notification.id);
		}, DISMISS_TIMEOUT);
		this.timers.set(notification.id, timer);

		if (browser && document.hidden && this.permissionState === 'granted') {
			this.showBrowserNotification(notification);
		}
	}

	dismiss(id: string) {
		this.notifications = this.notifications.filter((n) => n.id !== id);
		const timer = this.timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
	}

	/** Show a transient feedback toast for a local action (success, error…). */
	toast(kind: ToastKind, title: string, subtitle?: string) {
		const id = crypto.randomUUID();
		this.toasts = [...this.toasts, { id, kind, title, subtitle }];
		const timer = setTimeout(() => this.dismissToast(id), TOAST_TIMEOUT[kind]);
		this.timers.set(id, timer);
	}

	dismissToast(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
		const timer = this.timers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
	}

	markRead(id: string) {
		this.history = this.history.map((n) => (n.id === id ? { ...n, read: true } : n));
		this.dismiss(id);
	}

	clearAll() {
		this.history = this.history.map((n) => ({ ...n, read: true }));
		for (const n of this.notifications) {
			const timer = this.timers.get(n.id);
			if (timer) {
				clearTimeout(timer);
				this.timers.delete(n.id);
			}
		}
		this.notifications = [];
	}

	async requestPermission() {
		if (!browser || !('Notification' in window)) return;
		const result = await Notification.requestPermission();
		this.permissionState = result;
	}

	connect() {
		if (!browser) return;
		this.disconnect();

		this.eventSource = new EventSource('/api/notifications/stream');

		this.eventSource.addEventListener('notification', (event: MessageEvent) => {
			const data = JSON.parse(event.data);
			const notification: AppNotification = {
				id: data.id,
				type: data.type,
				teamName: data.teamName,
				channelName: data.channelName,
				channelId: data.channelId,
				meetingId: data.meetingId,
				meetingTitle: data.meetingTitle,
				userName: data.userName,
				preview: data.preview,
				href: this.buildHref(data),
				createdAt: data.createdAt
			};
			this.add(notification);
		});

		// EventSource reconnects automatically; closing it here would lose that behavior.
	}

	disconnect() {
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
	}

	private buildHref(data: {
		type: NotificationType;
		channelId?: string;
		meetingId?: string;
	}): string {
		if (data.type === 'new_message' || data.type === 'new_file') {
			return `/channels/${data.channelId}`;
		}
		if (data.type === 'new_meeting' && data.meetingId) {
			return `/meetings/${data.meetingId}`;
		}
		return '/';
	}

	private showBrowserNotification(notification: AppNotification) {
		const title = this.buildBrowserTitle(notification);

		const n = new Notification(title, {
			body: notification.preview,
			icon: '/icons/icon-192x192.png',
			tag: notification.id
		});

		n.onclick = () => {
			window.focus();
			this.markRead(notification.id);
			goto(resolve(notification.href as Pathname));
			n.close();
		};

		setTimeout(() => n.close(), DISMISS_TIMEOUT);
	}

	private buildBrowserTitle(notification: AppNotification): string {
		switch (notification.type) {
			case 'new_message':
				return m.notification_new_message({
					userName: notification.userName,
					channelName: notification.channelName ?? ''
				});
			case 'new_file':
				return m.notification_new_file({
					userName: notification.userName,
					channelName: notification.channelName ?? ''
				});
			case 'new_meeting':
				return m.notification_new_meeting({
					userName: notification.userName,
					meetingTitle: notification.meetingTitle ?? ''
				});
		}
	}
}

export const notificationState = new NotificationState();

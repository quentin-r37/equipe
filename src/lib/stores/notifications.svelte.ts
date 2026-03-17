import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { NotificationType } from '$lib/server/notifications';

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

class NotificationState {
	notifications: AppNotification[] = $state([]);
	permissionState: NotificationPermission = $state(
		browser && 'Notification' in window ? Notification.permission : 'default'
	);
	private eventSource: EventSource | null = null;
	private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

	add(notification: AppNotification) {
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

	clearAll() {
		for (const timer of this.timers.values()) clearTimeout(timer);
		this.timers.clear();
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

		this.eventSource.onerror = () => {
			this.disconnect();
			setTimeout(() => this.connect(), 5000);
		};
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
			goto(notification.href);
			n.close();
		};

		setTimeout(() => n.close(), DISMISS_TIMEOUT);
	}

	private buildBrowserTitle(notification: AppNotification): string {
		switch (notification.type) {
			case 'new_message':
				return `${notification.userName} dans #${notification.channelName}`;
			case 'new_file':
				return `${notification.userName} a partagé un fichier dans #${notification.channelName}`;
			case 'new_meeting':
				return `${notification.userName} a démarré une réunion`;
		}
	}
}

export const notificationState = new NotificationState();

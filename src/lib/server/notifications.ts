import { EventEmitter } from 'events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export type NotificationType = 'new_message' | 'new_file' | 'new_meeting';

export interface NotificationEvent {
	id: string;
	type: NotificationType;
	teamId: string;
	teamName: string;
	channelId?: string;
	channelName?: string;
	meetingId?: string;
	meetingTitle?: string;
	userId: string;
	userName: string;
	preview: string;
	createdAt: string;
}

export const notificationBus = {
	publish(teamId: string, event: NotificationEvent) {
		emitter.emit(`team:${teamId}`, event);
	},
	subscribe(teamId: string, callback: (event: NotificationEvent) => void): () => void {
		emitter.on(`team:${teamId}`, callback);
		return () => {
			emitter.off(`team:${teamId}`, callback);
		};
	}
};

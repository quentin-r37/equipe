import { EventEmitter } from 'events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export interface ChatFile {
	id: string;
	name: string;
	size: number;
	mimeType: string;
}

export interface ChatMessage {
	id: string;
	channelId: string;
	userId: string;
	userName: string;
	content: string;
	createdAt: string;
	files?: ChatFile[];
}

export type ChatEvent =
	| { type: 'message'; data: ChatMessage }
	| { type: 'update'; data: ChatMessage }
	| { type: 'delete'; data: { id: string } }
	| { type: 'file_delete'; data: { id: string; messageId: string } };

export const messageBus = {
	publish(channelId: string, msg: ChatMessage) {
		emitter.emit(`channel:${channelId}`, { type: 'message', data: msg } satisfies ChatEvent);
	},
	publishEvent(channelId: string, event: ChatEvent) {
		emitter.emit(`channel:${channelId}`, event);
	},
	subscribe(channelId: string, callback: (event: ChatEvent) => void): () => void {
		emitter.on(`channel:${channelId}`, callback);
		return () => {
			emitter.off(`channel:${channelId}`, callback);
		};
	}
};

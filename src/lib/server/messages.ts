import { EventEmitter } from 'events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export interface ChatMessage {
	id: string;
	channelId: string;
	userId: string;
	userName: string;
	content: string;
	createdAt: string;
}

export const messageBus = {
	publish(channelId: string, msg: ChatMessage) {
		emitter.emit(`channel:${channelId}`, msg);
	},
	subscribe(channelId: string, callback: (msg: ChatMessage) => void): () => void {
		emitter.on(`channel:${channelId}`, callback);
		return () => {
			emitter.off(`channel:${channelId}`, callback);
		};
	}
};

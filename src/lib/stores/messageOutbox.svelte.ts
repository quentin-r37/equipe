export interface OutgoingMessage {
	id: string;
	channelId: string;
	content: string;
	files: File[];
	status: 'sending' | 'failed';
	error: string;
	/*
	 * Whether the entry is drawn in the thread. A send that resolves in a few dozen
	 * milliseconds never gets there: the card would flash in and back out under the
	 * confirmed message, which reads as a glitch rather than as feedback.
	 */
	visible: boolean;
}

// Keep pending sends across channel navigation, without persisting message text
// or attachments to disk. Cleared when the authenticated app is left.
export const messageOutbox = $state<{ items: OutgoingMessage[] }>({ items: [] });

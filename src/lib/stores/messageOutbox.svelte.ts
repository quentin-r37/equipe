export interface OutgoingMessage {
	id: string;
	channelId: string;
	content: string;
	files: File[];
	status: 'sending' | 'failed';
	error: string;
}

// Keep pending sends across channel navigation, without persisting message text
// or attachments to disk. Cleared when the authenticated app is left.
export const messageOutbox = $state<{ items: OutgoingMessage[] }>({ items: [] });

<script lang="ts">
	import { Button, TextInput } from 'carbon-components-svelte';
	import SendAlt from 'carbon-icons-svelte/lib/SendAlt.svelte';
	import type { PageServerData } from './$types';

	interface ChatMessage {
		id: string;
		channelId: string;
		userId: string;
		userName: string;
		content: string;
		createdAt: string;
	}

	let { data }: { data: PageServerData } = $props();

	let sseMessages = $state<ChatMessage[]>([]);
	const messages = $derived([...data.messages, ...sseMessages]);
	let newMessage = $state('');
	let messagesContainer: HTMLDivElement | undefined = $state();

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	$effect(() => {
		const channelId = data.channel.id;
		sseMessages = [];

		const es = new EventSource(`/api/messages/stream?channelId=${channelId}`);
		es.onmessage = (event) => {
			const msg: ChatMessage = JSON.parse(event.data);
			const isDuplicate =
				sseMessages.some((m) => m.id === msg.id) || data.messages.some((m) => m.id === msg.id);
			if (!isDuplicate) {
				sseMessages = [...sseMessages, msg];
				requestAnimationFrame(scrollToBottom);
			}
		};

		requestAnimationFrame(scrollToBottom);

		return () => es.close();
	});

	async function sendMessage() {
		const content = newMessage.trim();
		if (!content) return;
		newMessage = '';
		await fetch('/api/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ channelId: data.channel.id, content })
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="chat-container">
	<div class="chat-header">
		<h2># {data.channel.name}</h2>
		{#if data.channel.description}
			<p class="channel-desc">{data.channel.description}</p>
		{/if}
	</div>

	<div bind:this={messagesContainer} class="messages-area">
		{#if messages.length === 0}
			<p class="empty-state">No messages yet. Start the conversation!</p>
		{:else}
			{#each messages as msg (msg.id)}
				<div class="message">
					<div class="avatar">
						{msg.userName.charAt(0).toUpperCase()}
					</div>
					<div>
						<div class="message-meta">
							<span class="author">{msg.userName}</span>
							<span class="time">{formatTime(msg.createdAt)}</span>
						</div>
						<p class="message-text">{msg.content}</p>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<div class="input-area">
		<div class="input-row">
			<div class="input-field">
				<TextInput
					bind:value={newMessage}
					placeholder="Type a message..."
					on:keydown={handleKeydown}
					hideLabel
					labelText="Message"
				/>
			</div>
			<Button
				icon={SendAlt}
				iconDescription="Send"
				kind="primary"
				on:click={sendMessage}
				disabled={!newMessage.trim()}
			/>
		</div>
	</div>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 7rem);
	}

	.chat-header {
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.channel-desc {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.messages-area {
		flex: 1;
		overflow-y: auto;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
	}

	.empty-state {
		text-align: center;
		padding: var(--cds-spacing-07) 0;
		color: var(--cds-text-placeholder);
	}

	.message {
		display: flex;
		gap: var(--cds-spacing-05);
		margin-bottom: var(--cds-spacing-05);
	}

	.avatar {
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--cds-link-primary);
		color: var(--cds-text-on-color);
		font-size: 0.875rem;
		font-weight: 700;
	}

	.message-meta {
		display: flex;
		align-items: baseline;
		gap: var(--cds-spacing-03);
	}

	.author {
		font-weight: 600;
	}

	.time {
		font-size: 0.75rem;
		color: var(--cds-text-placeholder);
	}

	.message-text {
		margin-top: var(--cds-spacing-01);
	}

	.input-area {
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-top: 1px solid var(--cds-border-subtle);
	}

	.input-row {
		display: flex;
		gap: var(--cds-spacing-03);
	}

	.input-field {
		flex: 1;
	}
</style>

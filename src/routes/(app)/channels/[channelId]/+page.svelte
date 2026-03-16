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

<div class="flex h-[calc(100vh-7rem)] flex-col">
	<!-- Channel header -->
	<div class="border-b border-gray-200 px-6 py-3">
		<h2 class="text-xl font-semibold"># {data.channel.name}</h2>
		{#if data.channel.description}
			<p class="text-sm text-gray-500">{data.channel.description}</p>
		{/if}
	</div>

	<!-- Messages -->
	<div bind:this={messagesContainer} class="flex-1 overflow-y-auto px-6 py-4">
		{#if messages.length === 0}
			<p class="py-8 text-center text-gray-400">No messages yet. Start the conversation!</p>
		{:else}
			{#each messages as msg (msg.id)}
				<div class="mb-4 flex gap-3">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
					>
						{msg.userName.charAt(0).toUpperCase()}
					</div>
					<div>
						<div class="flex items-baseline gap-2">
							<span class="font-semibold">{msg.userName}</span>
							<span class="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
						</div>
						<p class="mt-0.5 text-gray-800">{msg.content}</p>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Message input -->
	<div class="border-t border-gray-200 px-6 py-3">
		<div class="flex gap-2">
			<div class="flex-1">
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

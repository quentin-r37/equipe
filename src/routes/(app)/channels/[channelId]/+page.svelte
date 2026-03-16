<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, TextInput } from 'carbon-components-svelte';
	import SendAlt from 'carbon-icons-svelte/lib/SendAlt.svelte';
	import Attachment from 'carbon-icons-svelte/lib/Attachment.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import type { PageData } from './$types';

	interface ChatFile {
		id: string;
		name: string;
		size: number;
		mimeType: string;
	}

	interface ChatMessage {
		id: string;
		channelId: string;
		userId: string;
		userName: string;
		content: string;
		createdAt: string;
		files?: ChatFile[];
	}

	let { data }: { data: PageData } = $props();

	let sseMessages = $state<ChatMessage[]>([]);
	const messages = $derived([...(data.messages as ChatMessage[]), ...sseMessages]);
	let newMessage = $state('');
	let pendingFiles = $state<File[]>([]);
	let sending = $state(false);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();

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
				sseMessages.some((m) => m.id === msg.id) ||
				data.messages.some((m: ChatMessage) => m.id === msg.id);
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
		if (!content && pendingFiles.length === 0) return;

		sending = true;
		newMessage = '';
		const filesToSend = [...pendingFiles];
		pendingFiles = [];

		try {
			if (filesToSend.length > 0) {
				const formData = new FormData();
				formData.append('channelId', data.channel.id);
				formData.append('content', content);
				for (const f of filesToSend) {
					formData.append('files', f);
				}
				await fetch('/api/messages', { method: 'POST', body: formData });
			} else {
				await fetch('/api/messages', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ channelId: data.channel.id, content })
				});
			}
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function openFilePicker() {
		fileInput?.click();
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			addFiles(input.files);
		}
		input.value = '';
	}

	function addFiles(files: FileList | File[]) {
		pendingFiles = [...pendingFiles, ...Array.from(files)];
	}

	function removePendingFile(index: number) {
		pendingFiles = pendingFiles.filter((_, i) => i !== index);
	}

	let dragging = $state(false);
	let dragCounter = 0;

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		dragCounter++;
		if (e.dataTransfer?.types.includes('Files')) dragging = true;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter === 0) dragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragCounter = 0;
		dragging = false;
		if (e.dataTransfer?.files.length) {
			addFiles(e.dataTransfer.files);
		}
	}

	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;
		const files: File[] = [];
		for (const item of items) {
			if (item.kind === 'file') {
				const f = item.getAsFile();
				if (f) files.push(f);
			}
		}
		if (files.length > 0) {
			e.preventDefault();
			addFiles(files);
		}
	}

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function isImage(mimeType: string): boolean {
		return mimeType.startsWith('image/');
	}

	function isVideo(mimeType: string): boolean {
		return mimeType.startsWith('video/');
	}

	function isAudio(mimeType: string): boolean {
		return mimeType.startsWith('audio/');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="chat-container"
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onpaste={handlePaste}
>
	{#if dragging}
		<div class="drop-overlay">
			<div class="drop-label">Drop files here</div>
		</div>
	{/if}
	<div bind:this={messagesContainer} class="messages-area">
		{#if messages.length === 0}
			<p class="empty-state">No messages yet. Start the conversation!</p>
		{:else}
			{#each messages as msg (msg.id)}
				<div class="message">
					<div class="avatar">
						{msg.userName.charAt(0).toUpperCase()}
					</div>
					<div class="message-body">
						<div class="message-meta">
							<span class="author">{msg.userName}</span>
							<span class="time">{formatTime(msg.createdAt)}</span>
						</div>
						{#if msg.content}
							<p class="message-text">{msg.content}</p>
						{/if}
						{#if msg.files && msg.files.length > 0}
							<div class="message-files">
								{#each msg.files as f (f.id)}
									{#if isImage(f.mimeType)}
										<a
											href={resolve(`/api/files?id=${f.id}`)}
											target="_blank"
											class="file-preview image-preview"
										>
											<img
												src={resolve(`/api/files?id=${f.id}&inline=1`)}
												alt={f.name}
												loading="lazy"
											/>
										</a>
									{:else if isVideo(f.mimeType)}
										<!-- svelte-ignore a11y_media_has_caption -->
										<video
											src={resolve(`/api/files?id=${f.id}&inline=1`)}
											controls
											preload="metadata"
											class="file-preview video-preview"
										></video>
									{:else if isAudio(f.mimeType)}
										<div class="file-attachment audio-attachment">
											<span class="file-name">{f.name}</span>
											<audio
												src={resolve(`/api/files?id=${f.id}&inline=1`)}
												controls
												preload="metadata"
											></audio>
										</div>
									{:else}
										<a
											href={resolve(`/api/files?id=${f.id}`)}
											class="file-attachment"
											target="_blank"
										>
											<Download size={16} />
											<span class="file-name">{f.name}</span>
											<span class="file-size">{formatSize(f.size)}</span>
										</a>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<div class="input-area">
		{#if pendingFiles.length > 0}
			<div class="pending-files">
				{#each pendingFiles as f, i (f.name + f.size + i)}
					<div class="pending-file">
						{#if isImage(f.type)}
							<img src={URL.createObjectURL(f)} alt={f.name} class="pending-thumb" />
						{/if}
						<span class="pending-name">{f.name}</span>
						<span class="pending-size">{formatSize(f.size)}</span>
						<button class="pending-remove" onclick={() => removePendingFile(i)}>
							<Close size={16} />
						</button>
					</div>
				{/each}
			</div>
		{/if}
		<input
			bind:this={fileInput}
			type="file"
			multiple
			onchange={handleFileSelect}
			style="display:none"
		/>
		<div class="input-row">
			<Button
				icon={Attachment}
				iconDescription="Attach file"
				kind="ghost"
				size="field"
				on:click={openFilePicker}
			/>
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
				disabled={(!newMessage.trim() && pendingFiles.length === 0) || sending}
			/>
		</div>
	</div>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		position: relative;
	}

	.drop-overlay {
		position: absolute;
		inset: 0;
		z-index: 10;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.drop-label {
		padding: var(--cds-spacing-05) var(--cds-spacing-07);
		background: var(--cds-layer-01);
		border: 2px dashed var(--cds-link-primary);
		border-radius: 8px;
		color: var(--cds-text-primary);
		font-size: 1.125rem;
		font-weight: 600;
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

	.message-body {
		min-width: 0;
		flex: 1;
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

	/* ── File attachments in messages ── */
	.message-files {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-03);
	}

	.image-preview {
		display: block;
	}

	.image-preview img {
		max-width: 400px;
		max-height: 300px;
		border-radius: 4px;
		object-fit: contain;
		background: var(--cds-layer-01);
	}

	.video-preview {
		max-width: 480px;
		max-height: 360px;
		border-radius: 4px;
		background: #000;
	}

	.audio-attachment {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--cds-spacing-02);
	}

	.audio-attachment audio {
		width: 100%;
		max-width: 400px;
	}

	.file-attachment {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
		background: var(--cds-layer-01);
		border: 1px solid var(--cds-border-subtle);
		border-radius: 4px;
		text-decoration: none;
		color: var(--cds-text-primary);
		width: fit-content;
		max-width: 400px;
	}

	.file-attachment:hover {
		background: var(--cds-layer-hover-01);
	}

	.file-name {
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		white-space: nowrap;
	}

	/* ── Pending files bar ── */
	.pending-files {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03) var(--cds-spacing-06);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.pending-file {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
		background: var(--cds-layer-01);
		border: 1px solid var(--cds-border-subtle);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.pending-thumb {
		width: 2rem;
		height: 2rem;
		border-radius: 2px;
		object-fit: cover;
	}

	.pending-name {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pending-size {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	.pending-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--cds-text-secondary);
		padding: 2px;
		border-radius: 2px;
	}

	.pending-remove:hover {
		color: var(--cds-text-primary);
		background: var(--cds-layer-hover-01);
	}

	/* ── Input area ── */
	.input-area {
		border-top: 1px solid var(--cds-border-subtle);
	}

	.input-row {
		display: flex;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
	}

	.input-field {
		flex: 1;
	}
</style>

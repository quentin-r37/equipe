<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, TextInput } from 'carbon-components-svelte';
	import SendAlt from 'carbon-icons-svelte/lib/SendAlt.svelte';
	import Attachment from 'carbon-icons-svelte/lib/Attachment.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import Edit from 'carbon-icons-svelte/lib/Edit.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import Checkmark from 'carbon-icons-svelte/lib/Checkmark.svelte';

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

	let {
		channelId,
		userId,
		initialMessages = undefined,
		compact = false
	}: {
		channelId: string;
		userId: string;
		initialMessages?: ChatMessage[];
		compact?: boolean;
	} = $props();

	let loadedMessages = $state<ChatMessage[]>([]);
	let sseMessages = $state<ChatMessage[]>([]);
	const messages = $derived([...loadedMessages, ...sseMessages]);
	let newMessage = $state('');
	let pendingFiles = $state<File[]>([]);
	let sending = $state(false);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();

	// Edit state
	let editingId = $state<string | null>(null);
	let editContent = $state('');

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	$effect(() => {
		const id = channelId;
		sseMessages = [];

		if (initialMessages) {
			loadedMessages = [...initialMessages];
		} else {
			// Fetch messages via API when no initial data (e.g. meeting chat)
			loadedMessages = [];
			fetch(`/api/messages?channelId=${id}`)
				.then((res) => (res.ok ? res.json() : []))
				.then((msgs: ChatMessage[]) => {
					loadedMessages = msgs;
					requestAnimationFrame(scrollToBottom);
				});
		}

		let es: EventSource;
		let reconnectTimeout: ReturnType<typeof setTimeout>;
		let closed = false;

		function getLatestTimestamp(): string | undefined {
			const all = [...loadedMessages, ...sseMessages];
			if (all.length === 0) return undefined;
			return all.reduce((latest, m) => (m.createdAt > latest ? m.createdAt : latest), all[0].createdAt);
		}

		async function fetchMissedMessages() {
			const after = getLatestTimestamp();
			if (!after) return;
			try {
				const res = await fetch(`/api/messages?channelId=${id}&after=${encodeURIComponent(after)}`);
				if (!res.ok) return;
				const msgs: ChatMessage[] = await res.json();
				for (const msg of msgs) {
					const isDuplicate =
						sseMessages.some((m) => m.id === msg.id) ||
						loadedMessages.some((m) => m.id === msg.id);
					if (!isDuplicate) {
						sseMessages = [...sseMessages, msg];
					}
				}
				if (msgs.length > 0) requestAnimationFrame(scrollToBottom);
			} catch {
				// Network error — will retry on next reconnect
			}
		}

		function connect() {
			if (closed) return;
			es = new EventSource(`/api/messages/stream?channelId=${id}`);

			es.addEventListener('message', (event) => {
				const msg: ChatMessage = JSON.parse(event.data);
				const isDuplicate =
					sseMessages.some((m) => m.id === msg.id) ||
					loadedMessages.some((m) => m.id === msg.id);
				if (!isDuplicate) {
					sseMessages = [...sseMessages, msg];
					requestAnimationFrame(scrollToBottom);
				}
			});

			es.addEventListener('update', (event) => {
				const updated: ChatMessage = JSON.parse(event.data);
				sseMessages = sseMessages.map((m) => (m.id === updated.id ? updated : m));
				loadedMessages = loadedMessages.map((m) => (m.id === updated.id ? updated : m));
			});

			es.addEventListener('delete', (event) => {
				const { id: deletedId } = JSON.parse(event.data);
				sseMessages = sseMessages.filter((m) => m.id !== deletedId);
				loadedMessages = loadedMessages.filter((m) => m.id !== deletedId);
			});

			es.addEventListener('file_delete', (event) => {
				const { id: fileId, messageId } = JSON.parse(event.data);
				function removeFile(msg: ChatMessage) {
					if (msg.id === messageId && msg.files) {
						return { ...msg, files: msg.files.filter((f) => f.id !== fileId) };
					}
					return msg;
				}
				sseMessages = sseMessages.map(removeFile);
				loadedMessages = loadedMessages.map(removeFile);
			});

			es.onerror = () => {
				es.close();
				if (closed) return;
				// Fetch messages that may have been sent while disconnected, then reconnect
				fetchMissedMessages().finally(() => {
					if (!closed) {
						reconnectTimeout = setTimeout(connect, 3000);
					}
				});
			};
		}

		connect();
		requestAnimationFrame(scrollToBottom);

		return () => {
			closed = true;
			clearTimeout(reconnectTimeout);
			es?.close();
		};
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
				formData.append('channelId', channelId);
				formData.append('content', content);
				for (const f of filesToSend) {
					formData.append('files', f);
				}
				await fetch('/api/messages', { method: 'POST', body: formData });
			} else {
				await fetch('/api/messages', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ channelId, content })
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
		if (editingId) return;
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

	// ── Edit / Delete ──

	function startEdit(msg: ChatMessage) {
		editingId = msg.id;
		editContent = msg.content;
	}

	function cancelEdit() {
		editingId = null;
		editContent = '';
	}

	async function saveEdit() {
		if (!editingId) return;
		await fetch('/api/messages', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: editingId, content: editContent })
		});
		editingId = null;
		editContent = '';
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveEdit();
		}
		if (e.key === 'Escape') {
			cancelEdit();
		}
	}

	async function deleteMessage(id: string) {
		await fetch(`/api/messages?id=${id}`, { method: 'DELETE' });
	}

	async function deleteFileFromMessage(fileId: string) {
		await fetch(`/api/files?id=${fileId}`, { method: 'DELETE' });
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

	const isOwn = (msg: ChatMessage) => msg.userId === userId;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="chat-container"
	class:compact
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
				<div class="message" class:own={isOwn(msg)}>
					{#if !isOwn(msg)}
						<div class="avatar">
							{msg.userName.charAt(0).toUpperCase()}
						</div>
					{/if}
					<div class="message-bubble">
						<div class="message-meta">
							{#if !isOwn(msg)}
								<span class="author">{msg.userName}</span>
							{/if}
							<span class="time">{formatTime(msg.createdAt)}</span>
							{#if isOwn(msg)}
								<div class="message-actions">
									{#if editingId !== msg.id}
										<button class="action-btn" title="Edit" onclick={() => startEdit(msg)}>
											<Edit size={16} />
										</button>
									{/if}
									<button
										class="action-btn danger"
										title="Delete"
										onclick={() => deleteMessage(msg.id)}
									>
										<TrashCan size={16} />
									</button>
								</div>
							{/if}
						</div>
						{#if editingId === msg.id}
							<div class="edit-row">
								<div class="edit-field">
									<TextInput
										bind:value={editContent}
										on:keydown={handleEditKeydown}
										hideLabel
										labelText="Edit message"
										size="sm"
									/>
								</div>
								<Button
									icon={Checkmark}
									iconDescription="Save"
									kind="ghost"
									size="small"
									on:click={saveEdit}
								/>
								<Button
									icon={Close}
									iconDescription="Cancel"
									kind="ghost"
									size="small"
									on:click={cancelEdit}
								/>
							</div>
						{:else if msg.content}
							<p class="message-text">{msg.content}</p>
						{/if}
						{#if msg.files && msg.files.length > 0}
							<div class="message-files">
								{#each msg.files as f (f.id)}
									<div class="file-wrapper">
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
										{#if isOwn(msg)}
											<button
												class="file-remove-btn"
												title="Remove file"
												onclick={() => deleteFileFromMessage(f.id)}
											>
												<Close size={16} />
											</button>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
					{#if isOwn(msg)}
						<div class="avatar">
							{msg.userName.charAt(0).toUpperCase()}
						</div>
					{/if}
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
			{#if !compact}
				<Button
					icon={Attachment}
					iconDescription="Attach file"
					kind="ghost"
					size="field"
					on:click={openFilePicker}
				/>
			{/if}
			<div class="input-field">
				<TextInput
					bind:value={newMessage}
					placeholder="Type a message..."
					on:keydown={handleKeydown}
					hideLabel
					labelText="Message"
					size={compact ? 'sm' : undefined}
				/>
			</div>
			<Button
				icon={SendAlt}
				iconDescription="Send"
				kind="primary"
				size={compact ? 'small' : undefined}
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
		overflow-x: hidden;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
	}

	.compact .messages-area {
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
	}

	.empty-state {
		text-align: center;
		padding: var(--cds-spacing-07) 0;
		color: var(--cds-text-placeholder);
	}

	.message {
		display: flex;
		gap: var(--cds-spacing-03);
		margin-bottom: var(--cds-spacing-04);
		align-items: flex-end;
		max-width: 100%;
	}

	.message.own {
		justify-content: flex-end;
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

	.compact .avatar {
		width: 1.5rem;
		height: 1.5rem;
		font-size: 0.6875rem;
	}

	.message-bubble {
		min-width: 0;
		max-width: 70%;
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
		border-radius: 12px;
		background: var(--cds-layer-01);
		border: 1px solid var(--cds-border-subtle);
	}

	.compact .message-bubble {
		max-width: 85%;
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
	}

	.message.own .message-bubble {
		background: var(--cds-link-primary);
		color: var(--cds-text-on-color);
		border-color: transparent;
		border-bottom-right-radius: 4px;
	}

	.message:not(.own) .message-bubble {
		border-bottom-left-radius: 4px;
	}

	.message-meta {
		display: flex;
		align-items: baseline;
		gap: var(--cds-spacing-03);
	}

	.author {
		font-weight: 600;
		font-size: 0.8125rem;
	}

	.time {
		font-size: 0.6875rem;
		color: var(--cds-text-placeholder);
	}

	.message.own .time {
		color: rgba(255, 255, 255, 0.7);
	}

	.message-text {
		margin-top: var(--cds-spacing-01);
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.compact .message-text {
		font-size: 0.8125rem;
	}

	/* ── Message actions (edit/delete) ── */
	.message-actions {
		display: flex;
		gap: 2px;
		margin-left: auto;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.message:hover .message-actions {
		opacity: 1;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.7);
		padding: 4px;
		border-radius: 4px;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.action-btn.danger:hover {
		color: #ff8389;
	}

	/* ── Edit row ── */
	.edit-row {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		margin-top: var(--cds-spacing-02);
	}

	.edit-field {
		flex: 1;
	}

	/* ── File attachments in messages ── */
	.message-files {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-03);
	}

	.file-wrapper {
		position: relative;
		width: fit-content;
		max-width: 100%;
	}

	.file-remove-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cds-layer-01);
		border: 1px solid var(--cds-border-subtle);
		border-radius: 50%;
		cursor: pointer;
		color: var(--cds-text-secondary);
		padding: 2px;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.file-wrapper:hover .file-remove-btn {
		opacity: 1;
	}

	.file-remove-btn:hover {
		color: var(--cds-support-error);
		background: var(--cds-layer-hover-01);
	}

	.message.own .file-remove-btn {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
		color: #fff;
	}

	.message.own .file-remove-btn:hover {
		color: #ff8389;
		background: rgba(255, 255, 255, 0.3);
	}

	.image-preview {
		display: block;
	}

	.image-preview img {
		max-width: 100%;
		max-height: 300px;
		border-radius: 4px;
		object-fit: contain;
		background: var(--cds-layer-01);
	}

	.compact .image-preview img {
		max-height: 150px;
	}

	.video-preview {
		max-width: 100%;
		max-height: 360px;
		border-radius: 4px;
		background: #000;
	}

	.compact .video-preview {
		max-height: 180px;
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
		max-width: 100%;
	}

	.file-attachment:hover {
		background: var(--cds-layer-hover-01);
	}

	.message.own .file-attachment {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
		color: #fff;
	}

	.message.own .file-attachment:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	.message.own .file-size {
		color: rgba(255, 255, 255, 0.7);
	}

	.message.own .audio-attachment {
		color: #fff;
	}

	.file-name {
		font-size: 0.875rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
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

	.compact .input-row {
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
	}

	.input-field {
		flex: 1;
	}
</style>

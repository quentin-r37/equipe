<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, TextArea } from 'carbon-components-svelte';
	import SendAlt from 'carbon-icons-svelte/lib/SendAlt.svelte';
	import ArrowDown from 'carbon-icons-svelte/lib/ArrowDown.svelte';
	import Attachment from 'carbon-icons-svelte/lib/Attachment.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import Edit from 'carbon-icons-svelte/lib/Edit.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import Checkmark from 'carbon-icons-svelte/lib/Checkmark.svelte';
	import Share from 'carbon-icons-svelte/lib/Share.svelte';
	import ShareFileModal from '$lib/components/ShareFileModal.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { untrack } from 'svelte';
	import { notificationState } from '$lib/stores/notifications.svelte';
	import { formatSize, validateUpload } from '$lib/files';
	import * as m from '$lib/paraglide/messages';

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
	let messageInput: HTMLTextAreaElement | null = $state(null);

	// Edit state
	let editingId = $state<string | null>(null);
	let editContent = $state('');

	// Share state
	let showShareModal = $state(false);
	let shareFileId = $state('');

	// Delete confirmations
	let deleteMessageTarget = $state<ChatMessage | null>(null);
	let showDeleteMessage = $state(false);
	let deleteFileTarget = $state<{ file: ChatFile; message: ChatMessage } | null>(null);
	let showDeleteFile = $state(false);

	function openShare(id: string) {
		shareFileId = id;
		showShareModal = true;
	}

	// ── Scroll management ──
	// The fil only follows new messages when the reader is already at the bottom; otherwise
	// the arriving messages are counted behind a pill so scrolling back to re-read is stable.
	const STICK_THRESHOLD_PX = 100;
	let unreadCount = $state(0);

	/** True when the reader is close enough to the bottom that new messages should follow. */
	function isNearBottom(): boolean {
		if (!messagesContainer) return true;
		const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
		return scrollHeight - scrollTop - clientHeight <= STICK_THRESHOLD_PX;
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
		unreadCount = 0;
	}

	function handleMessagesScroll() {
		if (isNearBottom()) unreadCount = 0;
	}

	$effect(() => {
		const id = channelId;
		const initial = untrack(() => initialMessages);
		sseMessages = [];
		unreadCount = 0;

		if (initial) {
			loadedMessages = [...initial];
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
			return all.reduce(
				(latest, m) => (m.createdAt > latest ? m.createdAt : latest),
				all[0].createdAt
			);
		}

		async function fetchMissedMessages() {
			const after = getLatestTimestamp();
			if (!after) return;
			try {
				const res = await fetch(`/api/messages?channelId=${id}&after=${encodeURIComponent(after)}`);
				if (!res.ok) return;
				const msgs: ChatMessage[] = await res.json();
				// Decide before mutating: appending changes scrollHeight.
				const stick = isNearBottom();
				let added = 0;
				for (const msg of msgs) {
					const isDuplicate =
						sseMessages.some((m) => m.id === msg.id) || loadedMessages.some((m) => m.id === msg.id);
					if (!isDuplicate) {
						sseMessages = [...sseMessages, msg];
						added++;
					}
				}
				if (added === 0) return;
				if (stick) requestAnimationFrame(scrollToBottom);
				else unreadCount += added;
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
					sseMessages.some((m) => m.id === msg.id) || loadedMessages.some((m) => m.id === msg.id);
				if (!isDuplicate) {
					// Read the scroll position before appending, and always follow your own message.
					const stick = isNearBottom() || msg.userId === userId;
					sseMessages = [...sseMessages, msg];
					if (stick) requestAnimationFrame(scrollToBottom);
					else unreadCount += 1;
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

	/** Reads the error message from a failed API response, falling back to a generic one. */
	async function responseError(res: Response, fallback: string): Promise<string> {
		try {
			const body = await res.json();
			if (body && typeof body.message === 'string' && body.message) return body.message;
		} catch {
			// Not JSON
		}
		if (res.status === 413) return 'The files are too large to upload.';
		return fallback;
	}

	async function sendMessage() {
		const content = newMessage.trim();
		if (!content && pendingFiles.length === 0) return;

		sending = true;
		const draft = newMessage;
		newMessage = '';
		const filesToSend = [...pendingFiles];
		pendingFiles = [];

		try {
			let res: Response;
			if (filesToSend.length > 0) {
				const formData = new FormData();
				formData.append('channelId', channelId);
				formData.append('content', content);
				for (const f of filesToSend) {
					formData.append('files', f);
				}
				res = await fetch('/api/messages', { method: 'POST', body: formData });
			} else {
				res = await fetch('/api/messages', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ channelId, content })
				});
			}
			if (!res.ok) {
				throw new Error(await responseError(res, 'Your message could not be sent.'));
			}
		} catch (err) {
			// Give the draft back so nothing typed or attached is lost.
			newMessage = draft;
			pendingFiles = filesToSend;
			notificationState.toast(
				'error',
				err instanceof Error && err.message ? err.message : 'Your message could not be sent.'
			);
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
		const accepted: File[] = [];
		for (const f of Array.from(files)) {
			const problem = validateUpload(f);
			if (problem) {
				notificationState.toast('error', problem);
				continue;
			}
			const duplicate = [...pendingFiles, ...accepted].some(
				(p) => p.name === f.name && p.size === f.size && p.lastModified === f.lastModified
			);
			if (!duplicate) accepted.push(f);
		}
		if (accepted.length > 0) pendingFiles = [...pendingFiles, ...accepted];
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

	let savingEdit = $state(false);

	async function saveEdit() {
		if (!editingId || savingEdit) return;
		savingEdit = true;
		try {
			const res = await fetch('/api/messages', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: editingId, content: editContent })
			});
			if (!res.ok) throw new Error(await responseError(res, 'The message could not be updated.'));
			editingId = null;
			editContent = '';
		} catch (err) {
			// Stay in edit mode so the change is not lost.
			notificationState.toast(
				'error',
				err instanceof Error && err.message ? err.message : 'The message could not be updated.'
			);
		} finally {
			savingEdit = false;
		}
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

	function askDeleteMessage(msg: ChatMessage) {
		deleteMessageTarget = msg;
		showDeleteMessage = true;
	}

	async function deleteMessage() {
		if (!deleteMessageTarget) return;
		const res = await fetch(`/api/messages?id=${deleteMessageTarget.id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error(await responseError(res, 'The message could not be deleted.'));
	}

	function askDeleteFile(file: ChatFile, message: ChatMessage) {
		deleteFileTarget = { file, message };
		showDeleteFile = true;
	}

	async function deleteFileFromMessage() {
		if (!deleteFileTarget) return;
		const res = await fetch(`/api/files?id=${deleteFileTarget.file.id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error(await responseError(res, 'The file could not be deleted.'));
	}

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	/** Full date + time, shown on hover so `HH:MM` alone is never ambiguous. */
	function fullTimestamp(iso: string) {
		return new Date(iso).toLocaleString();
	}

	// ── Day separators ──

	function dayKey(d: Date): string {
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	function dayLabel(d: Date): string {
		const today = new Date();
		if (dayKey(d) === dayKey(today)) return 'Today';
		// Built from parts rather than mutated, so month and year roll over on their own.
		const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
		if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
		return d.toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric'
		});
	}

	/** Messages paired with the day heading to render above them, when the day changes. */
	const timeline = $derived(
		messages.map((msg, i) => {
			const day = new Date(msg.createdAt);
			const previous = i > 0 ? new Date(messages[i - 1].createdAt) : null;
			return {
				msg,
				daySeparator: !previous || dayKey(previous) !== dayKey(day) ? dayLabel(day) : null
			};
		})
	);

	// ── Linkified message text ──

	const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
	/** Punctuation that ends a sentence rather than the URL it follows. */
	const TRAILING_PUNCTUATION = /[.,:;!?"')\]}]+$/;

	/**
	 * Splits message text into plain and link segments. Returning segments (rather than
	 * building HTML) keeps the text escaped by Svelte, so message content can never inject markup.
	 */
	function linkify(text: string): { text: string; href: string | null }[] {
		const parts: { text: string; href: string | null }[] = [];
		let cursor = 0;
		for (const match of text.matchAll(URL_PATTERN)) {
			const start = match.index ?? 0;
			const url = match[0].replace(TRAILING_PUNCTUATION, '');
			if (!url) continue;
			if (start > cursor) parts.push({ text: text.slice(cursor, start), href: null });
			parts.push({ text: url, href: url.startsWith('www.') ? `https://${url}` : url });
			cursor = start + url.length;
		}
		if (cursor < text.length) parts.push({ text: text.slice(cursor), href: null });
		return parts;
	}

	// ── Composer auto-sizing ──

	const MAX_COMPOSER_HEIGHT_PX = 160;

	function autoGrow(draft: string) {
		if (!messageInput) return;
		messageInput.style.height = 'auto';
		// An empty draft falls back to the CSS min-height instead of a measured height.
		messageInput.style.height = draft
			? `${Math.min(messageInput.scrollHeight, MAX_COMPOSER_HEIGHT_PX)}px`
			: '';
	}

	// Resize on every change of the draft: typing, sending (cleared) and restoring a failed draft.
	$effect(() => {
		autoGrow(newMessage);
	});

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
		<div class="drop-overlay equipe-motion-fade">
			<div class="drop-label">Drop files here</div>
		</div>
	{/if}
	<!--
		Message text with its URLs turned into links. Svelte drops the whitespace-only nodes
		between block tags, so the indentation here does not leak into the `pre-wrap` output.
	-->
	{#snippet richText(content: string)}
		{#each linkify(content) as part, i (i)}
			{#if part.href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- user-supplied external URL, not an app route -->
				<a href={part.href} target="_blank" rel="noopener noreferrer" class="message-link"
					>{part.text}</a
				>
			{:else}
				{part.text}
			{/if}
		{/each}
	{/snippet}
	<div
		bind:this={messagesContainer}
		class="messages-area"
		role="log"
		aria-live="polite"
		onscroll={handleMessagesScroll}
	>
		{#if messages.length === 0}
			<p class="empty-state">No messages yet. Start the conversation!</p>
		{:else}
			{#each timeline as { msg, daySeparator } (msg.id)}
				{#if daySeparator}
					<div class="day-separator"><span>{daySeparator}</span></div>
				{/if}
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
							<span class="time" title={fullTimestamp(msg.createdAt)}
								>{formatTime(msg.createdAt)}</span
							>
							{#if isOwn(msg)}
								<div class="message-actions">
									{#if editingId !== msg.id}
										<button
											class="action-btn"
											title="Edit message"
											aria-label="Edit message"
											onclick={() => startEdit(msg)}
										>
											<Edit size={16} />
										</button>
									{/if}
									<button
										class="action-btn danger"
										title="Delete message"
										aria-label="Delete message"
										onclick={() => askDeleteMessage(msg)}
									>
										<TrashCan size={16} />
									</button>
								</div>
							{/if}
						</div>
						{#if editingId === msg.id}
							<div class="edit-row equipe-motion-fade">
								<div class="edit-field">
									<TextArea
										bind:value={editContent}
										on:keydown={handleEditKeydown}
										hideLabel
										labelText="Edit message"
										rows={2}
									/>
								</div>
								<Button
									icon={Checkmark}
									iconDescription="Save"
									kind="ghost"
									size="small"
									disabled={savingEdit}
									on:click={saveEdit}
								/>
								<Button
									icon={Close}
									iconDescription="Cancel"
									kind="ghost"
									size="small"
									disabled={savingEdit}
									on:click={cancelEdit}
								/>
							</div>
						{:else if msg.content}
							<p class="message-text">{@render richText(msg.content)}</p>
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
										<button
											class="file-share-btn"
											title={m.share_file()}
											aria-label="{m.share_file()}: {f.name}"
											onclick={() => openShare(f.id)}
										>
											<Share size={16} />
										</button>
										{#if isOwn(msg)}
											<button
												class="file-remove-btn"
												title="Delete file"
												aria-label="Delete file {f.name}"
												onclick={() => askDeleteFile(f, msg)}
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
		{#if unreadCount > 0}
			<button class="new-messages-pill equipe-motion-rise" onclick={scrollToBottom}>
				<ArrowDown size={16} />
				{unreadCount} new message{unreadCount === 1 ? '' : 's'}
			</button>
		{/if}
		{#if pendingFiles.length > 0}
			<div class="pending-files">
				{#each pendingFiles as f, i (f.name + f.size + i)}
					<div class="pending-file equipe-motion-fade">
						{#if isImage(f.type)}
							<img src={URL.createObjectURL(f)} alt={f.name} class="pending-thumb" />
						{/if}
						<span class="pending-name">{f.name}</span>
						<span class="pending-size">{formatSize(f.size)}</span>
						<button
							class="pending-remove"
							aria-label="Remove {f.name} from attachments"
							onclick={() => removePendingFile(i)}
						>
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
				<TextArea
					bind:value={newMessage}
					bind:ref={messageInput}
					placeholder="Type a message…"
					on:keydown={handleKeydown}
					hideLabel
					labelText="Message"
					rows={1}
				/>
				<p class="input-hint">Enter to send · Shift + Enter for a new line</p>
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

<ShareFileModal bind:open={showShareModal} fileId={shareFileId} />

<ConfirmModal
	bind:open={showDeleteMessage}
	heading="Delete message"
	confirmLabel="Delete"
	onconfirm={deleteMessage}
	successMessage="Message deleted"
>
	<p>Delete this message for everyone? This cannot be undone.</p>
	{#if deleteMessageTarget?.files?.length}
		<p class="confirm-note">
			{deleteMessageTarget.files.length === 1
				? 'The attached file will be permanently deleted too, and any share links to it will stop working.'
				: `The ${deleteMessageTarget.files.length} attached files will be permanently deleted too, and any share links to them will stop working.`}
		</p>
	{/if}
</ConfirmModal>

<ConfirmModal
	bind:open={showDeleteFile}
	heading="Delete file"
	confirmLabel="Delete"
	onconfirm={deleteFileFromMessage}
	successMessage={`"${deleteFileTarget?.file.name}" deleted`}
>
	<p>
		Permanently delete <strong>{deleteFileTarget?.file.name}</strong>? It is removed from this
		message and from the Files page, and any share links to it stop working.
	</p>
	{#if deleteFileTarget && !deleteFileTarget.message.content.trim() && deleteFileTarget.message.files?.length === 1}
		<p class="confirm-note">The message will disappear as well, since it contains nothing else.</p>
	{/if}
</ConfirmModal>

<style>
	.confirm-note {
		margin-top: var(--cds-spacing-04);
		color: var(--cds-text-secondary);
	}

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
		/* Preserve the line breaks the composer now allows. */
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.compact .message-text {
		font-size: 0.8125rem;
	}

	.message-link {
		color: var(--cds-link-primary);
		text-decoration: underline;
		/* Long URLs must not widen the bubble. */
		overflow-wrap: anywhere;
	}

	.message.own .message-link {
		color: #fff;
	}

	/* ── Day separators ── */
	.day-separator {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		margin: var(--cds-spacing-05) 0 var(--cds-spacing-04);
	}

	.day-separator::before,
	.day-separator::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--cds-border-subtle);
	}

	.day-separator span {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--cds-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	/* ── "New messages" pill ── */
	/* Anchored to the top edge of the input area so it never covers the composer. */
	.new-messages-pill {
		position: absolute;
		bottom: calc(100% + var(--cds-spacing-03));
		left: 50%;
		transform: translateX(-50%);
		z-index: 5;
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		padding: var(--cds-spacing-02) var(--cds-spacing-05);
		border: none;
		border-radius: 999px;
		background: var(--cds-link-primary);
		color: var(--cds-text-on-color);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.new-messages-pill:hover {
		background: var(--cds-hover-primary, var(--cds-link-primary));
	}

	/* ── Message actions (edit/delete) ── */
	.message-actions {
		display: flex;
		gap: 2px;
		margin-left: auto;
		opacity: 0;
		transition: opacity var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	.message:hover .message-actions,
	.message:focus-within .message-actions {
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
		align-items: flex-end;
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
		transition: opacity var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	.file-wrapper:hover .file-remove-btn,
	.file-wrapper:focus-within .file-remove-btn {
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

	.file-share-btn {
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
		transition: opacity var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	/* Shift the share button left to make room for the remove button on own messages. */
	.message.own .file-share-btn {
		right: 32px;
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
		color: #fff;
	}

	.file-wrapper:hover .file-share-btn,
	.file-wrapper:focus-within .file-share-btn {
		opacity: 1;
	}

	.file-share-btn:hover {
		color: var(--cds-link-primary);
		background: var(--cds-layer-hover-01);
	}

	.message.own .file-share-btn:hover {
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
		/* Reserve space on the right so the hover share button doesn't cover the name/size. */
		padding-right: 40px;
		background: var(--cds-layer-01);
		border: 1px solid var(--cds-border-subtle);
		border-radius: 4px;
		text-decoration: none;
		color: var(--cds-text-primary);
		width: fit-content;
		max-width: 100%;
	}

	.file-attachment,
	.new-messages-pill,
	.action-btn,
	.pending-remove {
		transition:
			background-color var(--cds-duration-fast-02) var(--cds-motion-standard-productive),
			color var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	.file-attachment:hover {
		background: var(--cds-layer-hover-01);
	}

	.message.own .file-attachment {
		/* Own messages show both share + remove buttons, so reserve more room. */
		padding-right: 68px;
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
		position: relative;
		border-top: 1px solid var(--cds-border-subtle);
	}

	.input-row {
		display: flex;
		/* Keep the buttons pinned to the bottom as the composer grows. */
		align-items: flex-end;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
	}

	.compact .input-row {
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
	}

	.input-field {
		flex: 1;
		min-width: 0;
	}

	/* The composer is a textarea sized like a single-line field until it needs to grow. */
	.input-field :global(.bx--text-area) {
		min-height: 2.5rem;
		max-height: 10rem;
		padding-top: 0.6875rem;
		padding-bottom: 0.6875rem;
		resize: none;
		overflow-y: auto;
	}

	.compact .input-field :global(.bx--text-area) {
		min-height: 2rem;
		max-height: 6rem;
		padding-top: var(--cds-spacing-03);
		padding-bottom: var(--cds-spacing-03);
		font-size: 0.8125rem;
	}

	.edit-field :global(.bx--text-area) {
		min-height: 2.5rem;
		resize: vertical;
	}

	.input-hint {
		margin-top: var(--cds-spacing-02);
		font-size: 0.6875rem;
		color: var(--cds-text-helper);
		/* Only surfaced while composing, so it never competes with the conversation. */
		opacity: 0;
		transition: opacity var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	.input-field:focus-within .input-hint {
		opacity: 1;
	}

	.compact .input-hint {
		display: none;
	}
</style>

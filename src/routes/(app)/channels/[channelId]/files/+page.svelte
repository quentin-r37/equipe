<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Tile, Modal, Tag, InlineNotification } from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import Share from 'carbon-icons-svelte/lib/Share.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import ImageIcon from 'carbon-icons-svelte/lib/Image.svelte';
	import DocumentVideo from 'carbon-icons-svelte/lib/DocumentVideo.svelte';
	import Music from 'carbon-icons-svelte/lib/Music.svelte';
	import DocumentPdf from 'carbon-icons-svelte/lib/DocumentPdf.svelte';
	import ZipReference from 'carbon-icons-svelte/lib/ZipReference.svelte';
	import DocumentWordProcessor from 'carbon-icons-svelte/lib/DocumentWordProcessor.svelte';
	import DataTable from 'carbon-icons-svelte/lib/DataTable.svelte';
	import PresentationFile from 'carbon-icons-svelte/lib/PresentationFile.svelte';
	import Code from 'carbon-icons-svelte/lib/Code.svelte';
	import Document from 'carbon-icons-svelte/lib/Document.svelte';
	import ShareFileModal from '$lib/components/ShareFileModal.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { feedbackEnhance } from '$lib/forms';
	import { formatSize, validateUpload, MAX_UPLOAD_BYTES } from '$lib/files';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import type { Component } from 'svelte';

	let { data }: { data: PageData } = $props();

	// ── Upload modal ──
	let showUploadModal = $state(false);
	let uploadPending = $state(false);
	let uploadError = $state('');
	let selectedFileName = $state('');

	function openUpload() {
		uploadError = '';
		selectedFileName = '';
		showUploadModal = true;
	}

	function onFileChosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		selectedFileName = f?.name ?? '';
		uploadError = f ? (validateUpload(f) ?? '') : '';
	}

	function submitUpload() {
		if (uploadError) return;
		(document.getElementById('channel-upload-form') as HTMLFormElement | null)?.requestSubmit();
	}

	// ── Share ──
	let showShareModal = $state(false);
	let shareFileId = $state('');

	function openShare(id: string) {
		shareFileId = id;
		showShareModal = true;
	}

	// ── Delete ──
	let deleteTarget = $state<{
		id: string;
		name: string;
		shareCount: number;
		attached: boolean;
	} | null>(null);
	let showDeleteConfirm = $state(false);

	function confirmDelete(f: {
		id: string;
		name: string;
		shareCount: number;
		messageId: string | null;
	}) {
		deleteTarget = { id: f.id, name: f.name, shareCount: f.shareCount, attached: !!f.messageId };
		showDeleteConfirm = true;
	}

	function mimeIcon(mime: string): Component {
		if (mime.startsWith('image/')) return ImageIcon;
		if (mime.startsWith('video/')) return DocumentVideo;
		if (mime.startsWith('audio/')) return Music;
		if (mime.includes('pdf')) return DocumentPdf;
		if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip')) return ZipReference;
		if (mime.includes('word') || mime.includes('opendocument.text')) return DocumentWordProcessor;
		if (mime.includes('spreadsheet') || mime.includes('excel')) return DataTable;
		if (mime.includes('presentation') || mime.includes('powerpoint')) return PresentationFile;
		if (
			mime.includes('javascript') ||
			mime.includes('json') ||
			mime.includes('xml') ||
			mime.includes('html') ||
			mime.includes('css') ||
			mime.includes('typescript')
		)
			return Code;
		return Document;
	}
</script>

<svelte:head>
	<title>Files · #{data.channel.name} · Equipe</title>
</svelte:head>

<div class="files-container">
	<div class="page-header">
		<h3>Files in #{data.channel.name}</h3>
		<Button size="small" icon={Add} on:click={openUpload}>Upload</Button>
	</div>

	{#if data.files.length === 0}
		<Tile>
			<div class="empty-state">
				<DocumentMultiple01 size={32} />
				<p>No files in this channel yet. Files attached to messages show up here too.</p>
				<Button size="small" kind="ghost" icon={Add} on:click={openUpload}>Upload a file</Button>
			</div>
		</Tile>
	{:else}
		<div class="file-list">
			{#each data.files as f (f.id)}
				{@const Icon = mimeIcon(f.mimeType)}
				<Tile>
					<div class="file-row">
						<div class="file-info">
							<span class="file-icon">
								<Icon size={24} />
							</span>
							<div class="file-text">
								<p class="file-name">
									{f.name}
									{#if f.shareCount > 0}
										<Tag size="sm" type="green" icon={Share}>
											{m.share_shared({ count: f.shareCount })}
										</Tag>
									{/if}
								</p>
								<p class="file-meta">
									{formatSize(f.size)} &middot; {f.userName} &middot;
									{new Date(f.createdAt).toLocaleDateString()}
								</p>
							</div>
						</div>
						<div class="file-actions">
							<Button
								size="small"
								kind="ghost"
								icon={Share}
								iconDescription="{m.share_file()}: {f.name}"
								on:click={() => openShare(f.id)}
							/>
							<Button
								size="small"
								kind="ghost"
								icon={Download}
								iconDescription="Download {f.name}"
								href="/api/files?id={f.id}"
							/>
							{#if f.userId === data.user.id}
								<Button
									size="small"
									kind="danger-ghost"
									icon={TrashCan}
									iconDescription="Delete {f.name}"
									on:click={() => confirmDelete(f)}
								/>
							{/if}
						</div>
					</div>
				</Tile>
			{/each}
		</div>
	{/if}
</div>

<!-- Upload modal: stays open until the upload succeeds -->
<Modal
	bind:open={showUploadModal}
	modalHeading="Upload to #{data.channel.name}"
	primaryButtonText={uploadPending ? 'Uploading…' : 'Upload'}
	primaryButtonDisabled={uploadPending || !!uploadError || !selectedFileName}
	secondaryButtonText="Cancel"
	shouldSubmitOnEnter={false}
	preventCloseOnClickOutside={uploadPending}
	on:click:button--secondary={() => (showUploadModal = false)}
	on:submit={submitUpload}
>
	{#if uploadError}
		<div class="modal-error">
			<InlineNotification kind="error" title={uploadError} hideCloseButton lowContrast />
		</div>
	{/if}
	<form
		id="channel-upload-form"
		method="post"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={feedbackEnhance<{ name?: string }>({
			pending: (v) => (uploadPending = v),
			success: (d) => `"${d.name}" uploaded`,
			onSuccess: () => (showUploadModal = false),
			onError: (message) => (uploadError = message)
		})}
	>
		<div class="file-input-field">
			<label for="channel-file-upload">File</label>
			<input id="channel-file-upload" type="file" name="file" required onchange={onFileChosen} />
			<p class="file-hint">Maximum size: {formatSize(MAX_UPLOAD_BYTES)}</p>
		</div>
	</form>
	{#if uploadPending}
		<p class="upload-progress">Uploading {selectedFileName}… keep this window open.</p>
	{/if}
</Modal>

<!-- Delete confirmation -->
<ConfirmModal
	bind:open={showDeleteConfirm}
	heading="Delete file"
	confirmLabel="Delete"
	action="?/delete"
	fields={{ fileId: deleteTarget?.id ?? '' }}
	successMessage={`"${deleteTarget?.name}" deleted`}
>
	<p>
		Permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
	</p>
	<ul class="confirm-details">
		{#if deleteTarget?.attached}
			<li>It will also be removed from the chat message it was posted in.</li>
		{/if}
		{#if deleteTarget && deleteTarget.shareCount > 0}
			<li>
				{deleteTarget.shareCount === 1
					? 'Its active share link will stop working.'
					: `Its ${deleteTarget.shareCount} active share links will stop working.`}
			</li>
		{/if}
	</ul>
</ConfirmModal>

<ShareFileModal bind:open={showShareModal} fileId={shareFileId} />

<style>
	.files-container {
		flex: 1;
		overflow-y: auto;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--cds-spacing-05);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cds-spacing-04);
		text-align: center;
		padding: var(--cds-spacing-09) 0;
		color: var(--cds-text-secondary);
	}

	.empty-state :global(svg) {
		color: var(--cds-icon-disabled);
	}

	.file-list {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.file-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-04);
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		min-width: 0;
	}

	.file-text {
		min-width: 0;
	}

	.file-icon {
		display: flex;
		align-items: center;
		color: var(--cds-icon-secondary);
	}

	.file-name {
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.file-meta {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.file-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		flex-shrink: 0;
	}

	.modal-error {
		margin-bottom: var(--cds-spacing-05);
	}

	.file-input-field label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: var(--cds-spacing-02);
	}

	.file-input-field input[type='file'] {
		display: block;
		width: 100%;
		font-size: 0.875rem;
	}

	.file-hint,
	.upload-progress {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		margin-top: var(--cds-spacing-03);
	}

	.confirm-details {
		margin-top: var(--cds-spacing-04);
		padding-left: var(--cds-spacing-05);
		list-style: disc;
		color: var(--cds-text-secondary);
	}

	.confirm-details li {
		margin-bottom: var(--cds-spacing-02);
	}

	@media (max-width: 672px) {
		.files-container {
			padding: var(--cds-spacing-04) var(--cds-spacing-04);
		}

		.file-row {
			flex-wrap: wrap;
		}
	}
</style>

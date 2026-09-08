<script lang="ts">
	import FileTable from '$lib/components/FileTable.svelte';
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import { enhance } from '$app/forms';
	import { Tile, Modal, InlineNotification } from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import ShareFileModal from '$lib/components/ShareFileModal.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { feedbackEnhance } from '$lib/forms';
	import { formatSize, validateUpload, MAX_UPLOAD_BYTES } from '$lib/files';
	import type { PageData } from './$types';

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
</script>

<svelte:head>
	<title>Files · #{data.channel.name} · Equipe</title>
</svelte:head>

<div class="files-container">
	<div class="page-header">
		<h3>Files <span class="file-count">{data.files.length}</span></h3>
		<LabeledButton size="small" icon={Add} tooltip="Upload file" onclick={openUpload}
			>Upload</LabeledButton
		>
	</div>

	{#if data.files.length === 0}
		<Tile>
			<div class="empty-state">
				<DocumentMultiple01 size={32} />
				<p>No files in this channel yet. Files attached to messages show up here too.</p>
				<LabeledButton
					size="small"
					kind="ghost"
					icon={Add}
					tooltip="Upload a file"
					onclick={openUpload}>Upload a file</LabeledButton
				>
			</div>
		</Tile>
	{:else}
		<FileTable
			files={data.files}
			userId={data.user.id}
			onshare={openShare}
			ondelete={confirmDelete}
		/>
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

	.page-header h3 {
		font-size: 1rem;
		font-weight: 600;
	}
	.file-count {
		margin-left: 0.5rem;
		color: var(--cds-text-secondary);
		font-weight: 400;
		font-size: 0.875rem;
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
	}
</style>

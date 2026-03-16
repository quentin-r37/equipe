<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Tile, Modal } from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showUploadModal = $state(false);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1048576).toFixed(1)} MB`;
	}

	function mimeIcon(mime: string): string {
		if (mime.startsWith('image/')) return '🖼';
		if (mime.startsWith('video/')) return '🎬';
		if (mime.startsWith('audio/')) return '🎵';
		if (mime.includes('pdf')) return '📄';
		if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip')) return '📦';
		return '📎';
	}
</script>

<div class="files-container">
	<div class="page-header">
		<h3>Files</h3>
		<Button size="small" icon={Add} on:click={() => (showUploadModal = true)}>Upload</Button>
	</div>

	{#if data.files.length === 0}
		<Tile>
			<div class="empty-state">
				<DocumentMultiple01 size={32} />
				<p>No files uploaded yet.</p>
			</div>
		</Tile>
	{:else}
		<div class="file-list">
			{#each data.files as f (f.id)}
				<Tile>
					<div class="file-row">
						<div class="file-info">
							<span class="file-icon">{mimeIcon(f.mimeType)}</span>
							<div>
								<p class="file-name">{f.name}</p>
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
								icon={Download}
								iconDescription="Download"
								href="/api/files?id={f.id}"
							/>
							{#if f.userId === data.user.id}
								<form method="post" action="?/delete" use:enhance>
									<input type="hidden" name="fileId" value={f.id} />
									<Button
										size="small"
										kind="danger-ghost"
										icon={TrashCan}
										iconDescription="Delete"
										type="submit"
									/>
								</form>
							{/if}
						</div>
					</div>
				</Tile>
			{/each}
		</div>
	{/if}
</div>

<Modal
	bind:open={showUploadModal}
	modalHeading="Upload File"
	primaryButtonText="Upload"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showUploadModal = false)}
	on:submit={() => {
		const form = document.getElementById('channel-upload-form') as HTMLFormElement;
		form?.requestSubmit();
		showUploadModal = false;
	}}
>
	<form
		id="channel-upload-form"
		method="post"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance
	>
		<div class="file-input-field">
			<label for="channel-file-upload">File</label>
			<input id="channel-file-upload" type="file" name="file" required />
		</div>
	</form>
</Modal>

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
		text-align: center;
		padding: var(--cds-spacing-09) 0;
		color: var(--cds-text-secondary);
	}

	.empty-state :global(svg) {
		margin: 0 auto var(--cds-spacing-05);
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
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
	}

	.file-icon {
		font-size: 1.5rem;
	}

	.file-name {
		font-weight: 500;
	}

	.file-meta {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.file-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
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

	@media (max-width: 672px) {
		.files-container {
			padding: var(--cds-spacing-04) var(--cds-spacing-04);
		}
	}
</style>

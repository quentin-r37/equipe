<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Tile, Modal, Select, SelectItem } from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from '../$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();

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

<div class="page-header">
	<h1>Files</h1>
	{#if data.teams.length > 0}
		<Button icon={Add} on:click={() => (showUploadModal = true)}>Upload File</Button>
	{/if}
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

<Modal
	bind:open={showUploadModal}
	modalHeading="Upload File"
	primaryButtonText="Upload"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showUploadModal = false)}
	on:submit={() => {
		const form = document.getElementById('upload-form') as HTMLFormElement;
		form?.requestSubmit();
		showUploadModal = false;
	}}
>
	<form id="upload-form" method="post" action="?/upload" enctype="multipart/form-data" use:enhance>
		<div class="form-field">
			<Select name="teamId" labelText="Team">
				{#each data.teams as t (t.id)}
					<SelectItem value={t.id} text={t.name} />
				{/each}
			</Select>
		</div>
		<div class="file-input-field">
			<label for="file-upload">File</label>
			<input id="file-upload" type="file" name="file" required />
		</div>
	</form>
</Modal>

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--cds-spacing-07);
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
		gap: var(--cds-spacing-05);
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

	.form-field {
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
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		Tile,
		Modal,
		Select,
		SelectItem,
		FileUploader,
		Tag,
		InlineNotification
	} from 'carbon-components-svelte';
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

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Files</h1>
	{#if data.teams.length > 0}
		<Button icon={Add} on:click={() => (showUploadModal = true)}>Upload File</Button>
	{/if}
</div>

{#if data.files.length === 0}
	<Tile class="py-12 text-center">
		<DocumentMultiple01 size={32} class="mx-auto mb-4 text-gray-300" />
		<p class="text-gray-500">No files uploaded yet.</p>
	</Tile>
{:else}
	<div class="space-y-2">
		{#each data.files as f (f.id)}
			<Tile class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="text-2xl">{mimeIcon(f.mimeType)}</span>
					<div>
						<p class="font-medium">{f.name}</p>
						<p class="text-sm text-gray-500">
							{formatSize(f.size)} &middot; {f.userName} &middot;
							{new Date(f.createdAt).toLocaleDateString()}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
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
		<div class="mb-4">
			<Select name="teamId" labelText="Team">
				{#each data.teams as t (t.id)}
					<SelectItem value={t.id} text={t.name} />
				{/each}
			</Select>
		</div>
		<div>
			<label for="file-upload" class="mb-1 block text-sm font-medium">File</label>
			<input id="file-upload" type="file" name="file" required class="block w-full text-sm" />
		</div>
	</form>
</Modal>

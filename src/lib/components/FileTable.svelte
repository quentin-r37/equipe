<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Tag, OverflowMenu, OverflowMenuItem } from 'carbon-components-svelte';
	import { formatSize } from '$lib/files';
	import * as m from '$lib/paraglide/messages';
	import type { Component } from 'svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import Share from 'carbon-icons-svelte/lib/Share.svelte';
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
	type FileEntry = {
		id: string;
		name: string;
		mimeType: string;
		size: number;
		userName: string | null;
		userId: string;
		createdAt: Date | string;
		shareCount: number;
		messageId: string | null;
	};
	let {
		files,
		userId,
		onshare,
		ondelete
	}: {
		files: FileEntry[];
		userId: string;
		onshare: (id: string) => void;
		ondelete: (file: FileEntry) => void;
	} = $props();
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

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the table horizontally.) -->
<div class="file-table" role="region" aria-label="Files" tabindex="0">
	<table class="bx--data-table bx--data-table--compact">
		<caption class="bx--assistive-text">Shared files</caption>
		<thead
			><tr
				><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Size</th><th scope="col"
					>Added by</th
				><th scope="col">Date</th><th scope="col"
					><span class="bx--assistive-text">Actions</span></th
				></tr
			></thead
		>
		<tbody>
			{#each files as file (file.id)}
				{@const Icon = mimeIcon(file.mimeType)}
				<tr>
					<td class="name-cell"
						><div class="file-name">
							<span class="file-icon" aria-hidden="true"><Icon size={20} /></span><span
								class="name-text">{file.name}</span
							>{#if file.shareCount > 0}<Tag size="sm" type="cool-gray" icon={Share}
									>{m.share_shared({ count: file.shareCount })}</Tag
								>{/if}
						</div></td
					>
					<td class="metadata"
						>{file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() : 'File'}</td
					>
					<td class="metadata">{formatSize(file.size)}</td>
					<td class="metadata author">{file.userName}</td>
					<td class="metadata">{new Date(file.createdAt).toLocaleDateString()}</td>
					<td class="actions-cell"
						><div class="file-actions">
							<Button
								size="small"
								kind="ghost"
								icon={Download}
								iconDescription="Download {file.name}"
								portalTooltip
								href={`${resolve('/api/files')}?id=${encodeURIComponent(file.id)}`}
							/>
							<OverflowMenu size="sm" flipped portalMenu iconDescription="Actions for {file.name}">
								<OverflowMenuItem text={m.share_file()} on:click={() => onshare(file.id)} />
								{#if file.userId === userId}<OverflowMenuItem
										text="Delete file"
										danger
										hasDivider
										on:click={() => ondelete(file)}
									/>{/if}
							</OverflowMenu>
						</div></td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.file-table {
		/*
		 * Horizontal scrolling only. `overflow-y` must stay explicit: leaving it
		 * `visible` makes CSS coerce it to `auto`, so any absolutely positioned
		 * descendant (Carbon's icon-only button tooltips) adds a phantom vertical
		 * scrollbar — which in turn steals width and triggers a horizontal one.
		 * The row menus/tooltips are portalled, so nothing real gets clipped.
		 */
		overflow-x: auto;
		overflow-y: hidden;
		width: 100%;
	}
	.file-table:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: -2px;
	}
	table {
		width: 100%;
		min-width: 44rem;
	}
	table th {
		height: 2.5rem;
		background: var(--cds-ui-01);
		font-size: 0.75rem;
	}
	table td {
		height: 3.25rem;
		background: var(--cds-ui-background);
		border-bottom: 1px solid var(--cds-border-subtle);
	}
	table tbody tr:hover td,
	table tbody tr:focus-within td {
		background: var(--cds-hover-ui);
	}
	.name-cell {
		width: 45%;
	}
	.file-name {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.name-text {
		overflow-wrap: anywhere;
		min-width: 8rem;
		font-size: 0.875rem;
	}
	.file-icon {
		display: flex;
		flex-shrink: 0;
		color: var(--cds-icon-secondary);
	}
	.metadata {
		font-size: 0.8125rem;
		color: var(--cds-text-secondary);
		white-space: nowrap;
	}
	.author {
		white-space: normal;
		overflow-wrap: anywhere;
	}
	.file-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}
	.actions-cell {
		width: 6rem;
		padding: 0 1rem;
	}
</style>

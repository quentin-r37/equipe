<script lang="ts">
	import { Button, Tile } from 'carbon-components-svelte';
	import Download from 'carbon-icons-svelte/lib/Download.svelte';
	import WarningAlt from 'carbon-icons-svelte/lib/WarningAlt.svelte';
	import Document from 'carbon-icons-svelte/lib/Document.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1048576).toFixed(1)} MB`;
	}
</script>

<div class="share-page">
	<Tile class="share-card">
		{#if data.expired}
			<div class="share-state">
				<WarningAlt size={32} />
				<p>{m.share_expired()}</p>
			</div>
		{:else}
			<div class="share-state">
				<Document size={32} />
				<p class="share-name">{data.name}</p>
				<p class="share-meta">{formatSize(data.size)}</p>
				<Button
					icon={Download}
					iconDescription={m.share_download()}
					href={`/api/share/${data.token}`}>{m.share_download()}</Button
				>
			</div>
		{/if}
	</Tile>
</div>

<style>
	.share-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--cds-spacing-05);
		background: var(--cds-background);
	}

	.share-page :global(.share-card) {
		width: 100%;
		max-width: 24rem;
	}

	.share-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cds-spacing-04);
		text-align: center;
		padding: var(--cds-spacing-05) 0;
	}

	.share-state :global(svg) {
		color: var(--cds-icon-secondary);
	}

	.share-name {
		font-weight: 600;
		word-break: break-all;
	}

	.share-meta {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}
</style>

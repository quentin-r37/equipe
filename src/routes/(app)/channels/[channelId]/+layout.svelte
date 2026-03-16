<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LayoutServerData } from './$types';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';

	let { data, children }: { data: LayoutServerData; children: Snippet } = $props();

	const basePath = $derived(`/channels/${data.channel.id}`);

	function isActive(tabHref: string): boolean {
		if (tabHref === '') {
			return page.url.pathname === basePath || page.url.pathname === basePath + '/';
		}
		return page.url.pathname.startsWith(basePath + tabHref);
	}
</script>

<div class="channel-layout">
	<div class="channel-header">
		<h2># {data.channel.name}</h2>
		{#if data.channel.description}
			<p class="channel-desc">{data.channel.description}</p>
		{/if}
	</div>

	<nav class="tab-bar">
		<a href={basePath} class="tab" class:active={isActive('')}>
			<Chat size={16} />
			Chat
		</a>
		<a href="{basePath}/files" class="tab" class:active={isActive('/files')}>
			<DocumentMultiple01 size={16} />
			Files
		</a>
		<a href="{basePath}/meetings" class="tab" class:active={isActive('/meetings')}>
			<VideoChat size={16} />
			Meetings
		</a>
	</nav>

	<div class="tab-content">
		{@render children()}
	</div>
</div>

<style>
	.channel-layout {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 7rem);
	}

	@media (max-width: 672px) {
		.channel-layout {
			height: calc(100vh - 3rem);
			margin: calc(-1 * var(--cds-spacing-04));
		}

		.channel-header {
			padding: var(--cds-spacing-04) var(--cds-spacing-04);
		}

		.tab-bar {
			padding: 0 var(--cds-spacing-04);
		}
	}

	.channel-header {
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.channel-desc {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.tab-bar {
		display: flex;
		padding: 0 var(--cds-spacing-06);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.tab {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03) var(--cds-spacing-05);
		color: var(--cds-text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition:
			color 0.15s,
			border-color 0.15s;
	}

	.tab:hover {
		color: var(--cds-text-primary);
	}

	.tab.active {
		color: var(--cds-text-primary);
		border-bottom-color: var(--cds-link-primary);
	}

	.tab-content {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
</style>

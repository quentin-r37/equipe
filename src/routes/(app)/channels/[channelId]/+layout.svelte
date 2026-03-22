<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import type { LayoutServerData } from './$types';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import Edit from 'carbon-icons-svelte/lib/Edit.svelte';
	import Checkmark from 'carbon-icons-svelte/lib/Checkmark.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';

	let { data, children }: { data: LayoutServerData; children: Snippet } = $props();

	const basePath = $derived(`/channels/${data.channel.id}`);

	let isEditing = $state(false);
	let editName = $state('');

	const canRename = $derived(
		data.channel.createdBy === data.membership.userId ||
			data.membership.role === 'owner' ||
			data.membership.role === 'admin'
	);

	function startEditing() {
		editName = data.channel.name;
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		editName = data.channel.name;
	}

	function isActive(tabHref: string): boolean {
		if (tabHref === '') {
			return page.url.pathname === basePath || page.url.pathname === basePath + '/';
		}
		return page.url.pathname.startsWith(basePath + tabHref);
	}
</script>

<div class="channel-layout">
	<div class="channel-header">
		{#if isEditing}
			<form
				method="POST"
				action="{basePath}?/renameChannel"
				use:enhance={() => {
					return async ({ update }) => {
						isEditing = false;
						await update();
					};
				}}
				class="rename-form"
			>
				<span class="hash">#</span>
				<input
					type="text"
					name="name"
					bind:value={editName}
					class="rename-input"
					autofocus
					onkeydown={(e) => {
						if (e.key === 'Escape') cancelEditing();
					}}
				/>
				<button type="submit" class="icon-btn" aria-label="Save" disabled={!editName.trim()}>
					<Checkmark size={16} />
				</button>
				<button type="button" class="icon-btn" aria-label="Cancel" onclick={cancelEditing}>
					<Close size={16} />
				</button>
			</form>
		{:else}
			<div class="channel-title">
				<h2># {data.channel.name}</h2>
				{#if canRename}
					<button class="icon-btn edit-btn" aria-label="Rename channel" onclick={startEditing}>
						<Edit size={16} />
					</button>
				{/if}
			</div>
		{/if}
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

	.channel-title {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	.channel-title h2 {
		margin: 0;
	}

	.edit-btn {
		opacity: 0;
		transition: opacity 0.15s;
	}

	.channel-title:hover .edit-btn {
		opacity: 1;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: var(--cds-spacing-02);
		color: var(--cds-text-secondary);
		cursor: pointer;
		border-radius: 2px;
	}

	.icon-btn:hover {
		color: var(--cds-text-primary);
		background: var(--cds-layer-hover);
	}

	.icon-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.rename-form {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	.hash {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--cds-text-primary);
	}

	.rename-input {
		font-size: 1.25rem;
		font-weight: 600;
		background: var(--cds-field);
		border: 1px solid var(--cds-border-strong);
		border-bottom: 2px solid var(--cds-link-primary);
		color: var(--cds-text-primary);
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
		outline: none;
		min-width: 200px;
	}

	.rename-input:focus {
		border-bottom-color: var(--cds-focus);
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

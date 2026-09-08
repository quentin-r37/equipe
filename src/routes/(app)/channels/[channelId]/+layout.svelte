<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutServerData } from './$types';
	import { feedbackEnhance } from '$lib/forms';
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
	let renamePending = $state(false);
	let renameInput: HTMLInputElement | undefined = $state();

	const canRename = $derived(
		data.channel.createdBy === data.membership.userId ||
			data.membership.role === 'owner' ||
			data.membership.role === 'admin'
	);

	async function startEditing() {
		editName = data.channel.name;
		isEditing = true;
		await tick();
		renameInput?.select();
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
	<!--
		The channel name is the page title, so it gets the same treatment as every other page
		header in the shell: h1 scale on the page background, description underneath. The tab
		bar carries the hairline the shared `.page-header` rule would have drawn, and the tab
		content is the surface that sits under it.
	-->
	<header class="channel-chrome">
		<div class="channel-header">
			{#if isEditing}
				<form
					method="POST"
					action="{basePath}?/renameChannel"
					use:enhance={feedbackEnhance({
						pending: (v) => (renamePending = v),
						success: 'Channel renamed',
						onSuccess: () => (isEditing = false)
					})}
					class="channel-title"
				>
					<span class="rename-field">
						<span class="hash" aria-hidden="true">#</span>
						<input
							type="text"
							name="name"
							bind:value={editName}
							bind:this={renameInput}
							class="rename-input"
							aria-label="Channel name"
							disabled={renamePending}
							onkeydown={(e) => {
								if (e.key === 'Escape') cancelEditing();
							}}
						/>
					</span>
					<button
						type="submit"
						class="icon-btn"
						aria-label="Save"
						disabled={!editName.trim() || renamePending}
					>
						<Checkmark size={16} />
					</button>
					<button
						type="button"
						class="icon-btn"
						aria-label="Cancel"
						disabled={renamePending}
						onclick={cancelEditing}
					>
						<Close size={16} />
					</button>
				</form>
			{:else}
				<div class="channel-title">
					<h1><span class="hash" aria-hidden="true">#</span>{data.channel.name}</h1>
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

		<nav class="tab-bar" aria-label="Channel sections">
			<a
				href={basePath}
				class="tab"
				class:active={isActive('')}
				aria-current={isActive('') ? 'page' : undefined}
			>
				<Chat size={16} />
				Chat
			</a>
			<a
				href="{basePath}/files"
				class="tab"
				class:active={isActive('/files')}
				aria-current={isActive('/files') ? 'page' : undefined}
			>
				<DocumentMultiple01 size={16} />
				Files
			</a>
			<a
				href="{basePath}/meetings"
				class="tab"
				class:active={isActive('/meetings')}
				aria-current={isActive('/meetings') ? 'page' : undefined}
			>
				<VideoChat size={16} />
				Meetings
			</a>
		</nav>
	</header>

	<div class="tab-content">
		{@render children()}
	</div>
</div>

<style>
	.channel-layout {
		background: var(--cds-ui-background);
		display: flex;
		flex-direction: column;
		height: calc(100vh - 7rem);
		height: calc(100dvh - 7rem);
	}

	.channel-chrome {
		flex-shrink: 0;
	}

	.channel-header {
		padding-bottom: var(--cds-spacing-05);
	}

	/*
	 * Reading and renaming are the same row at the same size: both states sit on this box and
	 * share its type scale, so swapping the heading for a field cannot resize the header.
	 */
	.channel-title {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		min-height: 2.5rem;
	}

	.channel-title h1,
	.rename-field,
	.rename-input {
		/* The shared page-header scale, so a channel is titled like every other page. */
		font-size: clamp(1.5rem, 2vw, 2rem);
		font-weight: 400;
		line-height: 1.2;
	}

	.channel-title h1 {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	/* Same treatment as the channel links on the dashboard. */
	.hash {
		color: var(--cds-text-secondary);
		margin-right: 0.375rem;
	}

	.rename-field {
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
		max-width: 28rem;
	}

	.rename-input {
		flex: 1;
		min-width: 0;
		background: var(--cds-field);
		border: none;
		border-bottom: 2px solid var(--cds-link-primary);
		color: var(--cds-text-primary);
		padding: var(--cds-spacing-02);
		outline: none;
		/* Cancels the field's own inset so the name does not jump when editing starts. */
		margin-left: calc(-1 * var(--cds-spacing-02));
	}

	.rename-input:focus {
		border-bottom-color: var(--cds-focus);
	}

	.channel-desc {
		margin-top: var(--cds-spacing-03);
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		overflow-wrap: anywhere;
	}

	.edit-btn {
		opacity: 0;
		transition: opacity var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	.channel-title:hover .edit-btn,
	.edit-btn:focus-visible {
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

	/*
	 * The bar's hairline is the one the shared `.page-header` rule draws under a page title;
	 * here it doubles as the rail the active tab's marker sits on. Tabs are spaced by a gap
	 * rather than padded, so the first label starts on the same left edge as the title.
	 */
	.tab-bar {
		display: flex;
		gap: var(--cds-spacing-06);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.tab {
		min-height: 2.5rem;
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03) 0;
		margin-bottom: -1px;
		color: var(--cds-text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		border-bottom: 2px solid transparent;
		transition:
			color var(--cds-duration-fast-02) var(--cds-motion-standard-productive),
			border-color var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
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

	.tab:focus-visible,
	.icon-btn:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: -2px;
	}

	@media (hover: none) {
		.edit-btn {
			opacity: 1;
		}
	}

	@media (max-width: 672px) {
		.channel-layout {
			height: calc(100vh - 3rem);
			/* Leave room for the docked meeting bar so it never covers the composer. */
			height: calc(100dvh - 3rem - var(--meeting-dock-height));
			margin: calc(-1 * var(--cds-spacing-04));
			/* The layout is full-bleed, so it cancels the shell's dock padding itself. */
			margin-bottom: calc(-1 * var(--cds-spacing-04) - var(--meeting-dock-height));
		}

		/* The layout is full-bleed here, so the chrome re-adds the inset the shell dropped. */
		.channel-header {
			padding: var(--cds-spacing-04) var(--cds-spacing-04) var(--cds-spacing-04);
		}

		.tab-bar {
			gap: var(--cds-spacing-05);
			padding: 0 var(--cds-spacing-04);
		}
	}
</style>

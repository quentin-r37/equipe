<script lang="ts">
	import { Button } from 'carbon-components-svelte';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { notificationState } from '$lib/stores/notifications.svelte';

	let { onnavigate }: { onnavigate: () => void } = $props();
</script>

<section class="notification-panel equipe-motion-fade" aria-label="Notification history">
	<h2>Notifications</h2>
	<p class="summary">
		{notificationState.unreadCount} unread · Latest 100 notifications this session
	</p>
	<Button
		kind="ghost"
		size="small"
		disabled={!notificationState.unreadCount}
		on:click={() => notificationState.clearAll()}>Mark all as read</Button
	>
	{#if notificationState.permissionState === 'default'}
		<Button kind="ghost" size="small" on:click={() => notificationState.requestPermission()}>
			Enable desktop notifications
		</Button>
	{/if}
	{#if notificationState.history.length === 0}
		<p class="empty">You're all caught up. New notifications will appear here.</p>
	{:else}
		<ul>
			{#each notificationState.history as n (n.id)}
				<li class:unread={!n.read}>
					<a
						href={resolve(n.href as Pathname)}
						onclick={() => {
							notificationState.markRead(n.id);
							onnavigate();
						}}
					>
						<strong>{n.userName} · {n.channelName ?? n.meetingTitle ?? n.teamName}</strong>
						<span>{n.preview}</span>
						<small>{!n.read ? 'Unread · ' : ''}{new Date(n.createdAt).toLocaleString()}</small>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.notification-panel {
		padding: var(--cds-spacing-05);
		color: var(--cds-text-primary);
	}
	h2 {
		font-size: 1.25rem;
		margin-bottom: var(--cds-spacing-03);
	}
	.summary,
	small {
		color: var(--cds-text-secondary);
		font-size: 0.75rem;
	}
	.empty {
		padding-block: var(--cds-spacing-05);
	}
	ul {
		list-style: none;
		padding: 0;
		margin-top: var(--cds-spacing-04);
	}
	li {
		border-bottom: 1px solid var(--cds-border-subtle);
		border-left: 3px solid transparent;
	}
	li.unread {
		border-left-color: var(--cds-link-primary);
		background: var(--cds-layer-selected-01);
	}
	a {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-02);
		padding: var(--cds-spacing-04);
		color: inherit;
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	a:hover {
		background: var(--cds-layer-hover-01);
	}
	a:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: -2px;
	}
</style>

<script lang="ts">
	import { Button, Select, SelectItem } from 'carbon-components-svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import ChatPanel from './ChatPanel.svelte';

	let {
		channels,
		userId,
		onclose
	}: {
		channels: { id: string; name: string }[];
		userId: string;
		onclose: () => void;
	} = $props();

	let selectedChannelId = $state('');
	let initialized = false;

	$effect(() => {
		if (!initialized && channels.length > 0) {
			selectedChannelId = channels[0].id;
			initialized = true;
		}
	});
</script>

<div class="meeting-chat">
	<div class="chat-header">
		<Select bind:selected={selectedChannelId} hideLabel labelText="Channel" size="sm" noLabel>
			{#each channels as ch (ch.id)}
				<SelectItem value={ch.id} text="# {ch.name}" />
			{/each}
		</Select>
		<Button
			icon={Close}
			iconDescription="Close chat"
			kind="ghost"
			size="small"
			on:click={onclose}
		/>
	</div>

	{#if selectedChannelId}
		{#key selectedChannelId}
			<ChatPanel channelId={selectedChannelId} {userId} compact />
		{/key}
	{/if}
</div>

<style>
	.meeting-chat {
		display: flex;
		flex-direction: column;
		width: 320px;
		height: 100%;
		border-left: 1px solid var(--cds-border-subtle);
		background: var(--cds-layer-01);
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.chat-header :global(.bx--select) {
		flex: 1;
	}
</style>

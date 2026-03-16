<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, TextInput, Tile, Modal, Select, SelectItem, Tag } from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from '../$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();

	let showModal = $state(false);
</script>

<div class="page-header">
	<h1>Meetings</h1>
	<Button icon={Add} on:click={() => (showModal = true)}>New Meeting</Button>
</div>

{#if data.meetings.length === 0}
	<Tile>
		<p class="empty-state">No meetings yet. Create one to start a video call.</p>
	</Tile>
{:else}
	<div class="meeting-list">
		{#each data.meetings as m (m.id)}
			<Tile>
				<div class="meeting-row">
					<div>
						<h3>{m.title}</h3>
						<p class="meeting-date">{new Date(m.createdAt).toLocaleString()}</p>
					</div>
					<div class="meeting-actions">
						<Tag type={m.status === 'active' ? 'green' : 'gray'}>
							{m.status}
						</Tag>
						{#if m.status === 'active'}
							<Button size="small" icon={VideoChat} href="/meetings/{m.id}">Join</Button>
						{/if}
					</div>
				</div>
			</Tile>
		{/each}
	</div>
{/if}

<Modal
	bind:open={showModal}
	modalHeading="New Meeting"
	primaryButtonText="Start"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showModal = false)}
	on:submit={() => {
		const form = document.getElementById('create-meeting-form') as HTMLFormElement;
		form?.requestSubmit();
	}}
>
	<form id="create-meeting-form" method="post" action="?/create" use:enhance>
		<div class="form-field">
			<TextInput
				name="title"
				labelText="Meeting title"
				placeholder="e.g., Weekly Standup"
				required
			/>
		</div>
		<Select name="teamId" labelText="Team">
			{#each data.teams as t (t.id)}
				<SelectItem value={t.id} text={t.name} />
			{/each}
		</Select>
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
		padding: var(--cds-spacing-07) 0;
		color: var(--cds-text-secondary);
	}

	.meeting-list {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
	}

	.meeting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h3 {
		font-weight: 600;
	}

	.meeting-date {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.meeting-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
	}

	.form-field {
		margin-bottom: var(--cds-spacing-05);
	}
</style>

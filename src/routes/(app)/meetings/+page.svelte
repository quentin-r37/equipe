<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		Tile,
		DataTable,
		Modal,
		Select,
		SelectItem,
		Tag
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from '../$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();

	let showModal = $state(false);

	const headers = [
		{ key: 'title', value: 'Title' },
		{ key: 'status', value: 'Status' },
		{ key: 'createdAt', value: 'Created' },
		{ key: 'actions', value: '' }
	];

	const rows = $derived(
		data.meetings.map((m) => ({
			id: m.id,
			title: m.title,
			status: m.status,
			createdAt: new Date(m.createdAt).toLocaleString()
		}))
	);
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Meetings</h1>
	<Button icon={Add} on:click={() => (showModal = true)}>New Meeting</Button>
</div>

{#if data.meetings.length === 0}
	<Tile class="text-center">
		<p class="py-8 text-gray-500">No meetings yet. Create one to start a video call.</p>
	</Tile>
{:else}
	<div class="space-y-3">
		{#each data.meetings as m (m.id)}
			<Tile class="flex items-center justify-between">
				<div>
					<h3 class="font-semibold">{m.title}</h3>
					<p class="text-sm text-gray-500">{new Date(m.createdAt).toLocaleString()}</p>
				</div>
				<div class="flex items-center gap-3">
					<Tag type={m.status === 'active' ? 'green' : 'gray'}>
						{m.status}
					</Tag>
					{#if m.status === 'active'}
						<Button size="small" icon={VideoChat} href="/meetings/{m.id}">Join</Button>
					{/if}
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
		<div class="mb-4">
			<TextInput name="title" labelText="Meeting title" placeholder="e.g., Weekly Standup" required />
		</div>
		<Select name="teamId" labelText="Team">
			{#each data.teams as t (t.id)}
				<SelectItem value={t.id} text={t.name} />
			{/each}
		</Select>
	</form>
</Modal>

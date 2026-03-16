<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		Tile,
		Modal,
		InlineNotification,
		Select,
		SelectItem
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from './$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();

	let showTeamModal = $state(false);
	let showChannelModal = $state(false);
</script>

<div class="mb-6">
	<h1 class="text-3xl font-semibold">Welcome, {data.user.name}</h1>
	<p class="mt-1 text-gray-500">Your collaboration hub</p>
</div>

<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
	<!-- Teams section -->
	<Tile>
		<h3 class="mb-4 text-lg font-semibold">Teams</h3>
		{#if data.teams.length === 0}
			<p class="mb-4 text-gray-500">No teams yet. Create one to get started.</p>
		{:else}
			<ul class="mb-4 space-y-2">
				{#each data.teams as t (t.id)}
					<li class="rounded bg-gray-50 p-3">
						<span class="font-medium">{t.name}</span>
						{#if t.description}
							<span class="block text-sm text-gray-500">{t.description}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<Button size="small" icon={Add} on:click={() => (showTeamModal = true)}>Create Team</Button>
	</Tile>

	<!-- Channels section -->
	<Tile>
		<h3 class="mb-4 text-lg font-semibold">Channels</h3>
		{#if data.channels.length === 0}
			<p class="mb-4 text-gray-500">No channels yet.</p>
		{:else}
			<ul class="mb-4 space-y-2">
				{#each data.channels as ch (ch.id)}
					<li class="rounded bg-gray-50 p-3">
						<a href="/channels/{ch.id}" class="font-medium text-blue-600 hover:underline">
							# {ch.name}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
		{#if data.teams.length > 0}
			<Button size="small" icon={Add} on:click={() => (showChannelModal = true)}>
				Create Channel
			</Button>
		{/if}
	</Tile>

	<!-- Active Meetings -->
	<Tile>
		<h3 class="mb-4 text-lg font-semibold">Active Meetings</h3>
		{#if data.activeMeetings.length === 0}
			<p class="mb-4 text-gray-500">No active meetings.</p>
		{:else}
			<ul class="mb-4 space-y-2">
				{#each data.activeMeetings as m (m.id)}
					<li class="rounded bg-gray-50 p-3">
						<a href="/meetings/{m.id}" class="font-medium text-blue-600 hover:underline">
							{m.title}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
		<Button size="small" icon={Add} href="/meetings">New Meeting</Button>
	</Tile>
</div>

<!-- Create Team Modal -->
<Modal
	bind:open={showTeamModal}
	modalHeading="Create Team"
	primaryButtonText="Create"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showTeamModal = false)}
	on:submit={() => {
		const form = document.getElementById('create-team-form') as HTMLFormElement;
		form?.requestSubmit();
		showTeamModal = false;
	}}
>
	<form id="create-team-form" method="post" action="?/createTeam" use:enhance>
		<div class="mb-4">
			<TextInput name="name" labelText="Team name" placeholder="e.g., Engineering" required />
		</div>
		<TextInput name="description" labelText="Description" placeholder="What is this team about?" />
	</form>
</Modal>

<!-- Create Channel Modal -->
<Modal
	bind:open={showChannelModal}
	modalHeading="Create Channel"
	primaryButtonText="Create"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showChannelModal = false)}
	on:submit={() => {
		const form = document.getElementById('create-channel-form') as HTMLFormElement;
		form?.requestSubmit();
		showChannelModal = false;
	}}
>
	<form id="create-channel-form" method="post" action="?/createChannel" use:enhance>
		<div class="mb-4">
			<Select name="teamId" labelText="Team">
				{#each data.teams as t (t.id)}
					<SelectItem value={t.id} text={t.name} />
				{/each}
			</Select>
		</div>
		<TextInput name="name" labelText="Channel name" placeholder="e.g., design-review" required />
	</form>
</Modal>

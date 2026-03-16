<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		Tile,
		Modal,
		Select,
		SelectItem,
		Grid,
		Row,
		Column
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from './$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();

	let showTeamModal = $state(false);
	let showChannelModal = $state(false);
</script>

<div class="page-header">
	<h1>Welcome, {data.user.name}</h1>
	<p class="subtitle">Your collaboration hub</p>
</div>

<Grid fullWidth>
	<Row>
		<Column sm={4} md={4} lg={5} padding>
			<Tile>
				<h3>Teams</h3>
				{#if data.teams.length === 0}
					<p class="empty-text">No teams yet. Create one to get started.</p>
				{:else}
					<ul class="tile-list">
						{#each data.teams as t (t.id)}
							<li class="tile-list-item">
								<div class="item-row">
									<div>
										<span class="item-name">{t.name}</span>
										{#if t.description}
											<span class="item-desc">{t.description}</span>
										{/if}
									</div>
									<form method="post" action="?/deleteTeam" use:enhance>
										<input type="hidden" name="teamId" value={t.id} />
										<Button
											size="small"
											kind="danger-ghost"
											icon={TrashCan}
											iconDescription="Delete team"
											type="submit"
										/>
									</form>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
				<Button size="small" icon={Add} on:click={() => (showTeamModal = true)}>
					Create Team
				</Button>
			</Tile>
		</Column>

		<Column sm={4} md={4} lg={5} padding>
			<Tile>
				<h3>Channels</h3>
				{#if data.channels.length === 0}
					<p class="empty-text">No channels yet.</p>
				{:else}
					<ul class="tile-list">
						{#each data.channels as ch (ch.id)}
							<li class="tile-list-item">
								<div class="item-row">
									<a href="/channels/{ch.id}">
										# {ch.name}
									</a>
									<form method="post" action="?/deleteChannel" use:enhance>
										<input type="hidden" name="channelId" value={ch.id} />
										<Button
											size="small"
											kind="danger-ghost"
											icon={TrashCan}
											iconDescription="Delete channel"
											type="submit"
										/>
									</form>
								</div>
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
		</Column>

		<Column sm={4} md={8} lg={6} padding>
			<Tile>
				<h3>Active Meetings</h3>
				{#if data.activeMeetings.length === 0}
					<p class="empty-text">No active meetings.</p>
				{:else}
					<ul class="tile-list">
						{#each data.activeMeetings as m (m.id)}
							<li class="tile-list-item">
								<a href="/meetings/{m.id}">
									{m.title}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
				<Button size="small" icon={Add} href="/meetings">New Meeting</Button>
			</Tile>
		</Column>
	</Row>
</Grid>

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
		<div class="form-field">
			<TextInput name="name" labelText="Team name" placeholder="e.g., Engineering" required />
		</div>
		<TextInput
			name="description"
			labelText="Description"
			placeholder="What is this team about?"
		/>
	</form>
</Modal>

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
		<div class="form-field">
			<Select name="teamId" labelText="Team">
				{#each data.teams as t (t.id)}
					<SelectItem value={t.id} text={t.name} />
				{/each}
			</Select>
		</div>
		<TextInput
			name="name"
			labelText="Channel name"
			placeholder="e.g., design-review"
			required
		/>
	</form>
</Modal>

<style>
	.page-header {
		margin-bottom: var(--cds-spacing-07);
	}

	.subtitle {
		margin-top: var(--cds-spacing-03);
		color: var(--cds-text-secondary);
	}

	h3 {
		margin-bottom: var(--cds-spacing-05);
	}

	.empty-text {
		margin-bottom: var(--cds-spacing-05);
		color: var(--cds-text-secondary);
	}

	.tile-list {
		margin-bottom: var(--cds-spacing-05);
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
	}

	.tile-list-item {
		padding: var(--cds-spacing-04);
		background: var(--cds-layer-01);
		border-radius: 4px;
	}

	.item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.item-name {
		font-weight: 500;
	}

	.item-desc {
		display: block;
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.tile-list-item a {
		font-weight: 500;
	}

	.tile-list-item a:hover {
		text-decoration: underline;
	}

	.form-field {
		margin-bottom: var(--cds-spacing-05);
	}
</style>

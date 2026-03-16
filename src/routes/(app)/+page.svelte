<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		Tile,
		ClickableTile,
		Modal,
		Select,
		SelectItem,
		Grid,
		Row,
		Column,
		Tag
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import Group from 'carbon-icons-svelte/lib/Group.svelte';
	import UserFollow from 'carbon-icons-svelte/lib/UserFollow.svelte';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import ArrowRight from 'carbon-icons-svelte/lib/ArrowRight.svelte';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from './$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();

	let showTeamModal = $state(false);
	let showChannelModal = $state(false);
	let showAddMemberModal = $state(false);
	let addMemberTeamId = $state('');

	// Delete confirmation state
	let deleteTarget = $state<{ type: 'team' | 'channel'; id: string; name: string } | null>(null);
	let showDeleteConfirm = $state(false);

	function confirmDelete(type: 'team' | 'channel', id: string, name: string) {
		deleteTarget = { type, id, name };
		showDeleteConfirm = true;
	}

	function openAddMember(teamId: string) {
		addMemberTeamId = teamId;
		showAddMemberModal = true;
	}

	// Group channels by team
	const channelsByTeam = $derived(
		data.teams.map((t) => ({
			...t,
			channels: data.channels.filter((c) => c.teamId === t.id),
			memberCount: data.memberCounts[t.id] ?? 0
		}))
	);

	// Format relative time
	function timeAgo(date: Date | string): string {
		const now = Date.now();
		const then = new Date(date).getTime();
		const diff = Math.floor((now - then) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	// Truncate message content
	function truncate(text: string, max: number): string {
		return text.length > max ? text.slice(0, max) + '...' : text;
	}

	// Get channel name by id
	function channelName(channelId: string): string {
		const ch = data.channels.find((c) => c.id === channelId);
		return ch ? `#${ch.name}` : '';
	}
</script>

<div class="page-header">
	<h1>Welcome, {data.user.name}</h1>
	<p class="subtitle">Your collaboration hub</p>
</div>

<!-- Stats overview -->
<Grid fullWidth>
	<Row>
		<Column sm={2} md={2} lg={4} padding>
			<Tile class="stat-tile">
				<div class="stat">
					<Group size={24} />
					<div>
						<span class="stat-value">{data.teams.length}</span>
						<span class="stat-label">{data.teams.length === 1 ? 'Team' : 'Teams'}</span>
					</div>
				</div>
			</Tile>
		</Column>
		<Column sm={2} md={2} lg={4} padding>
			<Tile class="stat-tile">
				<div class="stat">
					<Chat size={24} />
					<div>
						<span class="stat-value">{data.channels.length}</span>
						<span class="stat-label">{data.channels.length === 1 ? 'Channel' : 'Channels'}</span>
					</div>
				</div>
			</Tile>
		</Column>
		<Column sm={2} md={2} lg={4} padding>
			<Tile class="stat-tile">
				<div class="stat">
					<VideoChat size={24} />
					<div>
						<span class="stat-value">{data.activeMeetings.length}</span>
						<span class="stat-label"
							>Active {data.activeMeetings.length === 1 ? 'Meeting' : 'Meetings'}</span
						>
					</div>
				</div>
			</Tile>
		</Column>
		<Column sm={2} md={2} lg={4} padding>
			<Tile class="stat-tile">
				<div class="stat">
					<DocumentMultiple01 size={24} />
					<div>
						<span class="stat-value">{data.fileCount}</span>
						<span class="stat-label">{data.fileCount === 1 ? 'File' : 'Files'}</span>
					</div>
				</div>
			</Tile>
		</Column>
	</Row>
</Grid>

<!-- Main content -->
<Grid fullWidth>
	<Row>
		<!-- Teams & Channels -->
		<Column sm={4} md={8} lg={10} padding>
			<div class="section-header">
				<h3>Teams & Channels</h3>
				<div class="section-actions">
					{#if data.teams.length > 0}
						<Button size="small" kind="ghost" icon={Add} on:click={() => (showChannelModal = true)}>
							Channel
						</Button>
					{/if}
					<Button size="small" icon={Add} on:click={() => (showTeamModal = true)}>Team</Button>
				</div>
			</div>

			{#if channelsByTeam.length === 0}
				<Tile>
					<div class="empty-state">
						<Group size={32} />
						<h4>No teams yet</h4>
						<p>Create your first team to start collaborating with your colleagues.</p>
						<Button icon={Add} on:click={() => (showTeamModal = true)}>Create Team</Button>
					</div>
				</Tile>
			{:else}
				<div class="teams-grid">
					{#each channelsByTeam as t (t.id)}
						<Tile class="team-card">
							<div class="team-header">
								<div class="team-info">
									<h4 class="team-name"><a href="/teams/{t.id}">{t.name}</a></h4>
									<div class="team-meta">
										<Tag size="sm" type="cool-gray">
											{t.memberCount}
											{t.memberCount === 1 ? 'member' : 'members'}
										</Tag>
										<Tag size="sm" type="outline">
											{t.channels.length}
											{t.channels.length === 1 ? 'channel' : 'channels'}
										</Tag>
									</div>
								</div>
								<div class="team-actions">
								<Button
									size="small"
									kind="ghost"
									icon={UserFollow}
									iconDescription="Add member"
									on:click={() => openAddMember(t.id)}
								/>
								<Button
									size="small"
									kind="danger-ghost"
									icon={TrashCan}
									iconDescription="Delete team"
									on:click={() => confirmDelete('team', t.id, t.name)}
								/>
							</div>
							</div>
							{#if t.description}
								<p class="team-description">{t.description}</p>
							{/if}
							<div class="channel-list">
								{#each t.channels as ch (ch.id)}
									<div class="channel-item">
										<a href="/channels/{ch.id}" class="channel-link">
											<span class="channel-hash">#</span>
											{ch.name}
										</a>
										<Button
											size="small"
											kind="ghost"
											icon={TrashCan}
											iconDescription="Delete channel"
											on:click={() => confirmDelete('channel', ch.id, ch.name)}
										/>
									</div>
								{/each}
								{#if t.channels.length === 0}
									<p class="empty-text-inline">No channels yet</p>
								{/if}
							</div>
						</Tile>
					{/each}
				</div>
			{/if}
		</Column>

		<!-- Right sidebar: Meetings + Recent Activity -->
		<Column sm={4} md={8} lg={6} padding>
			<!-- Active Meetings -->
			<div class="section-header">
				<h3>Active Meetings</h3>
				<Button size="small" icon={Add} href="/meetings">New</Button>
			</div>

			{#if data.activeMeetings.length === 0}
				<Tile>
					<div class="empty-state-small">
						<VideoChat size={32} />
						<p>No active meetings right now.</p>
						<Button size="small" kind="ghost" icon={ArrowRight} href="/meetings">
							Go to Meetings
						</Button>
					</div>
				</Tile>
			{:else}
				<div class="meeting-list">
					{#each data.activeMeetings as m (m.id)}
						<ClickableTile href="/meetings/{m.id}">
							<div class="meeting-item">
								<div class="meeting-dot"></div>
								<div>
									<span class="meeting-title">{m.title}</span>
									<span class="meeting-time">Started {timeAgo(m.createdAt)}</span>
								</div>
							</div>
						</ClickableTile>
					{/each}
				</div>
			{/if}

			<!-- Recent Activity -->
			{#if data.recentMessages.length > 0}
				<div class="section-header" style="margin-top: var(--cds-spacing-07);">
					<h3>Recent Activity</h3>
				</div>
				<Tile>
					<ul class="activity-list">
						{#each data.recentMessages as msg (msg.id)}
							<li class="activity-item">
								<a href="/channels/{msg.channelId}" class="activity-link">
									<div class="activity-header">
										<span class="activity-user">{msg.userName}</span>
										<span class="activity-channel">{channelName(msg.channelId)}</span>
										<span class="activity-time">{timeAgo(msg.createdAt)}</span>
									</div>
									<p class="activity-content">{truncate(msg.content, 100)}</p>
								</a>
							</li>
						{/each}
					</ul>
				</Tile>
			{/if}
		</Column>
	</Row>
</Grid>

<!-- Delete confirmation modal -->
<Modal
	bind:open={showDeleteConfirm}
	danger
	modalHeading="Delete {deleteTarget?.type === 'team' ? 'Team' : 'Channel'}"
	primaryButtonText="Delete"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showDeleteConfirm = false)}
	on:submit={() => {
		if (deleteTarget) {
			const form = document.getElementById(
				`delete-${deleteTarget.type}-${deleteTarget.id}`
			) as HTMLFormElement;
			form?.requestSubmit();
		}
		showDeleteConfirm = false;
	}}
>
	<p>
		Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
		{#if deleteTarget?.type === 'team'}
			This will permanently delete all channels, messages, meetings, and files in this team.
		{:else}
			This will permanently delete all messages in this channel.
		{/if}
	</p>
</Modal>

<!-- Hidden delete forms -->
{#each data.teams as t (t.id)}
	<form
		id="delete-team-{t.id}"
		method="post"
		action="?/deleteTeam"
		use:enhance
		style="display:none"
	>
		<input type="hidden" name="teamId" value={t.id} />
	</form>
{/each}
{#each data.channels as ch (ch.id)}
	<form
		id="delete-channel-{ch.id}"
		method="post"
		action="?/deleteChannel"
		use:enhance
		style="display:none"
	>
		<input type="hidden" name="channelId" value={ch.id} />
	</form>
{/each}

<!-- Create Team modal -->
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
		<TextInput name="description" labelText="Description" placeholder="What is this team about?" />
	</form>
</Modal>

<!-- Create Channel modal -->
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
		<TextInput name="name" labelText="Channel name" placeholder="e.g., design-review" required />
	</form>
</Modal>

<!-- Add Member modal -->
<Modal
	bind:open={showAddMemberModal}
	modalHeading="Add Member"
	primaryButtonText="Add"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showAddMemberModal = false)}
	on:submit={() => {
		const form = document.getElementById('add-member-form') as HTMLFormElement;
		form?.requestSubmit();
		showAddMemberModal = false;
	}}
>
	<form id="add-member-form" method="post" action="?/addMember" use:enhance>
		<input type="hidden" name="teamId" value={addMemberTeamId} />
		<TextInput
			name="email"
			labelText="User email"
			placeholder="colleague@example.com"
			required
			type="email"
		/>
	</form>
</Modal>

<style>
	.page-header {
		margin-bottom: var(--cds-spacing-07);
	}

	.subtitle {
		margin-top: var(--cds-spacing-02);
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}

	/* Stats */
	:global(.stat-tile) {
		min-height: auto !important;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
	}

	.stat-value {
		display: block;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Section header */
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--cds-spacing-05);
	}

	.section-header h3 {
		margin: 0;
	}

	.section-actions {
		display: flex;
		gap: var(--cds-spacing-02);
	}

	/* Teams grid */
	.teams-grid {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
	}

	:global(.team-card) {
		padding: var(--cds-spacing-05) !important;
	}

	.team-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.team-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.team-actions {
		display: flex;
		gap: var(--cds-spacing-01);
	}

	.team-name {
		margin: 0;
		font-size: 1rem;
	}

	.team-name a {
		color: inherit;
		text-decoration: none;
	}

	.team-name a:hover {
		color: var(--cds-link-primary);
	}

	.team-meta {
		display: flex;
		gap: var(--cds-spacing-02);
	}

	.team-description {
		margin-top: var(--cds-spacing-03);
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}

	.channel-list {
		margin-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
		padding-top: var(--cds-spacing-04);
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-02);
	}

	.channel-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
		border-radius: 4px;
		transition: background 0.15s;
	}

	.channel-item:hover {
		background: var(--cds-layer-01);
	}

	.channel-link {
		font-weight: 500;
		text-decoration: none;
		color: inherit;
	}

	.channel-link:hover {
		color: var(--cds-link-primary);
	}

	.channel-hash {
		color: var(--cds-text-secondary);
		margin-right: var(--cds-spacing-01);
	}

	.empty-text-inline {
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
		padding: var(--cds-spacing-02) var(--cds-spacing-03);
	}

	/* Empty states */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-08) var(--cds-spacing-05);
		color: var(--cds-text-secondary);
	}

	.empty-state h4 {
		color: var(--cds-text-primary, #161616);
		margin: 0;
	}

	.empty-state p {
		max-width: 320px;
		margin: 0;
	}

	.empty-state-small {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-05);
		color: var(--cds-text-secondary);
	}

	.empty-state-small p {
		margin: 0;
		font-size: 0.875rem;
	}

	/* Meetings */
	.meeting-list {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.meeting-item {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
	}

	.meeting-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #24a148;
		flex-shrink: 0;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}

	.meeting-title {
		display: block;
		font-weight: 500;
	}

	.meeting-time {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	/* Recent Activity */
	.activity-list {
		display: flex;
		flex-direction: column;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.activity-item {
		padding: var(--cds-spacing-03) 0;
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.activity-item:last-child {
		border-bottom: none;
	}

	.activity-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.activity-link:hover .activity-content {
		color: var(--cds-link-primary);
	}

	.activity-header {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		margin-bottom: var(--cds-spacing-01);
	}

	.activity-user {
		font-weight: 600;
		font-size: 0.8125rem;
	}

	.activity-channel {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	.activity-time {
		font-size: 0.75rem;
		color: var(--cds-text-helper);
		margin-left: auto;
	}

	.activity-content {
		font-size: 0.8125rem;
		color: var(--cds-text-secondary);
		margin: 0;
		transition: color 0.15s;
	}

	/* Forms */
	.form-field {
		margin-bottom: var(--cds-spacing-05);
	}
</style>

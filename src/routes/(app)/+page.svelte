<script lang="ts">
	import LabeledButton from '$lib/components/LabeledButton.svelte';
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
		Tag,
		InlineNotification
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import Group from 'carbon-icons-svelte/lib/Group.svelte';
	import UserFollow from 'carbon-icons-svelte/lib/UserFollow.svelte';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import ArrowRight from 'carbon-icons-svelte/lib/ArrowRight.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { feedbackEnhance } from '$lib/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Create / add modals: stay open until the server confirms success ──
	let showTeamModal = $state(false);
	let teamPending = $state(false);
	let teamError = $state('');

	let showChannelModal = $state(false);
	let channelPending = $state(false);
	let channelError = $state('');

	let showAddMemberModal = $state(false);
	let addMemberTeamId = $state('');
	let memberPending = $state(false);
	let memberError = $state('');

	// ── Delete confirmation ──
	let deleteTarget = $state<{ type: 'team' | 'channel'; id: string; name: string } | null>(null);
	let showDeleteConfirm = $state(false);

	function confirmDelete(type: 'team' | 'channel', id: string, name: string) {
		deleteTarget = { type, id, name };
		showDeleteConfirm = true;
	}

	function openAddMember(teamId: string) {
		addMemberTeamId = teamId;
		memberError = '';
		showAddMemberModal = true;
	}

	function submitForm(id: string) {
		(document.getElementById(id) as HTMLFormElement | null)?.requestSubmit();
	}

	// ── Permissions (mirrors the server checks so users only see actions they can perform) ──
	const canDeleteTeam = (teamId: string) => data.roles[teamId] === 'owner';
	const canManageMembers = (teamId: string) =>
		data.roles[teamId] === 'owner' || data.roles[teamId] === 'admin';
	const canDeleteChannel = (ch: { teamId: string; createdBy: string }) =>
		ch.createdBy === data.user.id || canManageMembers(ch.teamId);

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

<svelte:head>
	<title>Dashboard · Equipe</title>
</svelte:head>

<div class="page-header">
	<div class="welcome-copy">
		<p class="eyebrow">Your workspace</p>
		<h1>Welcome, {data.user.name || data.user.email}</h1>
		<p class="subtitle">A shared space for your teams, conversations and ideas.</p>
	</div>
	<div class="welcome-art" aria-hidden="true">
		<div><Group size={32} /></div>
		<div><Chat size={32} /></div>
		<div><VideoChat size={32} /></div>
	</div>
</div>

{#if data.teams.length > 0}
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
{/if}

<!-- Main content -->
<Grid fullWidth>
	<Row>
		<!-- Teams & Channels -->
		<Column sm={4} md={8} lg={10} padding>
			<div class="section-header">
				<h2 class="section-title">Teams & Channels</h2>
				<div class="section-actions">
					{#if data.teams.length > 0}
						<LabeledButton
							size="small"
							kind="ghost"
							icon={Add}
							tooltip="Add channel"
							onclick={() => {
								channelError = '';
								showChannelModal = true;
							}}
						>
							Channel
						</LabeledButton>
					{/if}
					<LabeledButton
						size="small"
						icon={Add}
						tooltip="Create team"
						onclick={() => {
							teamError = '';
							showTeamModal = true;
						}}>Team</LabeledButton
					>
				</div>
			</div>

			{#if channelsByTeam.length === 0}
				<Tile>
					<div class="empty-state">
						<Group size={32} />
						<h3>No teams yet</h3>
						<p>Create your first team to start collaborating with your colleagues.</p>
						<LabeledButton
							icon={Add}
							tooltip="Create team"
							onclick={() => {
								teamError = '';
								showTeamModal = true;
							}}>Create Team</LabeledButton
						>
					</div>
				</Tile>
			{:else}
				<div class="teams-grid">
					{#each channelsByTeam as t (t.id)}
						<Tile class="team-card">
							<div class="team-header">
								<span class="team-avatar" aria-hidden="true"
									>{t.name.slice(0, 2).toUpperCase()}</span
								>
								<div class="team-info">
									<h3 class="team-name"><a href="/teams/{t.id}">{t.name}</a></h3>
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
									{#if canManageMembers(t.id)}
										<Button
											size="small"
											kind="ghost"
											icon={UserFollow}
											iconDescription="Add member to {t.name}"
											on:click={() => openAddMember(t.id)}
										/>
									{/if}
									{#if canDeleteTeam(t.id)}
										<Button
											size="small"
											kind="danger-ghost"
											icon={TrashCan}
											iconDescription="Delete team {t.name}"
											on:click={() => confirmDelete('team', t.id, t.name)}
										/>
									{/if}
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
										{#if canDeleteChannel(ch)}
											<Button
												size="small"
												kind="ghost"
												icon={TrashCan}
												iconDescription="Delete channel #{ch.name}"
												on:click={() => confirmDelete('channel', ch.id, ch.name)}
											/>
										{/if}
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
				<h2 class="section-title">Active Meetings</h2>
				{#if data.teams.length > 0}
					<LabeledButton size="small" icon={Add} tooltip="New meeting" href="/meetings"
						>New</LabeledButton
					>
				{/if}
			</div>

			{#if data.activeMeetings.length === 0}
				<Tile>
					<div class="empty-state-small">
						<VideoChat size={32} />
						<p>No active meetings right now.</p>
						<LabeledButton
							size="small"
							kind="ghost"
							icon={ArrowRight}
							tooltip="Go to meetings"
							href="/meetings"
						>
							Go to Meetings
						</LabeledButton>
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
					<h2 class="section-title">Recent Activity</h2>
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

<!-- Delete confirmation -->
<ConfirmModal
	bind:open={showDeleteConfirm}
	heading={deleteTarget?.type === 'team' ? 'Delete team' : 'Delete channel'}
	confirmLabel="Delete"
	action={deleteTarget?.type === 'team' ? '?/deleteTeam' : '?/deleteChannel'}
	fields={deleteTarget?.type === 'team'
		? { teamId: deleteTarget.id }
		: { channelId: deleteTarget?.id ?? '' }}
	successMessage={deleteTarget?.type === 'team'
		? `Team "${deleteTarget.name}" deleted`
		: `Channel #${deleteTarget?.name} deleted`}
>
	<p>
		Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
		{#if deleteTarget?.type === 'team'}
			This will permanently delete all channels, messages, meetings, files and share links in this
			team. This cannot be undone.
		{:else}
			This will permanently delete all messages and files in this channel. This cannot be undone.
		{/if}
	</p>
</ConfirmModal>

<!-- Create Team modal -->
<Modal
	bind:open={showTeamModal}
	modalHeading="Create Team"
	primaryButtonText={teamPending ? 'Creating…' : 'Create'}
	primaryButtonDisabled={teamPending}
	secondaryButtonText="Cancel"
	shouldSubmitOnEnter={false}
	on:click:button--secondary={() => (showTeamModal = false)}
	on:submit={() => submitForm('create-team-form')}
>
	{#if teamError}
		<div class="modal-error">
			<InlineNotification kind="error" title={teamError} hideCloseButton lowContrast />
		</div>
	{/if}
	<form
		id="create-team-form"
		method="post"
		action="?/createTeam"
		use:enhance={feedbackEnhance({
			pending: (v) => (teamPending = v),
			success: 'Team created. Welcome to #general!',
			onSuccess: () => (showTeamModal = false),
			onError: (message) => (teamError = message)
		})}
	>
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
	primaryButtonText={channelPending ? 'Creating…' : 'Create'}
	primaryButtonDisabled={channelPending}
	secondaryButtonText="Cancel"
	shouldSubmitOnEnter={false}
	on:click:button--secondary={() => (showChannelModal = false)}
	on:submit={() => submitForm('create-channel-form')}
>
	{#if channelError}
		<div class="modal-error">
			<InlineNotification kind="error" title={channelError} hideCloseButton lowContrast />
		</div>
	{/if}
	<form
		id="create-channel-form"
		method="post"
		action="?/createChannel"
		use:enhance={feedbackEnhance({
			pending: (v) => (channelPending = v),
			success: 'Channel created',
			onSuccess: () => (showChannelModal = false),
			onError: (message) => (channelError = message)
		})}
	>
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
	primaryButtonText={memberPending ? 'Adding…' : 'Add'}
	primaryButtonDisabled={memberPending}
	secondaryButtonText="Cancel"
	shouldSubmitOnEnter={false}
	on:click:button--secondary={() => (showAddMemberModal = false)}
	on:submit={() => submitForm('add-member-form')}
>
	{#if memberError}
		<div class="modal-error">
			<InlineNotification kind="error" title={memberError} hideCloseButton lowContrast />
		</div>
	{/if}
	<form
		id="add-member-form"
		method="post"
		action="?/addMember"
		use:enhance={feedbackEnhance({
			pending: (v) => (memberPending = v),
			success: 'Member added to the team',
			onSuccess: () => (showAddMemberModal = false),
			onError: (message) => (memberError = message)
		})}
	>
		<input type="hidden" name="teamId" value={addMemberTeamId} />
		<TextInput
			name="email"
			labelText="User email"
			placeholder="colleague@example.com"
			helperText="The person must already have an Equipe account. To invite someone new, use the team settings page."
			required
			type="email"
		/>
	</form>
</Modal>

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-07);
		padding: var(--cds-spacing-07);
		margin-bottom: var(--cds-spacing-07);
		background: var(--cds-ui-01);
		border-left: 4px solid var(--cds-interactive-01);
	}

	.welcome-copy {
		min-width: 0;
	}

	.eyebrow {
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
		margin-bottom: var(--cds-spacing-04);
	}

	h1 {
		font-size: clamp(1.75rem, 3vw, 2.625rem);
		line-height: 1.2;
		font-weight: 300;
		overflow-wrap: anywhere;
	}

	.welcome-art {
		display: flex;
		flex-shrink: 0;
	}

	.welcome-art > div {
		display: grid;
		place-items: center;
		width: 4rem;
		height: 4rem;
		border: 1px solid var(--cds-border-subtle);
		color: var(--cds-link-primary);
	}

	.welcome-art > div:nth-child(2) {
		margin-top: 2rem;
		background: var(--cds-background-selected);
	}

	.subtitle {
		margin-top: var(--cds-spacing-04);
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}

	/* Stats */
	:global(.stat-tile) {
		min-height: auto !important;
		margin-bottom: var(--cds-spacing-07);
		padding: var(--cds-spacing-06);
		border-top: 2px solid var(--cds-border-subtle);
	}

	.stat {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-direction: row-reverse;
		gap: var(--cds-spacing-04);
	}

	.stat :global(svg) {
		color: var(--cds-link-primary);
	}

	.stat-value {
		display: block;
		font-size: 2.625rem;
		font-weight: 300;
		line-height: 1.2;
		margin-bottom: var(--cds-spacing-03);
		font-variant-numeric: tabular-nums;
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
		flex-wrap: wrap;
		gap: var(--cds-spacing-03);
	}

	.section-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 400;
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
		padding: var(--cds-spacing-06) !important;
		border: 1px solid var(--cds-border-subtle);
	}

	.team-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cds-spacing-04);
	}

	.team-avatar {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cds-link-primary);
		background: var(--cds-background-selected);
	}

	.team-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.team-actions {
		display: flex;
		gap: var(--cds-spacing-01);
	}

	.team-name {
		overflow-wrap: anywhere;
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
		flex-wrap: wrap;
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
		border-radius: 0;
		transition: background var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	.channel-item:hover,
	.channel-item:focus-within {
		background: var(--cds-hover-ui);
	}

	.channel-link {
		flex: 1;
		min-width: 0;
		padding: var(--cds-spacing-03) 0;
		overflow-wrap: anywhere;
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

	.empty-state h3 {
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
		/* A status pulse keeps its slow cadence; interaction durations apply to transitions. */
		animation: pulse 2s var(--cds-motion-standard-productive) infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.meeting-dot {
			animation: none;
		}
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
		flex-wrap: wrap;
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
		overflow-wrap: anywhere;
		font-size: 0.8125rem;
		color: var(--cds-text-secondary);
		margin: 0;
		transition: color var(--cds-duration-fast-02) var(--cds-motion-standard-productive);
	}

	/* Forms */
	.form-field {
		margin-bottom: var(--cds-spacing-05);
	}

	.modal-error {
		margin-bottom: var(--cds-spacing-05);
	}

	a:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}

	@media (max-width: 1056px) {
		.welcome-art {
			display: none;
		}
	}

	@media (max-width: 672px) {
		.page-header {
			padding: var(--cds-spacing-06);
		}

		:global(.stat-tile) {
			padding: var(--cds-spacing-05);
			margin-bottom: var(--cds-spacing-05);
		}

		.team-header {
			flex-wrap: wrap;
		}
	}
</style>

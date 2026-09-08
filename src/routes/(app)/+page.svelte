<script lang="ts">
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import {
		OverflowMenu,
		OverflowMenuItem,
		TextInput,
		Tile,
		ClickableTile,
		Modal,
		Select,
		SelectItem,
		InlineNotification
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import Group from 'carbon-icons-svelte/lib/Group.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
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

<div class="dashboard">
	<header class="dashboard-header">
		<h1>Welcome, {data.user.name || data.user.email}</h1>
		<p>Your workspace at a glance.</p>
	</header>
	{#if data.teams.length > 0}
		<dl class="workspace-summary">
			<div>
				<dt>Teams</dt>
				<dd>{data.teams.length}</dd>
			</div>
			<div>
				<dt>Channels</dt>
				<dd>{data.channels.length}</dd>
			</div>
			<div>
				<dt>Active meetings</dt>
				<dd>{data.activeMeetings.length}</dd>
			</div>
			<div>
				<dt>Files</dt>
				<dd>{data.fileCount}</dd>
			</div>
		</dl>
	{/if}

	<!-- Main content -->
	<div class="dashboard-columns">
		<!-- Teams & Channels -->
		<section class="teams-section">
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
						<article class="team-card">
							<div class="team-header">
								<span class="team-avatar" aria-hidden="true"
									>{t.name.slice(0, 2).toUpperCase()}</span
								>
								<div class="team-info">
									<h3 class="team-name">
										<a href={resolve(`/teams/${t.id}`)}>{t.name}</a>
									</h3>
									<div class="team-meta">
										<span>
											{t.memberCount}
											{t.memberCount === 1 ? 'member' : 'members'}
										</span>
										<span>
											{t.channels.length}
											{t.channels.length === 1 ? 'channel' : 'channels'}
										</span>
									</div>
								</div>
								<div class="team-actions">
									<OverflowMenu size="sm" flipped portalMenu iconDescription="Actions for {t.name}">
										<OverflowMenuItem text="Team settings" href={resolve(`/teams/${t.id}`)} />
										{#if canManageMembers(t.id)}
											<OverflowMenuItem text="Add member" on:click={() => openAddMember(t.id)} />
										{/if}
										{#if canDeleteTeam(t.id)}
											<OverflowMenuItem
												text="Delete team"
												danger
												hasDivider
												on:click={() => confirmDelete('team', t.id, t.name)}
											/>
										{/if}
									</OverflowMenu>
								</div>
							</div>
							{#if t.description}
								<p class="team-description">{t.description}</p>
							{/if}
							<div class="channel-list">
								{#each t.channels as ch (ch.id)}
									<div class="channel-item">
										<a href={resolve(`/channels/${ch.id}`)} class="channel-link">
											<span class="channel-hash">#</span>
											{ch.name}
										</a>
										{#if canDeleteChannel(ch)}
											<OverflowMenu
												size="sm"
												flipped
												portalMenu
												iconDescription="Actions for #{ch.name}"
											>
												<OverflowMenuItem
													text="Delete channel"
													danger
													on:click={() => confirmDelete('channel', ch.id, ch.name)}
												/>
											</OverflowMenu>
										{/if}
									</div>
								{/each}
								{#if t.channels.length === 0}
									<p class="empty-text-inline">No channels yet</p>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Right sidebar: Meetings + Recent Activity -->
		<section class="activity-section">
			<!-- Active Meetings -->
			<div class="section-header">
				<h2 class="section-title">Active Meetings</h2>
				{#if data.teams.length > 0}
					<LabeledButton size="small" kind="ghost" icon={Add} tooltip="New meeting" href="/meetings"
						>New</LabeledButton
					>
				{/if}
			</div>

			{#if data.activeMeetings.length === 0}
				<div class="meetings-empty">
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
				</div>
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
				<div class="activity-panel">
					<ul class="activity-list">
						{#each data.recentMessages as msg (msg.id)}
							<li class="activity-item">
								<a href={resolve(`/channels/${msg.channelId}`)} class="activity-link">
									<div class="activity-header">
										<span class="activity-user">{msg.userName}</span>
										<span class="activity-channel">{channelName(msg.channelId)}</span>
										<span class="activity-time">{timeAgo(msg.createdAt)}</span>
									</div>
									<p class="activity-content">
										{msg.content.trim() ? truncate(msg.content, 100) : 'Shared an attachment'}
									</p>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
	</div>
</div>

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
	.dashboard {
		max-width: 90rem;
		margin: 0 auto;
	}
	.dashboard-header h1 {
		font-size: clamp(1.5rem, 2vw, 2rem);
		line-height: 1.3;
		font-weight: 400;
		overflow-wrap: anywhere;
	}
	.dashboard-header p {
		margin-top: 0.5rem;
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}
	.workspace-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		padding: 1.25rem 0;
		margin: 0 0 1.5rem;
		border-bottom: 1px solid var(--cds-border-subtle);
	}
	.workspace-summary div {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.workspace-summary dt {
		color: var(--cds-text-secondary);
		font-size: 0.8125rem;
	}
	.workspace-summary dd {
		order: -1;
		font-size: 1rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.dashboard-columns {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: 2.5rem;
		margin-top: 1.5rem;
	}
	.teams-section,
	.activity-section {
		min-width: 0;
	}
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
		min-height: 2rem;
	}
	.section-title {
		font-size: 1rem;
		font-weight: 600;
	}
	.section-actions {
		display: flex;
		gap: 0.25rem;
	}
	.teams-grid {
		border-top: 1px solid var(--cds-border-subtle);
	}
	.team-card {
		padding: 1rem 0;
		border-bottom: 1px solid var(--cds-border-subtle);
	}
	.team-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.team-avatar {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--cds-ui-01);
		color: var(--cds-text-secondary);
	}
	.team-info {
		flex: 1;
		min-width: 0;
	}
	.team-name {
		font-size: 0.875rem;
		font-weight: 600;
		overflow-wrap: anywhere;
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
		flex-wrap: wrap;
		gap: 0.75rem;
		color: var(--cds-text-secondary);
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}
	.team-description {
		margin: 0.5rem 0 0 2.75rem;
		color: var(--cds-text-secondary);
		font-size: 0.8125rem;
		overflow-wrap: anywhere;
	}
	.channel-list {
		margin: 0.375rem 0 0 2.25rem;
	}
	.channel-item {
		display: flex;
		align-items: center;
		min-height: 2rem;
		padding-left: 0.5rem;
	}
	.channel-item:hover,
	.channel-item:focus-within {
		background: var(--cds-hover-ui);
	}
	.channel-link {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0;
		font-size: 0.875rem;
		text-decoration: none;
		color: var(--cds-text-primary);
		overflow-wrap: anywhere;
	}
	.channel-hash {
		color: var(--cds-text-secondary);
		margin-right: 0.375rem;
	}
	.empty-text-inline {
		padding: 0.5rem;
		font-size: 0.8125rem;
		color: var(--cds-text-secondary);
	}
	.empty-state,
	.empty-state-small {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem 0;
		color: var(--cds-text-secondary);
	}
	.empty-state {
		padding: 2rem 1rem;
	}
	.empty-state h3 {
		color: var(--cds-text-primary);
	}
	.empty-state p,
	.empty-state-small p {
		font-size: 0.875rem;
	}
	.meetings-empty {
		border-top: 1px solid var(--cds-border-subtle);
	}
	.meeting-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.meeting-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.meeting-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--cds-support-success);
		flex-shrink: 0;
	}
	.meeting-title {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.meeting-time {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}
	.activity-list {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--cds-border-subtle);
	}
	.activity-item {
		border-bottom: 1px solid var(--cds-border-subtle);
	}
	.activity-link {
		display: block;
		padding: 0.875rem 0;
		color: inherit;
		text-decoration: none;
	}
	.activity-link:hover {
		background: var(--cds-hover-ui);
	}
	.activity-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 0.5rem;
		align-items: baseline;
	}
	.activity-user {
		font-size: 0.8125rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.activity-channel,
	.activity-time {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}
	.activity-time {
		margin-left: auto;
	}
	.activity-content {
		margin-top: 0.375rem;
		font-size: 0.8125rem;
		color: var(--cds-text-secondary);
		overflow-wrap: anywhere;
	}
	.form-field,
	.modal-error {
		margin-bottom: 1rem;
	}
	a:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}
	@media (max-width: 1056px) {
		.dashboard-columns {
			grid-template-columns: minmax(0, 1fr);
			gap: 2rem;
		}
	}
	@media (max-width: 672px) {
		.workspace-summary {
			gap: 0.75rem 1.25rem;
		}
	}
</style>

<script lang="ts">
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import {
		OverflowMenu,
		OverflowMenuItem,
		TextInput,
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
	import Sparkline from '$lib/components/Sparkline.svelte';
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

	/*
	 * The four KPI tiles. The headline is the current total; the sparkline under it is how
	 * many were added per day over the window, so `verb` names what the series counts and
	 * keeps the plot from being read as the total over time.
	 */
	const kpis = $derived([
		{ label: 'Teams', value: data.teams.length, verb: 'created', series: data.trends.teams },
		{
			label: 'Channels',
			value: data.channels.length,
			verb: 'created',
			series: data.trends.channels
		},
		{
			label: 'Active meetings',
			value: data.activeMeetings.length,
			verb: 'started',
			series: data.trends.meetings
		},
		{ label: 'Files', value: data.fileCount, verb: 'uploaded', series: data.trends.files }
	]);

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
			{#each kpis as kpi (kpi.label)}
				{@const added = kpi.series.reduce((a, b) => a + b, 0)}
				<div class="kpi">
					<dt>{kpi.label}</dt>
					<dd>
						<span class="kpi-value">{kpi.value}</span>
						<span class="kpi-note">{added} {kpi.verb} · {data.trendDays}d</span>
						<!-- A flat line on the baseline would read as a rule rather than as data,
						     so a window with nothing in it simply gets no plot. -->
						{#if added > 0}
							<Sparkline
								values={kpi.series}
								height={32}
								label="{kpi.label}: {added} {kpi.verb} over the last {data.trendDays} days"
							/>
						{/if}
					</dd>
				</div>
			{/each}
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
				<div class="empty-state panel">
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
			<div class="panel">
				<div class="section-header">
					<h2 class="section-title">Active Meetings</h2>
					{#if data.teams.length > 0}
						<LabeledButton
							size="small"
							kind="ghost"
							icon={Add}
							tooltip="New meeting"
							href="/meetings">New</LabeledButton
						>
					{/if}
				</div>

				{#if data.activeMeetings.length === 0}
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
				{:else}
					<div class="meeting-list">
						{#each data.activeMeetings as m (m.id)}
							<a class="meeting-item" href={resolve(`/meetings/${m.id}`)}>
								<span class="meeting-dot"></span>
								<span>
									<span class="meeting-title">{m.title}</span>
									<span class="meeting-time">Started {timeAgo(m.createdAt)}</span>
								</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent Activity -->
			{#if data.recentMessages.length > 0}
				<div class="panel">
					<div class="section-header">
						<h2 class="section-title">Recent Activity</h2>
					</div>
					<ul class="activity-list">
						{#each data.recentMessages as msg (msg.id)}
							<li>
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
	.dashboard-header {
		margin-bottom: var(--cds-spacing-06);
	}
	.dashboard-header p {
		margin-top: 0.5rem;
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}
	/*
	 * Separation on this page comes from layering, not from rules: every block is a
	 * `--cds-ui-01` surface sitting on the `--cds-ui-background` page, and the gutter
	 * between surfaces does the dividing. The only 1px lines left are the vertical
	 * filets inside the KPI row, where they group figures that share one surface.
	 */
	.panel {
		background: var(--cds-ui-01);
		padding: var(--cds-spacing-05) var(--cds-spacing-06) var(--cds-spacing-06);
	}
	.workspace-summary {
		display: flex;
		flex-wrap: wrap;
		background: var(--cds-ui-01);
		/* No side or bottom padding: each cell's sparkline runs to its own edges. The inset
		   is carried by the text inside the cells instead. */
		padding: var(--cds-spacing-05) 0 0;
		margin: 0 0 var(--cds-spacing-05);
	}
	.kpi {
		display: flex;
		flex-direction: column;
		flex: 1 1 8rem;
		border-left: 1px solid var(--cds-border-subtle);
	}
	.kpi:first-child {
		border-left: none;
	}
	.kpi dd {
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.kpi dt,
	.kpi-value,
	.kpi-note {
		padding: 0 var(--cds-spacing-06);
	}
	.kpi dt {
		color: var(--cds-text-secondary);
		font-size: 0.75rem;
	}
	.kpi-value {
		font-size: 1.75rem;
		font-weight: 300;
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
	}
	.kpi-note {
		color: var(--cds-text-secondary);
		font-size: 0.6875rem;
	}
	/* Anchor the plot to the bottom so the four line up despite unequal text height. */
	.kpi :global(.sparkline) {
		margin-top: auto;
		padding-top: var(--cds-spacing-04);
	}
	.dashboard-columns {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: var(--cds-spacing-05);
		align-items: start;
		margin-top: var(--cds-spacing-05);
	}
	.teams-section,
	.activity-section {
		min-width: 0;
	}
	.activity-section {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
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
	/*
	 * Each team is its own surface rather than a row inside one panel. A header inside a
	 * tile labels that tile; this grid's header sits above it, on the page, because it
	 * labels the group.
	 */
	.teams-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		gap: var(--cds-spacing-05);
	}
	.team-card {
		background: var(--cds-ui-01);
		padding: var(--cds-spacing-05);
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
		/* One step up from the panel it sits on, so it stays visible now that
		   the panel itself is `--cds-ui-01`. */
		background: var(--cds-ui-03);
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
		margin: 0.5rem 0 0;
		color: var(--cds-text-secondary);
		font-size: 0.8125rem;
		overflow-wrap: anywhere;
	}
	.channel-list {
		margin: 0.5rem 0 0;
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
		padding: 2rem 0;
	}
	.empty-state h3 {
		color: var(--cds-text-primary);
	}
	.empty-state p,
	.empty-state-small p {
		font-size: 0.875rem;
	}
	.meeting-list {
		display: flex;
		flex-direction: column;
	}
	.meeting-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.5rem;
		margin: 0 -0.5rem;
		color: inherit;
		text-decoration: none;
	}
	.meeting-item:hover {
		background: var(--cds-hover-ui);
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
	}
	.activity-link {
		display: block;
		padding: 0.625rem 0.5rem;
		margin: 0 -0.5rem;
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
		/*
		 * Once the cells wrap, a left-border filet would reappear at the start of the second
		 * row (CSS can't see row starts in a flex container). Below this breakpoint the band
		 * drops the filets and separates by gutter instead — the same layering rule the rest
		 * of the page follows.
		 */
		.workspace-summary {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1px;
			background: var(--cds-ui-background);
			padding: 0;
		}
		.kpi {
			background: var(--cds-ui-01);
			border-left: none;
			padding-top: var(--cds-spacing-05);
		}
	}
</style>

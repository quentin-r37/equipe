<script lang="ts">
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import KpiBand from '$lib/components/KpiBand.svelte';
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		Modal,
		Select,
		SelectItem,
		Tag,
		InlineNotification
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { feedbackEnhance } from '$lib/forms';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from '../$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();

	let showModal = $state(false);
	let createPending = $state(false);
	let createError = $state('');

	function openCreate() {
		createError = '';
		showModal = true;
	}

	let deleteTarget = $state<{ id: string; title: string; active: boolean } | null>(null);
	let showDeleteConfirm = $state(false);

	function confirmDelete(m: { id: string; title: string; status: string }) {
		deleteTarget = { id: m.id, title: m.title, active: m.status === 'active' };
		showDeleteConfirm = true;
	}

	const teamName = (teamId: string) => data.teams.find((t) => t.id === teamId)?.name ?? '';

	/*
	 * The same figures band the dashboard and team pages open with. Each headline counts every
	 * meeting the user can see; the plot under it counts the ones started per day in the
	 * window, under that same scope — so "Live now" plots the meetings started recently that
	 * are still running, not a history of how many were live.
	 */
	const kpis = $derived([
		{ label: 'Meetings', value: data.stats.total, verb: 'started', series: data.trends.all },
		{ label: 'Live now', value: data.stats.live, verb: 'still live', series: data.trends.live },
		{ label: 'Started by you', value: data.stats.mine, verb: 'started', series: data.trends.mine },
		{ label: 'Teams', value: data.teams.length, verb: 'created', series: data.trends.teams }
	]);
</script>

<svelte:head>
	<title>Meetings · Equipe</title>
</svelte:head>

<div class="meetings-page">
	<header class="page-header">
		<div class="page-title">
			<h1>Meetings</h1>
			<p>Video calls across your teams.</p>
		</div>
		{#if data.teams.length > 0}
			<LabeledButton icon={Add} tooltip="New meeting" onclick={openCreate}
				>New Meeting</LabeledButton
			>
		{/if}
	</header>

	{#if data.teams.length > 0}
		<KpiBand {kpis} days={data.trendDays} />
	{/if}

	<section class="panel">
		<div class="section-header">
			<h2 class="section-title">All meetings</h2>
			{#if data.meetings.length > 0}
				<p class="section-note" role="status">
					{data.meetings.length === data.stats.total
						? `${data.stats.total} meeting${data.stats.total === 1 ? '' : 's'}`
						: `Latest ${data.meetings.length} of ${data.stats.total}`}
				</p>
			{/if}
		</div>

		{#if data.meetings.length === 0}
			<div class="empty-state">
				<VideoChat size={32} />
				{#if data.teams.length === 0}
					<p>Join or create a team to start a video call.</p>
				{:else}
					<h3>No meetings yet</h3>
					<p>Start one to open a video call for your team.</p>
					<LabeledButton icon={Add} tooltip="Start a meeting" onclick={openCreate}
						>Start a meeting</LabeledButton
					>
				{/if}
			</div>
		{:else}
			<div class="meeting-list">
				{#each data.meetings as m (m.id)}
					<div class="meeting-row">
						<span class="meeting-avatar" class:live={m.status === 'active'} aria-hidden="true">
							<VideoChat size={16} />
						</span>
						<div class="meeting-info">
							<p class="meeting-title">{m.title}</p>
							<p class="meeting-meta">
								{#if data.teams.length > 1}{teamName(m.teamId)} &middot;
								{/if}{new Date(m.createdAt).toLocaleString()}
							</p>
						</div>
						<div class="meeting-actions">
							<Tag size="sm" type={m.status === 'active' ? 'green' : 'cool-gray'}>
								{m.status === 'active' ? 'Live' : 'Ended'}
							</Tag>
							{#if m.status === 'active'}
								<LabeledButton
									size="small"
									icon={VideoChat}
									tooltip="Join meeting"
									href="/meetings/{m.id}">Join</LabeledButton
								>
							{/if}
							{#if m.createdBy === data.user.id}
								<Button
									size="small"
									kind="danger-ghost"
									icon={TrashCan}
									iconDescription="Delete meeting {m.title}"
									on:click={() => confirmDelete(m)}
								/>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<Modal
	bind:open={showModal}
	modalHeading="New Meeting"
	primaryButtonText={createPending ? 'Starting…' : 'Start'}
	primaryButtonDisabled={createPending}
	secondaryButtonText="Cancel"
	shouldSubmitOnEnter={false}
	on:click:button--secondary={() => (showModal = false)}
	on:submit={() =>
		(document.getElementById('create-meeting-form') as HTMLFormElement | null)?.requestSubmit()}
>
	{#if createError}
		<div class="modal-error">
			<InlineNotification kind="error" title={createError} hideCloseButton lowContrast />
		</div>
	{/if}
	<form
		id="create-meeting-form"
		method="post"
		action="?/create"
		use:enhance={feedbackEnhance({
			pending: (v) => (createPending = v),
			onSuccess: () => (showModal = false),
			onError: (message) => (createError = message)
		})}
	>
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

<ConfirmModal
	bind:open={showDeleteConfirm}
	heading="Delete meeting"
	confirmLabel="Delete"
	action="?/delete"
	fields={{ meetingId: deleteTarget?.id ?? '' }}
	successMessage={`Meeting "${deleteTarget?.title}" deleted`}
>
	<p>
		Delete <strong>{deleteTarget?.title}</strong>?
		{#if deleteTarget?.active}
			It is still live: participants will not be able to rejoin once it is deleted.
		{:else}
			It will disappear from everyone's meeting list.
		{/if}
	</p>
</ConfirmModal>

<style>
	/*
	 * Same page system as the dashboard and the team page: separation comes from layering, not
	 * from rules — every block is a `--cds-ui-01` surface on the `--cds-ui-background` page and
	 * the gutter between surfaces does the dividing. The only 1px lines are the filets inside
	 * the KPI band, where they group figures that share one surface.
	 */
	.meetings-page {
		max-width: 90rem;
		margin: 0 auto;
	}
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cds-spacing-05);
		flex-wrap: wrap;
		margin-bottom: var(--cds-spacing-06);
	}
	.page-title h1 {
		font-size: clamp(1.5rem, 2vw, 2rem);
		line-height: 1.3;
		font-weight: 400;
		overflow-wrap: anywhere;
	}
	.page-title p {
		margin-top: 0.5rem;
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}
	.panel {
		background: var(--cds-ui-01);
		padding: var(--cds-spacing-05) var(--cds-spacing-06) var(--cds-spacing-06);
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
	.section-note {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}
	/*
	 * Meetings are rows on a single surface rather than a tile each: the hover band does the
	 * separating, as in the team page's member list.
	 */
	.meeting-row {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		flex-wrap: wrap;
		padding: 0.625rem 0.5rem;
		margin: 0 -0.5rem;
	}
	.meeting-row:hover,
	.meeting-row:focus-within {
		background: var(--cds-hover-ui);
	}
	.meeting-avatar {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		/* One step up from the panel it sits on, so it stays visible on `--cds-ui-01`. */
		background: var(--cds-ui-03);
		color: var(--cds-text-secondary);
	}
	/* A live call is the one thing worth colouring in the list; the Tag carries the word. */
	.meeting-avatar.live {
		background: var(--cds-support-success);
		color: var(--cds-text-on-color);
	}
	.meeting-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-01);
		flex: 1;
		min-width: 0;
	}
	.meeting-title {
		font-size: 0.875rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.meeting-meta {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		overflow-wrap: anywhere;
	}
	.meeting-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		flex-shrink: 0;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 2rem 0;
		color: var(--cds-text-secondary);
	}
	.empty-state h3 {
		color: var(--cds-text-primary);
	}
	.empty-state p {
		font-size: 0.875rem;
	}
	.form-field,
	.modal-error {
		margin-bottom: var(--cds-spacing-05);
	}
	@media (max-width: 672px) {
		.meeting-actions {
			gap: var(--cds-spacing-02);
		}
	}
</style>

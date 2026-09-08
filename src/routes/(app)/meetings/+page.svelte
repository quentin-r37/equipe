<script lang="ts">
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		Tile,
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
</script>

<svelte:head>
	<title>Meetings · Equipe</title>
</svelte:head>

<div class="page-header">
	<h1>Meetings</h1>
	{#if data.teams.length > 0}
		<LabeledButton icon={Add} tooltip="New meeting" onclick={openCreate}>New Meeting</LabeledButton>
	{/if}
</div>

{#if data.meetings.length === 0}
	<Tile>
		<div class="empty-state">
			<VideoChat size={32} />
			{#if data.teams.length === 0}
				<p>Join or create a team to start a video call.</p>
			{:else}
				<p>No meetings yet. Start one to open a video call for your team.</p>
				<LabeledButton
					size="small"
					kind="ghost"
					icon={Add}
					tooltip="Start a meeting"
					onclick={openCreate}>Start a meeting</LabeledButton
				>
			{/if}
		</div>
	</Tile>
{:else}
	<div class="meeting-list">
		{#each data.meetings as m (m.id)}
			<Tile>
				<div class="meeting-row">
					<div class="meeting-text">
						<h3>{m.title}</h3>
						<p class="meeting-date">
							{#if data.teams.length > 1}{teamName(m.teamId)} &middot;{/if}
							{new Date(m.createdAt).toLocaleString()}
						</p>
					</div>
					<div class="meeting-actions">
						<Tag type={m.status === 'active' ? 'green' : 'gray'}>
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
			</Tile>
		{/each}
	</div>
{/if}

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
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--cds-spacing-07);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cds-spacing-04);
		text-align: center;
		padding: var(--cds-spacing-07) 0;
		color: var(--cds-text-secondary);
	}

	.empty-state :global(svg) {
		color: var(--cds-icon-disabled);
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
		gap: var(--cds-spacing-04);
	}

	.meeting-text {
		min-width: 0;
	}

	h3 {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.meeting-date {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.meeting-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		flex-shrink: 0;
	}

	.form-field {
		margin-bottom: var(--cds-spacing-05);
	}

	.modal-error {
		margin-bottom: var(--cds-spacing-05);
	}

	@media (max-width: 672px) {
		.page-header {
			flex-wrap: wrap;
			gap: var(--cds-spacing-03);
		}

		.meeting-row {
			flex-wrap: wrap;
			gap: var(--cds-spacing-03);
		}

		.meeting-actions {
			gap: var(--cds-spacing-02);
		}
	}
</style>

<script lang="ts">
	import { Button, Tile, Tag, TextInput } from 'carbon-components-svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import type { PageData } from './$types';
	import type { LayoutServerData } from '../../$types';

	let { data }: { data: PageData & LayoutServerData } = $props();

	let deleteTarget = $state<{ id: string; name: string; email: string } | null>(null);
	let showDeleteConfirm = $state(false);
	let typedEmail = $state('');

	function confirmDelete(u: { id: string; name: string; email: string }) {
		deleteTarget = u;
		typedEmail = '';
		showDeleteConfirm = true;
	}

	const emailMatches = $derived(
		!!deleteTarget && typedEmail.trim().toLowerCase() === deleteTarget.email.toLowerCase()
	);
</script>

<svelte:head>
	<title>User management · Equipe</title>
</svelte:head>

<div class="page-header">
	<h1>User Management</h1>
	<Tag type="purple">{data.users.length} {data.users.length === 1 ? 'user' : 'users'}</Tag>
</div>

{#if data.users.length === 0}
	<Tile>
		<p class="empty-state">No users found.</p>
	</Tile>
{:else}
	<div class="user-list">
		{#each data.users as u (u.id)}
			<Tile>
				<div class="user-row">
					<div>
						<p class="user-name">{u.name}</p>
						<p class="user-meta">
							{u.email}
							{#if u.emailVerified}
								<Tag size="sm" type="green">verified</Tag>
							{:else}
								<Tag size="sm" type="warm-gray">not verified</Tag>
							{/if}
						</p>
						<p class="user-meta">
							Joined {new Date(u.createdAt).toLocaleDateString()}
						</p>
					</div>
					<div class="user-actions">
						{#if u.id !== data.user.id}
							<Button
								size="small"
								kind="danger-ghost"
								icon={TrashCan}
								iconDescription="Delete {u.email}"
								on:click={() => confirmDelete(u)}
							/>
						{:else}
							<Tag size="sm" type="blue">you</Tag>
						{/if}
					</div>
				</div>
			</Tile>
		{/each}
	</div>
{/if}

<ConfirmModal
	bind:open={showDeleteConfirm}
	heading="Delete user account"
	confirmLabel="Delete account"
	action="?/delete"
	fields={{ userId: deleteTarget?.id ?? '' }}
	confirmDisabled={!emailMatches}
	successMessage={`Account ${deleteTarget?.email} deleted`}
>
	<p>
		This permanently deletes <strong>{deleteTarget?.name}</strong>'s account, their sessions and
		their team memberships. Their messages and files stay in the teams. This cannot be undone.
	</p>
	<div class="confirm-input">
		<TextInput
			labelText="Type the account email to confirm"
			placeholder={deleteTarget?.email}
			bind:value={typedEmail}
			autocomplete="off"
		/>
	</div>
</ConfirmModal>

<style>
	.page-header {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
		margin-bottom: var(--cds-spacing-07);
	}

	.empty-state {
		text-align: center;
		padding: var(--cds-spacing-07) 0;
		color: var(--cds-text-secondary);
	}

	.user-list {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-04);
		flex-wrap: wrap;
	}

	.user-name {
		font-weight: 600;
	}

	.user-meta {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		flex-wrap: wrap;
	}

	.user-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	.confirm-input {
		margin-top: var(--cds-spacing-05);
	}
</style>

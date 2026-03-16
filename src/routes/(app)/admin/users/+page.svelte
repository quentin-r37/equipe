<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Tile, Tag } from 'carbon-components-svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import type { PageData } from './$types';
	import type { LayoutServerData } from '../../$types';

	let { data }: { data: PageData & LayoutServerData } = $props();
</script>

<div class="page-header">
	<h1>User Management</h1>
	<Tag type="purple">{data.users.length} users</Tag>
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
							{/if}
						</p>
						<p class="user-meta">
							Joined {new Date(u.createdAt).toLocaleDateString()}
						</p>
					</div>
					<div class="user-actions">
						{#if u.id !== data.user.id}
							<form method="post" action="?/delete" use:enhance>
								<input type="hidden" name="userId" value={u.id} />
								<Button
									size="small"
									kind="danger-ghost"
									icon={TrashCan}
									iconDescription="Delete user"
									type="submit"
								/>
							</form>
						{:else}
							<Tag size="sm" type="blue">you</Tag>
						{/if}
					</div>
				</div>
			</Tile>
		{/each}
	</div>
{/if}

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
	}

	.user-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}
</style>

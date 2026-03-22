<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		TextArea,
		Tile,
		Modal,
		Tag,
		Grid,
		Row,
		Column,
		Select,
		SelectItem,
		InlineNotification
	} from 'carbon-components-svelte';
	import ArrowLeft from 'carbon-icons-svelte/lib/ArrowLeft.svelte';
	import UserFollow from 'carbon-icons-svelte/lib/UserFollow.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import Edit from 'carbon-icons-svelte/lib/Edit.svelte';
	import Checkmark from 'carbon-icons-svelte/lib/Checkmark.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import Group from 'carbon-icons-svelte/lib/Group.svelte';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import Email from 'carbon-icons-svelte/lib/Email.svelte';
	import type { ActionData, PageData } from './$types';
	import type { LayoutServerData } from '../../$types';

	let { data, form }: { data: PageData & LayoutServerData; form: ActionData } = $props();

	let showAddMemberModal = $state(false);
	let editingDescription = $state(false);
	let descriptionValue = $state('');

	// Remove member confirmation
	let removeTarget = $state<{ id: string; name: string } | null>(null);
	let showRemoveConfirm = $state(false);

	function confirmRemove(id: string, name: string) {
		removeTarget = { id, name };
		showRemoveConfirm = true;
	}

	const isOwnerOrAdmin = $derived(
		data.currentUserRole === 'owner' || data.currentUserRole === 'admin'
	);
	const isOwner = $derived(data.currentUserRole === 'owner');

	type TagType = 'purple' | 'blue' | 'cool-gray';
	const roleLabel: Record<string, { text: string; type: TagType }> = {
		owner: { text: 'Owner', type: 'purple' },
		admin: { text: 'Admin', type: 'blue' },
		member: { text: 'Member', type: 'cool-gray' }
	};
</script>

<div class="page-header">
	<Button kind="ghost" icon={ArrowLeft} iconDescription="Back" href="/" size="small" />
	<h1>{data.team.name}</h1>
	<Tag type="high-contrast">{data.currentUserRole}</Tag>
</div>

<!-- Stats -->
<Grid fullWidth>
	<Row>
		<Column sm={2} md={2} lg={4} padding>
			<Tile class="stat-tile">
				<div class="stat">
					<Group size={24} />
					<div>
						<span class="stat-value">{data.members.length}</span>
						<span class="stat-label">{data.members.length === 1 ? 'Member' : 'Members'}</span>
					</div>
				</div>
			</Tile>
		</Column>
		<Column sm={2} md={2} lg={4} padding>
			<Tile class="stat-tile">
				<div class="stat">
					<Chat size={24} />
					<div>
						<span class="stat-value">{data.channelCount}</span>
						<span class="stat-label">{data.channelCount === 1 ? 'Channel' : 'Channels'}</span>
					</div>
				</div>
			</Tile>
		</Column>
		<Column sm={2} md={2} lg={4} padding>
			<Tile class="stat-tile">
				<div class="stat">
					<VideoChat size={24} />
					<div>
						<span class="stat-value">{data.meetingCount}</span>
						<span class="stat-label">{data.meetingCount === 1 ? 'Meeting' : 'Meetings'}</span>
					</div>
				</div>
			</Tile>
		</Column>
	</Row>
</Grid>

<!-- Description -->
<Grid fullWidth>
	<Row>
		<Column sm={4} md={8} lg={10} padding>
			<div class="section-header">
				<h3>Description</h3>
				{#if isOwnerOrAdmin && !editingDescription}
					<Button
						size="small"
						kind="ghost"
						icon={Edit}
						iconDescription="Edit description"
						on:click={() => {
							descriptionValue = data.team.description ?? '';
							editingDescription = true;
						}}
					/>
				{/if}
			</div>
			{#if editingDescription}
				<Tile>
					<form
						method="post"
						action="?/updateDescription"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								editingDescription = false;
							};
						}}
					>
						<TextArea
							name="description"
							bind:value={descriptionValue}
							labelText=""
							placeholder="Describe what this team is about..."
							rows={3}
						/>
						<div class="edit-actions">
							<Button size="small" type="submit" icon={Checkmark}>Save</Button>
							<Button
								size="small"
								kind="ghost"
								icon={Close}
								on:click={() => (editingDescription = false)}>Cancel</Button
							>
						</div>
					</form>
				</Tile>
			{:else}
				<Tile>
					<p class="description-text">
						{data.team.description || 'No description yet.'}
					</p>
				</Tile>
			{/if}
		</Column>
	</Row>
</Grid>

{#if form?.success}
	<div class="notification">
		<InlineNotification
			kind="success"
			title={form.invited ? 'Invitation sent' : 'Member added'}
			subtitle={form.invited
				? 'An invitation email has been sent.'
				: 'The member has been added to the team.'}
			hideCloseButton
		/>
	</div>
{/if}

<!-- Members -->
<Grid fullWidth>
	<Row>
		<Column sm={4} md={8} lg={10} padding>
			<div class="section-header">
				<h3>Members</h3>
				{#if isOwnerOrAdmin}
					<Button size="small" icon={UserFollow} on:click={() => (showAddMemberModal = true)}>
						Add Member
					</Button>
				{/if}
			</div>

			<div class="member-list">
				{#each data.members as member (member.id)}
					<Tile>
						<div class="member-row">
							<div class="member-info">
								<p class="member-name">
									{member.userName}
									{#if member.userId === data.user.id}
										<Tag size="sm" type="blue">you</Tag>
									{/if}
								</p>
								<p class="member-meta">{member.userEmail}</p>
								<p class="member-meta">
									Joined {new Date(member.joinedAt).toLocaleDateString()}
								</p>
							</div>
							<div class="member-actions">
								{#if isOwner && member.role !== 'owner'}
									<form method="post" action="?/updateRole" use:enhance>
										<input type="hidden" name="memberId" value={member.id} />
										<Select
											name="role"
											labelText=""
											hideLabel
											size="sm"
											selected={member.role}
											on:change={(e) => {
												const target = e.currentTarget as HTMLSelectElement;
												target?.closest('form')?.requestSubmit();
											}}
										>
											<SelectItem value="admin" text="Admin" />
											<SelectItem value="member" text="Member" />
										</Select>
									</form>
								{:else}
									<Tag size="sm" type={roleLabel[member.role]?.type ?? 'cool-gray'}>
										{roleLabel[member.role]?.text ?? member.role}
									</Tag>
								{/if}

								{#if member.role !== 'owner' && (isOwnerOrAdmin || member.userId === data.user.id)}
									<Button
										size="small"
										kind="danger-ghost"
										icon={TrashCan}
										iconDescription={member.userId === data.user.id
											? 'Leave team'
											: 'Remove member'}
										on:click={() => confirmRemove(member.id, member.userName)}
									/>
								{/if}
							</div>
						</div>
					</Tile>
				{/each}
			</div>
		</Column>
	</Row>
</Grid>

<!-- Pending Invitations -->
{#if isOwnerOrAdmin && data.pendingInvitations.length > 0}
	<Grid fullWidth>
		<Row>
			<Column sm={4} md={8} lg={10} padding>
				<div class="section-header">
					<h3>Pending Invitations</h3>
				</div>
				<div class="member-list">
					{#each data.pendingInvitations as invitation (invitation.id)}
						<Tile>
							<div class="member-row">
								<div class="member-info">
									<p class="member-name">
										<Email size={16} />
										{invitation.email}
									</p>
									<p class="member-meta">
										Invited {new Date(invitation.createdAt).toLocaleDateString()}
									</p>
								</div>
								<div class="member-actions">
									<Tag size="sm" type="cyan">Pending</Tag>
									<form method="post" action="?/cancelInvitation" use:enhance>
										<input type="hidden" name="invitationId" value={invitation.id} />
										<Button
											size="small"
											kind="danger-ghost"
											icon={TrashCan}
											iconDescription="Cancel invitation"
											type="submit"
										/>
									</form>
								</div>
							</div>
						</Tile>
					{/each}
				</div>
			</Column>
		</Row>
	</Grid>
{/if}

<!-- Remove member confirmation -->
<Modal
	bind:open={showRemoveConfirm}
	danger
	modalHeading="Remove Member"
	primaryButtonText="Remove"
	secondaryButtonText="Cancel"
	on:click:button--secondary={() => (showRemoveConfirm = false)}
	on:submit={() => {
		if (removeTarget) {
			const form = document.getElementById(`remove-member-${removeTarget.id}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		showRemoveConfirm = false;
	}}
>
	<p>
		Are you sure you want to remove <strong>{removeTarget?.name}</strong> from the team?
	</p>
</Modal>

<!-- Hidden remove forms -->
{#each data.members as member (member.id)}
	<form
		id="remove-member-{member.id}"
		method="post"
		action="?/removeMember"
		use:enhance
		style="display:none"
	>
		<input type="hidden" name="memberId" value={member.id} />
	</form>
{/each}

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
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		margin-bottom: var(--cds-spacing-07);
	}

	.page-header h1 {
		margin: 0;
	}

	.notification {
		margin-bottom: var(--cds-spacing-05);
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

	/* Sections */
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--cds-spacing-05);
	}

	.section-header h3 {
		margin: 0;
	}

	/* Description */
	.description-text {
		color: var(--cds-text-secondary);
		margin: 0;
		white-space: pre-wrap;
	}

	.edit-actions {
		display: flex;
		gap: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-04);
	}

	/* Members */
	.member-list {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.member-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-01);
	}

	.member-name {
		font-weight: 600;
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	.member-meta {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		margin: 0;
	}

	.member-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}
</style>

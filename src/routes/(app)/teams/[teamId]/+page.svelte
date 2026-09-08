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
	import Logout from 'carbon-icons-svelte/lib/Logout.svelte';
	import Edit from 'carbon-icons-svelte/lib/Edit.svelte';
	import Checkmark from 'carbon-icons-svelte/lib/Checkmark.svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import Group from 'carbon-icons-svelte/lib/Group.svelte';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import Email from 'carbon-icons-svelte/lib/Email.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { feedbackEnhance } from '$lib/forms';
	import type { PageData } from './$types';
	import type { LayoutServerData } from '../../$types';

	let { data }: { data: PageData & LayoutServerData } = $props();

	// ── Description ──
	let editingDescription = $state(false);
	let descriptionValue = $state('');
	let descriptionPending = $state(false);

	// ── Add member modal ──
	let showAddMemberModal = $state(false);
	let addMemberPending = $state(false);
	let addMemberError = $state('');

	function openAddMember() {
		addMemberError = '';
		showAddMemberModal = true;
	}

	// ── Remove / leave confirmation ──
	let removeTarget = $state<{ id: string; name: string; isSelf: boolean } | null>(null);
	let showRemoveConfirm = $state(false);

	function confirmRemove(id: string, name: string, isSelf: boolean) {
		removeTarget = { id, name, isSelf };
		showRemoveConfirm = true;
	}

	// ── Role change confirmation ──
	let roleTarget = $state<{
		memberId: string;
		name: string;
		role: string;
		previous: string;
	} | null>(null);
	let roleSelectEl: HTMLSelectElement | null = null;
	let showRoleConfirm = $state(false);

	function onRoleChange(e: Event, member: { id: string; userName: string; role: string }) {
		const select = e.currentTarget as HTMLSelectElement;
		if (select.value === member.role) return;
		roleSelectEl = select;
		roleTarget = {
			memberId: member.id,
			name: member.userName,
			role: select.value,
			previous: member.role
		};
		showRoleConfirm = true;
	}

	// Put the select back to the current role if the change is not confirmed.
	$effect(() => {
		if (!showRoleConfirm && roleTarget && roleSelectEl) {
			roleSelectEl.value =
				data.members.find((m) => m.id === roleTarget?.memberId)?.role ?? roleTarget.previous;
		}
	});

	// ── Cancel invitation confirmation ──
	let invitationTarget = $state<{ id: string; email: string } | null>(null);
	let showInvitationConfirm = $state(false);

	function confirmCancelInvitation(id: string, email: string) {
		invitationTarget = { id, email };
		showInvitationConfirm = true;
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

<svelte:head>
	<title>{data.team.name} · Equipe</title>
</svelte:head>

<div class="page-header">
	<Button kind="ghost" icon={ArrowLeft} iconDescription="Back to dashboard" href="/" size="small" />
	<h1>{data.team.name}</h1>
	<Tag type={roleLabel[data.currentUserRole]?.type ?? 'cool-gray'}>
		{roleLabel[data.currentUserRole]?.text ?? data.currentUserRole}
	</Tag>
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
				<h2 class="section-title">Description</h2>
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
						use:enhance={feedbackEnhance({
							pending: (v) => (descriptionPending = v),
							success: 'Description updated',
							onSuccess: () => (editingDescription = false)
						})}
					>
						<TextArea
							name="description"
							bind:value={descriptionValue}
							labelText="Team description"
							hideLabel
							placeholder="Describe what this team is about..."
							rows={3}
						/>
						<div class="edit-actions">
							<Button
								size="small"
								type="submit"
								class="btn--labeled"
								icon={Checkmark}
								iconDescription="Save description"
								disabled={descriptionPending}
							>
								{descriptionPending ? 'Saving…' : 'Save'}
							</Button>
							<Button
								size="small"
								kind="ghost"
								icon={Close}
								class="btn--labeled"
								iconDescription="Cancel"
								disabled={descriptionPending}
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

<!-- Members -->
<Grid fullWidth>
	<Row>
		<Column sm={4} md={8} lg={10} padding>
			<div class="section-header">
				<h2 class="section-title">Members</h2>
				{#if isOwnerOrAdmin}
					<Button
						size="small"
						icon={UserFollow}
						class="btn--labeled"
						iconDescription="Add member"
						on:click={openAddMember}>Add Member</Button
					>
				{/if}
			</div>

			<div class="member-list">
				{#each data.members as member (member.id)}
					{@const isSelf = member.userId === data.user.id}
					<Tile>
						<div class="member-row">
							<div class="member-info">
								<p class="member-name">
									{member.userName}
									{#if isSelf}
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
									<Select
										labelText="Role for {member.userName}"
										hideLabel
										size="sm"
										selected={member.role}
										on:change={(e) => onRoleChange(e, member)}
									>
										<SelectItem value="admin" text="Admin" />
										<SelectItem value="member" text="Member" />
									</Select>
								{:else}
									<Tag size="sm" type={roleLabel[member.role]?.type ?? 'cool-gray'}>
										{roleLabel[member.role]?.text ?? member.role}
									</Tag>
								{/if}

								{#if member.role !== 'owner' && (isOwnerOrAdmin || isSelf)}
									<Button
										size="small"
										kind="danger-ghost"
										icon={isSelf ? Logout : TrashCan}
										iconDescription={isSelf ? 'Leave team' : `Remove ${member.userName}`}
										on:click={() => confirmRemove(member.id, member.userName, isSelf)}
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
					<h2 class="section-title">Pending Invitations</h2>
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
									<Button
										size="small"
										kind="danger-ghost"
										icon={TrashCan}
										iconDescription="Cancel invitation for {invitation.email}"
										on:click={() => confirmCancelInvitation(invitation.id, invitation.email)}
									/>
								</div>
							</div>
						</Tile>
					{/each}
				</div>
			</Column>
		</Row>
	</Grid>
{/if}

<!-- Remove member / leave team confirmation -->
<ConfirmModal
	bind:open={showRemoveConfirm}
	heading={removeTarget?.isSelf ? 'Leave team' : 'Remove member'}
	confirmLabel={removeTarget?.isSelf ? 'Leave team' : 'Remove'}
	action="?/removeMember"
	fields={{ memberId: removeTarget?.id ?? '' }}
	successMessage={removeTarget?.isSelf
		? `You left ${data.team.name}`
		: `${removeTarget?.name} removed from the team`}
>
	{#if removeTarget?.isSelf}
		<p>
			Are you sure you want to leave <strong>{data.team.name}</strong>? You will lose access to its
			channels, files and meetings until an owner or admin adds you back.
		</p>
	{:else}
		<p>
			Are you sure you want to remove <strong>{removeTarget?.name}</strong> from the team? They will immediately
			lose access to all channels, files and meetings.
		</p>
	{/if}
</ConfirmModal>

<!-- Role change confirmation -->
<ConfirmModal
	bind:open={showRoleConfirm}
	heading="Change role"
	confirmLabel="Change role"
	danger={false}
	action="?/updateRole"
	fields={{ memberId: roleTarget?.memberId ?? '', role: roleTarget?.role ?? '' }}
	successMessage={`${roleTarget?.name} is now ${roleLabel[roleTarget?.role ?? '']?.text.toLowerCase() ?? roleTarget?.role}`}
>
	<p>
		Make <strong>{roleTarget?.name}</strong> a
		<strong>{roleLabel[roleTarget?.role ?? '']?.text.toLowerCase() ?? roleTarget?.role}</strong>?
		{#if roleTarget?.role === 'admin'}
			Admins can add and remove members, edit the description, and delete any channel.
		{:else}
			They will no longer be able to manage members or delete other people's channels.
		{/if}
	</p>
</ConfirmModal>

<!-- Cancel invitation confirmation -->
<ConfirmModal
	bind:open={showInvitationConfirm}
	heading="Cancel invitation"
	confirmLabel="Cancel invitation"
	cancelLabel="Keep it"
	action="?/cancelInvitation"
	fields={{ invitationId: invitationTarget?.id ?? '' }}
	successMessage={`Invitation for ${invitationTarget?.email} cancelled`}
>
	<p>
		The invitation link sent to <strong>{invitationTarget?.email}</strong> will stop working. You can
		invite them again later.
	</p>
</ConfirmModal>

<!-- Add Member modal -->
<Modal
	bind:open={showAddMemberModal}
	modalHeading="Add Member"
	primaryButtonText={addMemberPending ? 'Adding…' : 'Add'}
	primaryButtonDisabled={addMemberPending}
	secondaryButtonText="Cancel"
	shouldSubmitOnEnter={false}
	on:click:button--secondary={() => (showAddMemberModal = false)}
	on:submit={() =>
		(document.getElementById('add-member-form') as HTMLFormElement | null)?.requestSubmit()}
>
	{#if addMemberError}
		<div class="modal-error">
			<InlineNotification kind="error" title={addMemberError} hideCloseButton lowContrast />
		</div>
	{/if}
	<form
		id="add-member-form"
		method="post"
		action="?/addMember"
		use:enhance={feedbackEnhance<{ invited?: boolean; email?: string }>({
			pending: (v) => (addMemberPending = v),
			success: (d) =>
				d.invited ? `Invitation email sent to ${d.email}` : `${d.email} has been added to the team`,
			onSuccess: () => (showAddMemberModal = false),
			onError: (message) => (addMemberError = message)
		})}
	>
		<TextInput
			name="email"
			labelText="User email"
			placeholder="colleague@example.com"
			helperText="Existing users are added right away. Anyone else receives an invitation email."
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

	.modal-error {
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

	.section-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 400;
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
		gap: var(--cds-spacing-04);
		flex-wrap: wrap;
	}

	.member-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-01);
		min-width: 0;
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
		overflow-wrap: anywhere;
	}

	.member-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}
</style>

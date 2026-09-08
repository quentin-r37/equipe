<script lang="ts">
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		TextArea,
		Modal,
		Tag,
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
	import Email from 'carbon-icons-svelte/lib/Email.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
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

	/*
	 * The KPI tiles, the same band the dashboard uses: the headline is the current total and
	 * the sparkline under it is how many were added per day over the window, so `verb` names
	 * what the series counts and keeps the plot from being read as the total over time.
	 */
	const kpis = $derived([
		{ label: 'Members', value: data.members.length, verb: 'joined', series: data.trends.members },
		{
			label: 'Channels',
			value: data.channelCount,
			verb: 'created',
			series: data.trends.channels
		},
		{
			label: 'Meetings',
			value: data.meetingCount,
			verb: 'started',
			series: data.trends.meetings
		},
		{ label: 'Files', value: data.fileCount, verb: 'uploaded', series: data.trends.files }
	]);

	const initials = (name: string) => name.slice(0, 2).toUpperCase();
</script>

<svelte:head>
	<title>{data.team.name} · Equipe</title>
</svelte:head>

<div class="team-page">
	<header class="team-header">
		<div class="team-title">
			<Button
				kind="ghost"
				icon={ArrowLeft}
				iconDescription="Back to dashboard"
				href="/"
				size="small"
			/>
			<h1>{data.team.name}</h1>
			<Tag type={roleLabel[data.currentUserRole]?.type ?? 'cool-gray'}>
				{roleLabel[data.currentUserRole]?.text ?? data.currentUserRole}
			</Tag>
		</div>
		<p>This team at a glance.</p>
	</header>

	<dl class="workspace-summary">
		{#each kpis as kpi (kpi.label)}
			{@const added = kpi.series.reduce((a, b) => a + b, 0)}
			<div class="kpi">
				<dt>{kpi.label}</dt>
				<dd>
					<span class="kpi-value">{kpi.value}</span>
					<span class="kpi-note">{added} {kpi.verb} · {data.trendDays}d</span>
					<!-- A flat line on the baseline would read as a rule rather than as data, so a
					     window with nothing in it draws no plot — but the slot keeps its height, so the
					     tiles stay the same size once the band wraps onto more than one row. -->
					<Sparkline
						values={added > 0 ? kpi.series : []}
						height={32}
						label="{kpi.label}: {added} {kpi.verb} over the last {data.trendDays} days"
					/>
				</dd>
			</div>
		{/each}
	</dl>

	<div class="team-columns">
		<!-- Members -->
		<section class="panel">
			<div class="section-header">
				<h2 class="section-title">Members</h2>
				{#if isOwnerOrAdmin}
					<LabeledButton size="small" icon={UserFollow} tooltip="Add member" onclick={openAddMember}
						>Add Member</LabeledButton
					>
				{/if}
			</div>

			<div class="member-list">
				{#each data.members as member (member.id)}
					{@const isSelf = member.userId === data.user.id}
					<div class="member-row">
						<span class="member-avatar" aria-hidden="true">{initials(member.userName)}</span>
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
				{/each}
			</div>
		</section>

		<!-- About + pending invitations -->
		<section class="side-column">
			<div class="panel">
				<div class="section-header">
					<h2 class="section-title">About</h2>
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
							<LabeledButton
								size="small"
								type="submit"
								icon={Checkmark}
								tooltip="Save description"
								disabled={descriptionPending}
							>
								{descriptionPending ? 'Saving…' : 'Save'}
							</LabeledButton>
							<LabeledButton
								size="small"
								kind="ghost"
								icon={Close}
								tooltip="Cancel"
								disabled={descriptionPending}
								onclick={() => (editingDescription = false)}>Cancel</LabeledButton
							>
						</div>
					</form>
				{:else if data.team.description}
					<p class="description-text">{data.team.description}</p>
				{:else}
					<p class="empty-text-inline">No description yet.</p>
				{/if}
			</div>

			{#if isOwnerOrAdmin && data.pendingInvitations.length > 0}
				<div class="panel">
					<div class="section-header">
						<h2 class="section-title">Pending Invitations</h2>
					</div>
					<div class="member-list">
						{#each data.pendingInvitations as invitation (invitation.id)}
							<div class="member-row">
								<span class="member-avatar" aria-hidden="true"><Email size={16} /></span>
								<div class="member-info">
									<p class="member-name">{invitation.email}</p>
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
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>

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
	/*
	 * Same page system as the dashboard: separation comes from layering, not from rules —
	 * every block is a `--cds-ui-01` surface on the `--cds-ui-background` page and the gutter
	 * between surfaces does the dividing. The only 1px lines are the filets inside the KPI
	 * band, where they group figures that share one surface.
	 */
	.team-page {
		max-width: 90rem;
		margin: 0 auto;
	}
	.team-header {
		margin-bottom: var(--cds-spacing-06);
	}
	.team-title {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
	}
	.team-header h1 {
		font-size: clamp(1.5rem, 2vw, 2rem);
		line-height: 1.3;
		font-weight: 400;
		margin: 0;
		overflow-wrap: anywhere;
	}
	.team-header p {
		margin-top: 0.5rem;
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}
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
	.team-columns {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: var(--cds-spacing-05);
		align-items: start;
		margin-top: var(--cds-spacing-05);
	}
	.side-column {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
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
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	/* Description */
	.description-text {
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.empty-text-inline {
		font-size: 0.8125rem;
		color: var(--cds-text-secondary);
	}
	.edit-actions {
		display: flex;
		gap: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-04);
	}
	/*
	 * Carbon fills fields with `--cds-field-01`, the same value as the `--cds-ui-01` panel
	 * they sit on here, which would leave the textarea and the role select reading as bare
	 * text. On a raised surface the fields take the next token up.
	 */
	.panel :global(.bx--text-area),
	.panel :global(.bx--select-input) {
		background-color: var(--cds-field-02);
	}

	/*
	 * Members and invitations are rows on a single surface rather than a tile each: the
	 * hover band does the separating, as in the dashboard's activity and meeting lists.
	 */
	.member-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-04);
		flex-wrap: wrap;
		padding: 0.625rem 0.5rem;
		margin: 0 -0.5rem;
	}
	.member-row:hover,
	.member-row:focus-within {
		background: var(--cds-hover-ui);
	}
	.member-avatar {
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
	.member-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-01);
		flex: 1;
		min-width: 0;
	}
	.member-name {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		overflow-wrap: anywhere;
	}
	.member-meta {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		margin: 0;
		overflow-wrap: anywhere;
	}
	.member-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	.modal-error {
		margin-bottom: var(--cds-spacing-05);
	}

	@media (max-width: 1056px) {
		.team-columns {
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

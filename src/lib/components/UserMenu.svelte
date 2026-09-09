<script lang="ts">
	import { HeaderAction } from 'carbon-components-svelte';
	import { resolve } from '$app/paths';
	import UserAvatar from 'carbon-icons-svelte/lib/UserAvatar.svelte';
	import ChevronDown from 'carbon-icons-svelte/lib/ChevronDown.svelte';
	import Settings from 'carbon-icons-svelte/lib/Settings.svelte';
	import Logout from 'carbon-icons-svelte/lib/Logout.svelte';

	let {
		user,
		isAdmin = false
	}: { user: { name?: string | null; email: string }; isAdmin?: boolean } = $props();

	let isOpen = $state(false);

	const displayName = $derived(user.name || user.email);
	/** Up to two initials from the display name, falling back to the email's first letter. */
	const initials = $derived(
		displayName
			.split(/[\s@._-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]!.toUpperCase())
			.join('')
	);
</script>

<HeaderAction
	bind:isOpen
	icon={UserAvatar}
	closeIcon={UserAvatar}
	class="user-menu-trigger"
	aria-label={displayName}
>
	<svelte:fragment slot="textChildren">
		<span class="bx--header__action-text user-menu-trigger__name">{displayName}</span>
		<span class="user-menu-trigger__chevron" class:is-open={isOpen}>
			<ChevronDown size={16} />
		</span>
	</svelte:fragment>

	<div class="user-menu equipe-motion-fade">
		<div class="user-menu__identity">
			<span class="user-menu__avatar" aria-hidden="true">{initials}</span>
			<span class="user-menu__labels">
				<span class="user-menu__name">{displayName}</span>
				<span class="user-menu__email">{user.email}</span>
			</span>
		</div>
		<ul class="user-menu__actions">
			{#if isAdmin}
				<li>
					<a href={resolve('/admin/users')} onclick={() => (isOpen = false)}>
						<Settings size={16} />
						Admin – Users
					</a>
				</li>
			{/if}
			<li>
				<form method="post" action="/?/signOut">
					<button type="submit">
						<Logout size={16} />
						Sign out
					</button>
				</form>
			</li>
		</ul>
	</div>
</HeaderAction>

<style>
	/* Carbon only pads the icon side of a text action; even it out and keep the name readable. */
	:global(.bx--header__action.user-menu-trigger) {
		width: auto;
		padding-inline: var(--cds-spacing-04);
		gap: var(--cds-spacing-02);
		border-left: 1px solid var(--cds-border-subtle);
	}

	.user-menu-trigger__name {
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-menu-trigger__chevron {
		display: inline-flex;
		transition: transform 110ms cubic-bezier(0.2, 0, 0.38, 0.9);
	}

	.user-menu-trigger__chevron.is-open {
		transform: rotate(180deg);
	}

	@media (max-width: 42rem) {
		.user-menu-trigger__name,
		.user-menu-trigger__chevron {
			display: none;
		}
	}

	.user-menu {
		color: var(--cds-text-primary);
		min-width: 16rem;
	}

	.user-menu__identity {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-05);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.user-menu__avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--cds-interactive-01, var(--cds-link-primary));
		color: var(--cds-text-on-color, #fff);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.user-menu__labels {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-01);
		min-width: 0;
	}

	.user-menu__name {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.user-menu__email {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		overflow-wrap: anywhere;
	}

	.user-menu__actions {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.user-menu__actions form {
		display: contents;
	}

	.user-menu__actions a,
	.user-menu__actions button {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		width: 100%;
		padding: var(--cds-spacing-04) var(--cds-spacing-05);
		border: none;
		background: none;
		font: inherit;
		font-size: 0.875rem;
		color: inherit;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}

	.user-menu__actions a:hover,
	.user-menu__actions button:hover {
		background: var(--cds-layer-hover-01);
	}

	.user-menu__actions a:focus-visible,
	.user-menu__actions button:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: -2px;
	}
</style>

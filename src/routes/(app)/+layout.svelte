<script lang="ts">
	import { page } from '$app/state';
	import { onMount, type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import {
		Header,
		HeaderUtilities,
		HeaderAction,
		SideNav,
		SideNavItems,
		SideNavMenu,
		SideNavMenuItem,
		SideNavLink,
		SideNavDivider,
		Content
	} from 'carbon-components-svelte';
	import Home from 'carbon-icons-svelte/lib/Home.svelte';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import Settings from 'carbon-icons-svelte/lib/Settings.svelte';
	import ColorPalette from 'carbon-icons-svelte/lib/ColorPalette.svelte';
	import NotificationIcon from 'carbon-icons-svelte/lib/Notification.svelte';
	import NotificationNew from 'carbon-icons-svelte/lib/NotificationNew.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';
	import NotificationToast from '$lib/components/NotificationToast.svelte';
	import NotificationPanel from '$lib/components/NotificationPanel.svelte';
	import MeetingWidget from '$lib/components/MeetingWidget.svelte';
	import UserMenu from '$lib/components/UserMenu.svelte';
	import { notificationState } from '$lib/stores/notifications.svelte';
	import { meetingState } from '$lib/stores/meeting.svelte';
	import { messageOutbox } from '$lib/stores/messageOutbox.svelte';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: Snippet } = $props();

	let isSideNavOpen = $state(true);

	/*
	 * Header panels are mutually exclusive. Carbon's `HeaderAction` closes its own panel on an
	 * outside click, but its trigger button stops click propagation, so pressing one trigger
	 * never reaches the window listener that would dismiss the others — without this, the theme,
	 * notification and user panels stack on top of each other. Each action reports `on:open` and
	 * we close the siblings explicitly.
	 */
	type HeaderMenu = 'notifications' | 'theme' | 'user';
	let notificationsOpen = $state(false);
	let themeOpen = $state(false);
	let userMenuOpen = $state(false);

	function openOnly(menu: HeaderMenu) {
		notificationsOpen = menu === 'notifications';
		themeOpen = menu === 'theme';
		userMenuOpen = menu === 'user';
	}

	/*
	 * `persistentHamburgerMenu` keeps the toggle visible above Carbon's 1056px breakpoint,
	 * where the hamburger is otherwise hidden and the nav forced open. The trade-off is that
	 * Header then treats the nav as fully user-controlled and sets `isSideNavOpen = false`
	 * on mount, so the preference is restored here once that initial assignment has run.
	 */
	const SIDE_NAV_KEY = 'equipe-sidenav-open';
	let sideNavRestored = $state(false);

	onMount(() => {
		isSideNavOpen = localStorage.getItem(SIDE_NAV_KEY) !== 'false';
		sideNavRestored = true;

		// The open/close transition (see `.sidenav-motion` in layout.css) is enabled only once
		// the restored state has painted: the server renders the nav expanded, so a collapsed
		// preference would otherwise slide the nav away on every full page load.
		const frame = requestAnimationFrame(() =>
			requestAnimationFrame(() => document.documentElement.classList.add('sidenav-motion'))
		);
		return () => {
			cancelAnimationFrame(frame);
			document.documentElement.classList.remove('sidenav-motion');
		};
	});

	$effect(() => {
		if (sideNavRestored) localStorage.setItem(SIDE_NAV_KEY, String(isSideNavOpen));
	});

	const pathname = $derived(page.url.pathname);
	const hasUnread = $derived(notificationState.unreadCount > 0);
	const isOnMeetingPage = $derived(
		meetingState.meetingId !== null && pathname === `/meetings/${meetingState.meetingId}`
	);
	const showMeetingWidget = $derived(meetingState.isActive && !isOnMeetingPage);

	// On small screens the widget docks as a full-width bottom bar. Flag it on <html> so the
	// shell can reserve `--meeting-dock-height` and the bar never covers the chat composer.
	$effect(() => {
		if (!browser) return;
		document.documentElement.classList.toggle('meeting-docked', showMeetingWidget);
		return () => document.documentElement.classList.remove('meeting-docked');
	});

	$effect(() => {
		if (browser) {
			notificationState.connect();
			return () => {
				notificationState.disconnect();
				notificationState.clearAll();
				notificationState.history = [];
				messageOutbox.items = [];
			};
		}
	});
</script>

<Header bind:isSideNavOpen persistentHamburgerMenu href="/">
	<svelte:fragment slot="platform">
		<span class="header-logo"><Logo size={20} /></span>
		Equipe
	</svelte:fragment>
	<HeaderUtilities>
		<HeaderAction
			bind:isOpen={notificationsOpen}
			on:open={() => openOnly('notifications')}
			iconDescription={`Notifications (${notificationState.unreadCount} unread)`}
			icon={hasUnread ? NotificationNew : NotificationIcon}
		>
			<NotificationPanel onnavigate={() => (notificationsOpen = false)} />
		</HeaderAction>
		<HeaderAction
			bind:isOpen={themeOpen}
			on:open={() => openOnly('theme')}
			icon={ColorPalette}
			iconDescription="Theme"
		>
			<ThemeSelector />
		</HeaderAction>
		<UserMenu
			user={data.user}
			isAdmin={data.isAdmin}
			bind:isOpen={userMenuOpen}
			onopen={() => openOnly('user')}
		/>
	</HeaderUtilities>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
	<SideNavItems>
		<SideNavLink icon={Home} text="Dashboard" href="/" isSelected={pathname === '/'} />
		{#if data.teams.length > 0}
			<SideNavDivider />
			{#each data.teams as t (t.id)}
				<SideNavMenu icon={Chat} text={t.name} expanded={true}>
					{#each data.channels.filter((c) => c.teamId === t.id) as ch (ch.id)}
						<SideNavMenuItem
							href="/channels/{ch.id}"
							text="# {ch.name}"
							isSelected={pathname === `/channels/${ch.id}` ||
								pathname.startsWith(`/channels/${ch.id}/`)}
						/>
					{/each}
					<SideNavMenuItem
						href="/teams/{t.id}"
						text="Team settings"
						isSelected={pathname === `/teams/${t.id}`}
					/>
				</SideNavMenu>
			{/each}
			<SideNavDivider />
		{/if}
		<SideNavLink
			icon={VideoChat}
			text="Meetings"
			href="/meetings"
			isSelected={pathname.startsWith('/meetings')}
		/>
		<SideNavLink
			icon={DocumentMultiple01}
			text="Files"
			href="/files"
			isSelected={pathname.startsWith('/files')}
		/>
		{#if data.isAdmin}
			<SideNavDivider />
			<SideNavLink
				icon={Settings}
				text="Admin – Users"
				href="/admin/users"
				isSelected={pathname.startsWith('/admin')}
			/>
		{/if}
	</SideNavItems>
</SideNav>

<Content>
	{@render children()}
</Content>

<NotificationToast />

{#if showMeetingWidget}
	<MeetingWidget />
{/if}

<style>
	.header-logo {
		display: inline-flex;
		align-items: center;
		margin-right: var(--cds-spacing-03);
	}

	@media (max-width: 672px) {
		:global(.bx--content) {
			padding: var(--cds-spacing-04);
			padding-bottom: calc(var(--cds-spacing-04) + var(--meeting-dock-height));
		}
	}
</style>

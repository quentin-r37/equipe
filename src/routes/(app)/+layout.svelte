<script lang="ts">
	import { page } from '$app/state';
	import {
		Header,
		HeaderUtilities,
		HeaderAction,
		HeaderGlobalAction,
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
	import Logout from 'carbon-icons-svelte/lib/Logout.svelte';
	import UserAvatar from 'carbon-icons-svelte/lib/UserAvatar.svelte';
	import Settings from 'carbon-icons-svelte/lib/Settings.svelte';
	import type { LayoutServerData } from './$types';

	let { data, children }: { data: LayoutServerData; children: any } = $props();

	let isSideNavOpen = $state(false);

	const pathname = $derived(page.url.pathname);
</script>

<Header bind:isSideNavOpen href="/" companyName="Equipe">
	<HeaderUtilities>
		<HeaderGlobalAction aria-label={data.user.name} icon={UserAvatar} />
		<HeaderGlobalAction
			aria-label="Sign out"
			icon={Logout}
			onclick={() => {
				const form = document.getElementById('signout-form') as HTMLFormElement;
				form?.submit();
			}}
		/>
	</HeaderUtilities>
</Header>

<form id="signout-form" method="post" action="/?/signOut" style="display:none"></form>

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
							isSelected={pathname === `/channels/${ch.id}`}
						/>
					{/each}
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

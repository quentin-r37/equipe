<script lang="ts">
	import { ToastNotification } from 'carbon-components-svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { notificationState, type AppNotification } from '$lib/stores/notifications.svelte';
	import * as m from '$lib/paraglide/messages';

	function getKind(type: string): 'info' | 'info-square' | 'success' {
		switch (type) {
			case 'new_message':
				return 'info';
			case 'new_file':
				return 'info-square';
			case 'new_meeting':
				return 'success';
			default:
				return 'info';
		}
	}

	function getTitle(n: AppNotification): string {
		switch (n.type) {
			case 'new_message':
				return m.notification_new_message({
					userName: n.userName,
					channelName: n.channelName ?? ''
				});
			case 'new_file':
				return m.notification_new_file({ userName: n.userName, channelName: n.channelName ?? '' });
			case 'new_meeting':
				return m.notification_new_meeting({
					userName: n.userName,
					meetingTitle: n.meetingTitle ?? ''
				});
			default:
				return n.preview;
		}
	}

	function open(e: MouseEvent, n: AppNotification) {
		e.preventDefault();
		notificationState.dismiss(n.id);
		goto(resolve(n.href as Pathname));
	}
</script>

<!--
	The live region is always mounted so assistive tech announces the first toast too.
	Real-time notifications get a link in their title; local toasts (action feedback) are plain.
-->
<div class="notification-container" role="log" aria-live="polite">
	{#each notificationState.toasts as t (t.id)}
		<div class="notification-wrapper">
			<ToastNotification
				kind={t.kind}
				title={t.title}
				subtitle={t.subtitle ?? ''}
				lowContrast
				on:close={(e) => {
					e.preventDefault();
					notificationState.dismissToast(t.id);
				}}
			/>
		</div>
	{/each}
	{#each notificationState.notifications as n (n.id)}
		<div class="notification-wrapper">
			<ToastNotification
				kind={getKind(n.type)}
				subtitle="{n.channelName ? `#${n.channelName} — ` : ''}{n.teamName}"
				caption={n.preview}
				lowContrast
				on:close={(e) => {
					e.preventDefault();
					notificationState.dismiss(n.id);
				}}
			>
				<svelte:fragment slot="titleChildren">
					<a href={resolve(n.href as Pathname)} class="toast-link" onclick={(e) => open(e, n)}
						>{getTitle(n)}</a
					>
				</svelte:fragment>
			</ToastNotification>
		</div>
	{/each}
</div>

<style>
	.notification-container {
		position: fixed;
		top: 3rem;
		right: var(--cds-spacing-05);
		z-index: 9000;
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
		max-height: calc(100vh - 4rem);
		pointer-events: none;
	}

	.notification-wrapper {
		pointer-events: auto;
	}

	.toast-link {
		color: inherit;
		text-decoration: none;
	}

	.toast-link:hover,
	.toast-link:focus-visible {
		text-decoration: underline;
	}
</style>

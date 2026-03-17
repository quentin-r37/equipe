<script lang="ts">
	import { ToastNotification } from 'carbon-components-svelte';
	import { goto } from '$app/navigation';
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
				return m.notification_new_message({ userName: n.userName, channelName: n.channelName ?? '' });
			case 'new_file':
				return m.notification_new_file({ userName: n.userName, channelName: n.channelName ?? '' });
			case 'new_meeting':
				return m.notification_new_meeting({ userName: n.userName, meetingTitle: n.meetingTitle ?? '' });
			default:
				return '';
		}
	}

	function handleClick(n: AppNotification) {
		notificationState.dismiss(n.id);
		goto(n.href);
	}
</script>

{#if notificationState.notifications.length > 0}
	<div class="notification-container" role="log" aria-live="polite">
		{#each notificationState.notifications as n (n.id)}
			<div
				class="notification-wrapper"
				role="button"
				tabindex="0"
				onclick={() => handleClick(n)}
				onkeydown={(e) => e.key === 'Enter' && handleClick(n)}
			>
				<ToastNotification
					kind={getKind(n.type)}
					title={getTitle(n)}
					subtitle="{n.channelName ? `#${n.channelName} — ` : ''}{n.teamName}"
					caption={n.preview}
					lowContrast
					on:close={(e) => {
						e.preventDefault();
						notificationState.dismiss(n.id);
					}}
				/>
			</div>
		{/each}
	</div>
{/if}

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
		overflow-y: auto;
		pointer-events: none;
	}

	.notification-wrapper {
		pointer-events: auto;
		cursor: pointer;
	}

	.notification-wrapper:hover :global(.bx--toast-notification) {
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
	}
</style>

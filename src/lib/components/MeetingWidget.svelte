<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from 'carbon-components-svelte';
	import Microphone from 'carbon-icons-svelte/lib/Microphone.svelte';
	import MicrophoneOff from 'carbon-icons-svelte/lib/MicrophoneOff.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import VideoOff from 'carbon-icons-svelte/lib/VideoOff.svelte';
	import PhoneBlockFilled from 'carbon-icons-svelte/lib/PhoneBlockFilled.svelte';
	import Maximize from 'carbon-icons-svelte/lib/Maximize.svelte';
	import Screen from 'carbon-icons-svelte/lib/Screen.svelte';
	import { meetingState } from '$lib/stores/meeting.svelte';
	import VideoTrack from './VideoTrack.svelte';

	const localTrack = $derived(meetingState.getLocalVideoTrack());

	async function leave() {
		await meetingState.disconnect();
		goto('/meetings');
	}

	function returnToMeeting() {
		goto(`/meetings/${meetingState.meetingId}`);
	}
</script>

<div class="meeting-widget">
	<div class="widget-header">
		<span class="widget-title">{meetingState.meetingTitle}</span>
		<span class="widget-info">
			{meetingState.participants.length} participant{meetingState.participants.length !== 1
				? 's'
				: ''}
			{#if meetingState.screenShareParticipant}
				<Screen size={16} />
			{/if}
		</span>
	</div>

	<button class="widget-video" onclick={returnToMeeting}>
		{#if localTrack && meetingState.camEnabled}
			<VideoTrack track={localTrack} mirror={true} />
		{:else}
			<div class="cam-off-placeholder">
				<VideoOff size={24} />
			</div>
		{/if}
	</button>

	<div class="widget-controls">
		<Button
			size="small"
			kind={meetingState.micEnabled ? 'secondary' : 'danger'}
			icon={meetingState.micEnabled ? Microphone : MicrophoneOff}
			iconDescription={meetingState.micEnabled ? 'Mute' : 'Unmute'}
			on:click={() => meetingState.toggleMic()}
		/>
		<Button
			size="small"
			kind={meetingState.camEnabled ? 'secondary' : 'danger'}
			icon={meetingState.camEnabled ? VideoChat : VideoOff}
			iconDescription={meetingState.camEnabled ? 'Camera off' : 'Camera on'}
			on:click={() => meetingState.toggleCam()}
		/>
		<Button
			size="small"
			kind="primary"
			icon={Maximize}
			iconDescription="Return to meeting"
			on:click={returnToMeeting}
		/>
		<Button
			size="small"
			kind="danger"
			icon={PhoneBlockFilled}
			iconDescription="Leave meeting"
			on:click={leave}
		/>
	</div>
</div>

<style>
	.meeting-widget {
		position: fixed;
		bottom: var(--cds-spacing-07);
		right: var(--cds-spacing-07);
		z-index: 8000;
		width: 280px;
		background: var(--cds-layer-02);
		border: 1px solid var(--cds-border-subtle);
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
		overflow: hidden;
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.widget-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cds-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.widget-info {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-02);
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		flex-shrink: 0;
		margin-left: var(--cds-spacing-03);
	}

	.widget-video {
		display: block;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--cds-background-inverse);
		cursor: pointer;
		border: none;
		padding: 0;
	}

	.cam-off-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--cds-text-on-color);
	}

	.widget-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03);
	}

	@media (max-width: 672px) {
		.meeting-widget {
			bottom: var(--cds-spacing-05);
			right: var(--cds-spacing-05);
			width: 240px;
		}
	}
</style>

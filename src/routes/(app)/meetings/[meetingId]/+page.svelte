<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, Tag, InlineNotification } from 'carbon-components-svelte';
	import Microphone from 'carbon-icons-svelte/lib/Microphone.svelte';
	import MicrophoneOff from 'carbon-icons-svelte/lib/MicrophoneOff.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import VideoOff from 'carbon-icons-svelte/lib/VideoOff.svelte';
	import PhoneBlockFilled from 'carbon-icons-svelte/lib/PhoneBlockFilled.svelte';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import Screen from 'carbon-icons-svelte/lib/Screen.svelte';
	import ScreenOff from 'carbon-icons-svelte/lib/ScreenOff.svelte';
	import MeetingChat from '$lib/components/MeetingChat.svelte';
	import VideoTrack from '$lib/components/VideoTrack.svelte';
	import { meetingState } from '$lib/stores/meeting.svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	let chatOpen = $state(false);
	let screenShareVideoEl: HTMLDivElement | undefined = $state();

	function getInitials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	// Connect on mount (same timing as onMount — runs once after DOM is ready)
	onMount(() => {
		if (meetingState.meetingId !== data.meeting.id) {
			meetingState.connect(data.meeting.id, data.meeting.title, data.livekitUrl, data.token);
		}
	});

	// Attach local screen share track to the dedicated container
	$effect(() => {
		if (
			screenShareVideoEl &&
			meetingState.screenShareParticipant &&
			meetingState.screenShareParticipant === meetingState.room?.localParticipant?.identity
		) {
			const screenTrack = meetingState.getLocalScreenShareTrack();
			if (screenTrack && !screenShareVideoEl.querySelector('video')) {
				const el = screenTrack.attach();
				el.style.width = '100%';
				el.style.objectFit = 'contain';
				el.style.borderRadius = '8px';
				screenShareVideoEl.appendChild(el);
			}
		}
	});

	// Derived state from the store
	const screenShareTracks = $derived(
		meetingState.remoteTracks.filter((rt) => rt.source === 'screen_share')
	);
	const cameraTracks = $derived(meetingState.remoteTracks.filter((rt) => rt.source === 'camera'));
	const remoteParticipantsWithTracks = $derived(
		meetingState.remoteParticipantList.map((p) => ({
			...p,
			cameraTrack: cameraTracks.find((rt) => rt.participantIdentity === p.identity)?.track ?? null
		}))
	);

	async function leaveMeeting() {
		await meetingState.disconnect();
		goto('/meetings');
	}
</script>

<div class="meeting-wrapper" class:mobile-chat={chatOpen}>
	<div class="meeting-container">
		<div class="meeting-header">
			<div>
				<h2>{data.meeting.title}</h2>
				<div class="meeting-info">
					<Tag type={data.meeting.status === 'active' ? 'green' : 'gray'}>
						{data.meeting.status}
					</Tag>
					<span class="participant-count">
						{meetingState.participants.length} participant{meetingState.participants.length !== 1
							? 's'
							: ''}
					</span>
				</div>
			</div>
		</div>

		{#if meetingState.errorMsg}
			<div class="error-notice">
				<InlineNotification
					kind="error"
					title="Connection Error"
					subtitle={meetingState.errorMsg}
				/>
			</div>
		{/if}

		<div class="video-area" class:presenter-mode={meetingState.screenShareParticipant !== null}>
			{#if meetingState.screenShareParticipant !== null}
				<div class="screen-share-main" bind:this={screenShareVideoEl}>
					{#each screenShareTracks as st (st.participantIdentity)}
						<VideoTrack track={st.track} fit="contain" />
					{/each}
					<span class="video-label screen-share-label">
						{meetingState.getParticipantName(meetingState.screenShareParticipant)}'s screen
					</span>
				</div>
			{/if}

			<div class="video-grid">
				<div class="video-tile">
					{#if meetingState.localVideoTrack && meetingState.camEnabled}
						<VideoTrack track={meetingState.localVideoTrack} mirror={true} />
					{:else}
						<div class="cam-off">
							<span class="avatar">{getInitials(data.userName)}</span>
						</div>
					{/if}
					<span class="video-label">You</span>
				</div>

				{#each remoteParticipantsWithTracks as rp (rp.identity)}
					<div class="video-tile">
						{#if rp.cameraTrack}
							<VideoTrack track={rp.cameraTrack} />
						{:else}
							<div class="cam-off">
								<span class="avatar">{getInitials(rp.name)}</span>
							</div>
						{/if}
						<span class="video-label">{rp.name}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="controls">
			<Button
				kind={meetingState.micEnabled ? 'secondary' : 'danger'}
				icon={meetingState.micEnabled ? Microphone : MicrophoneOff}
				iconDescription={meetingState.micEnabled ? 'Mute' : 'Unmute'}
				on:click={() => meetingState.toggleMic()}
			/>
			<Button
				kind={meetingState.camEnabled ? 'secondary' : 'danger'}
				icon={meetingState.camEnabled ? VideoChat : VideoOff}
				iconDescription={meetingState.camEnabled ? 'Camera off' : 'Camera on'}
				on:click={() => meetingState.toggleCam()}
			/>
			<Button
				kind={meetingState.screenShareEnabled ? 'danger' : 'secondary'}
				icon={meetingState.screenShareEnabled ? ScreenOff : Screen}
				iconDescription={meetingState.screenShareEnabled ? 'Stop sharing' : 'Share screen'}
				on:click={() => meetingState.toggleScreenShare()}
				disabled={!meetingState.connected}
			/>
			{#if data.teamChannels.length > 0}
				<Button
					kind={chatOpen ? 'primary' : 'secondary'}
					icon={Chat}
					iconDescription={chatOpen ? 'Close chat' : 'Open chat'}
					on:click={() => (chatOpen = !chatOpen)}
				/>
			{/if}
			<Button
				kind="danger"
				icon={PhoneBlockFilled}
				iconDescription="Leave meeting"
				on:click={leaveMeeting}
			>
				Leave
			</Button>
		</div>
	</div>

	{#if chatOpen && data.teamChannels.length > 0}
		<div class="chat-panel">
			<MeetingChat
				channels={data.teamChannels}
				userId={data.userId}
				onclose={() => (chatOpen = false)}
			/>
		</div>
	{/if}
</div>

<style>
	.meeting-wrapper {
		display: flex;
		height: calc(100vh - 7rem);
		position: relative;
	}

	.meeting-container {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.meeting-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.meeting-info {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-02);
	}

	.participant-count {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.error-notice {
		padding: var(--cds-spacing-05);
	}

	.video-area {
		flex: 1;
		overflow: hidden;
		padding: var(--cds-spacing-05);
	}

	.video-grid {
		display: grid;
		height: 100%;
		gap: var(--cds-spacing-05);
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	}

	.video-tile {
		position: relative;
		overflow: hidden;
		border-radius: 8px;
		background: var(--cds-background-inverse);
	}

	.cam-off {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: var(--cds-interactive);
		color: var(--cds-text-on-color);
		font-size: 1.75rem;
		font-weight: 600;
		user-select: none;
	}

	.video-label {
		position: absolute;
		bottom: var(--cds-spacing-03);
		left: var(--cds-spacing-03);
		padding: var(--cds-spacing-01) var(--cds-spacing-03);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.6);
		font-size: 0.875rem;
		color: var(--cds-text-on-color);
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--cds-spacing-05);
		padding: var(--cds-spacing-05) 0;
		border-top: 1px solid var(--cds-border-subtle);
	}

	/* ── Presenter mode (screen share active) ── */
	.video-area.presenter-mode {
		display: flex;
		gap: var(--cds-spacing-05);
	}

	.screen-share-main {
		position: relative;
		flex: 1;
		min-width: 0;
		background: var(--cds-background-inverse);
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.screen-share-main :global(video) {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.screen-share-label {
		z-index: 1;
	}

	.video-area.presenter-mode .video-grid {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
		width: 200px;
		min-width: 200px;
		height: 100%;
		overflow-y: auto;
		grid-template-columns: unset;
	}

	.video-area.presenter-mode .video-grid .video-tile {
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
		flex-shrink: 0;
	}

	.video-area.presenter-mode .video-grid :global(video) {
		width: 100%;
		border-radius: 8px;
		aspect-ratio: 16 / 9;
		object-fit: cover;
	}

	/* ── Chat panel (desktop: sidebar) ── */
	.chat-panel {
		display: flex;
		height: 100%;
	}

	/* ── Mobile responsive ── */
	@media (max-width: 672px) {
		.meeting-wrapper {
			height: calc(100vh - 3rem);
			margin: calc(-1 * var(--cds-spacing-04));
			flex-direction: column;
		}

		.meeting-header {
			padding: var(--cds-spacing-03) var(--cds-spacing-04);
		}

		.meeting-header h2 {
			font-size: 1rem;
		}

		.video-area {
			padding: var(--cds-spacing-03);
		}

		.video-grid {
			grid-template-columns: 1fr;
			gap: var(--cds-spacing-03);
		}

		.controls {
			gap: var(--cds-spacing-03);
			padding: var(--cds-spacing-03) 0;
		}

		/* Presenter mode on mobile */
		.video-area.presenter-mode {
			flex-direction: column;
		}

		.video-area.presenter-mode .video-grid {
			flex-direction: row;
			width: 100%;
			min-width: unset;
			height: 80px;
			overflow-x: auto;
			overflow-y: hidden;
		}

		.video-area.presenter-mode .video-grid .video-tile {
			width: 120px;
			min-width: 120px;
			height: 100%;
			aspect-ratio: unset;
		}

		/* When chat is open on mobile: hide video, show chat full-width */
		.mobile-chat .meeting-container {
			flex: none;
		}

		.mobile-chat .meeting-container .video-area,
		.mobile-chat .meeting-container .meeting-header {
			display: none;
		}

		.mobile-chat .chat-panel {
			flex: 1;
			min-height: 0;
		}
	}
</style>

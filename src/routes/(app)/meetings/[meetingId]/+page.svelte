<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, Tile, Tag, InlineNotification } from 'carbon-components-svelte';
	import Microphone from 'carbon-icons-svelte/lib/Microphone.svelte';
	import MicrophoneOff from 'carbon-icons-svelte/lib/MicrophoneOff.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import VideoOff from 'carbon-icons-svelte/lib/VideoOff.svelte';
	import PhoneBlockFilled from 'carbon-icons-svelte/lib/PhoneBlockFilled.svelte';
	import Chat from 'carbon-icons-svelte/lib/Chat.svelte';
	import Screen from 'carbon-icons-svelte/lib/Screen.svelte';
	import ScreenOff from 'carbon-icons-svelte/lib/ScreenOff.svelte';
	import MeetingChat from '$lib/components/MeetingChat.svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	let chatOpen = $state(false);

	let videoGrid: HTMLDivElement | undefined = $state();
	let localVideoEl: HTMLVideoElement | undefined = $state();
	let room: any = $state(null);
	let connected = $state(false);
	let micEnabled = $state(true);
	let camEnabled = $state(true);
	let participants = $state<string[]>([]);
	let errorMsg = $state('');
	let screenShareEnabled = $state(false);
	let screenShareParticipant = $state<string | null>(null);
	let screenShareVideoEl: HTMLDivElement | undefined = $state();
	let TrackRef: any;

	onMount(async () => {
		try {
			const { Room, RoomEvent, Track } = await import('livekit-client');
			TrackRef = Track;

			room = new Room();

			room.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
				if (track.kind === Track.Kind.Video) {
					const el = track.attach();
					el.style.width = '100%';
					el.style.borderRadius = '8px';
					el.dataset.participantId = participant.identity;

					if (publication.source === Track.Source.ScreenShare) {
						el.style.objectFit = 'contain';
						screenShareParticipant = participant.identity;
						screenShareVideoEl
							?.querySelectorAll('video')
							.forEach((v: Element) => v.remove());
						screenShareVideoEl?.appendChild(el);
					} else {
						videoGrid?.appendChild(el);
					}
				} else if (track.kind === Track.Kind.Audio) {
					const el = track.attach();
					el.style.display = 'none';
					document.body.appendChild(el);
				}
			});

			room.on(RoomEvent.TrackUnsubscribed, (track: any, publication: any, participant: any) => {
				track.detach().forEach((el: HTMLElement) => el.remove());
				if (
					publication.source === Track.Source.ScreenShare &&
					screenShareParticipant === participant.identity
				) {
					screenShareParticipant = null;
				}
			});

			room.on(RoomEvent.ParticipantConnected, () => {
				updateParticipants();
			});

			room.on(RoomEvent.ParticipantDisconnected, () => {
				updateParticipants();
			});

			room.on(RoomEvent.Disconnected, () => {
				connected = false;
				screenShareEnabled = false;
				screenShareParticipant = null;
			});

			room.on(RoomEvent.LocalTrackUnpublished, (publication: any) => {
				if (publication.source === Track.Source.ScreenShare) {
					screenShareEnabled = false;
					screenShareParticipant = null;
					screenShareVideoEl
						?.querySelectorAll('video')
						.forEach((el: Element) => el.remove());
				}
			});

			room.on(RoomEvent.TrackPublished, (publication: any, participant: any) => {
				if (publication.source === Track.Source.ScreenShare) {
					screenShareParticipant = participant.identity;
				}
			});

			room.on(RoomEvent.TrackUnpublished, (publication: any, participant: any) => {
				if (
					publication.source === Track.Source.ScreenShare &&
					screenShareParticipant === participant.identity
				) {
					screenShareParticipant = null;
				}
			});

			await room.connect(data.livekitUrl, data.token);
			connected = true;

			await room.localParticipant.enableCameraAndMicrophone();

			const localVideoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
			if (localVideoTrack && localVideoEl) {
				localVideoTrack.attach(localVideoEl);
			}

			updateParticipants();

			// Check for existing screen shares from remote participants
			for (const p of room.remoteParticipants.values()) {
				const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
				if (screenPub && screenPub.isSubscribed && screenPub.track) {
					screenShareParticipant = p.identity;
					break;
				}
			}
		} catch (err: any) {
			errorMsg = err.message || 'Failed to connect to meeting';
		}
	});

	function updateParticipants() {
		if (!room) return;
		const names = [room.localParticipant.name || 'You'];
		for (const p of room.remoteParticipants.values()) {
			names.push(p.name || p.identity);
		}
		participants = names;
	}

	async function toggleMic() {
		if (!room) return;
		await room.localParticipant.setMicrophoneEnabled(!micEnabled);
		micEnabled = !micEnabled;
	}

	async function toggleCam() {
		if (!room) return;
		await room.localParticipant.setCameraEnabled(!camEnabled);
		camEnabled = !camEnabled;
	}

	async function toggleScreenShare() {
		if (!room) return;

		if (
			!screenShareEnabled &&
			screenShareParticipant &&
			screenShareParticipant !== room.localParticipant.identity
		) {
			errorMsg = `${getParticipantName(screenShareParticipant)} is already sharing their screen`;
			setTimeout(() => {
				if (errorMsg.includes('already sharing')) errorMsg = '';
			}, 4000);
			return;
		}

		try {
			if (!screenShareEnabled) {
				await room.localParticipant.setScreenShareEnabled(true, { audio: true });
				screenShareEnabled = true;
				screenShareParticipant = room.localParticipant.identity;
			} else {
				await room.localParticipant.setScreenShareEnabled(false);
				screenShareEnabled = false;
				screenShareParticipant = null;
				screenShareVideoEl
					?.querySelectorAll('video')
					.forEach((el: Element) => el.remove());
			}
		} catch (err: any) {
			if (err.name === 'NotAllowedError') return;
			errorMsg = err.message || 'Failed to share screen';
		}
	}

	function getParticipantName(identity: string): string {
		if (identity === room?.localParticipant?.identity) return 'You';
		const remote = room?.remoteParticipants?.get(identity);
		return remote?.name || remote?.identity || 'Someone';
	}

	$effect(() => {
		if (screenShareParticipant && screenShareVideoEl && room && TrackRef) {
			if (screenShareParticipant === room.localParticipant.identity) {
				const screenTrack =
					room.localParticipant.getTrackPublication(TrackRef.Source.ScreenShare)?.track;
				if (screenTrack && !screenShareVideoEl.querySelector('video')) {
					const el = screenTrack.attach();
					el.style.width = '100%';
					el.style.objectFit = 'contain';
					el.style.borderRadius = '8px';
					screenShareVideoEl.appendChild(el);
				}
			}
		}
	});

	async function leaveMeeting() {
		room?.disconnect();
		goto('/meetings');
	}

	onDestroy(() => {
		room?.disconnect();
	});
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
						{participants.length} participant{participants.length !== 1 ? 's' : ''}
					</span>
				</div>
			</div>
		</div>

		{#if errorMsg}
			<div class="error-notice">
				<InlineNotification kind="error" title="Connection Error" subtitle={errorMsg} />
			</div>
		{/if}

		<div class="video-area" class:presenter-mode={screenShareParticipant !== null}>
			{#if screenShareParticipant !== null}
				<div class="screen-share-main" bind:this={screenShareVideoEl}>
					<span class="video-label screen-share-label">
						{getParticipantName(screenShareParticipant)}'s screen
					</span>
				</div>
			{/if}

			<div bind:this={videoGrid} class="video-grid">
				<div class="video-tile">
					<video
						bind:this={localVideoEl}
						autoplay
						muted
						playsinline
						class="video-element"
						style="transform: scaleX(-1)"
					></video>
					<span class="video-label">You</span>
				</div>
			</div>
		</div>

		<div class="controls">
			<Button
				kind={micEnabled ? 'secondary' : 'danger'}
				icon={micEnabled ? Microphone : MicrophoneOff}
				iconDescription={micEnabled ? 'Mute' : 'Unmute'}
				on:click={toggleMic}
			/>
			<Button
				kind={camEnabled ? 'secondary' : 'danger'}
				icon={camEnabled ? VideoChat : VideoOff}
				iconDescription={camEnabled ? 'Camera off' : 'Camera on'}
				on:click={toggleCam}
			/>
			<Button
				kind={screenShareEnabled ? 'danger' : 'secondary'}
				icon={screenShareEnabled ? ScreenOff : Screen}
				iconDescription={screenShareEnabled ? 'Stop sharing' : 'Share screen'}
				on:click={toggleScreenShare}
				disabled={!connected}
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

	.video-element {
		width: 100%;
		height: 100%;
		object-fit: cover;
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

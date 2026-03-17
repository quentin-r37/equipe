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

	onMount(async () => {
		try {
			const { Room, RoomEvent, Track } = await import('livekit-client');

			room = new Room();

			room.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
				if (track.kind === Track.Kind.Video) {
					const el = track.attach();
					el.style.width = '100%';
					el.style.borderRadius = '8px';
					el.dataset.participantId = participant.identity;
					videoGrid?.appendChild(el);
				} else if (track.kind === Track.Kind.Audio) {
					const el = track.attach();
					el.style.display = 'none';
					videoGrid?.appendChild(el);
				}
			});

			room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
				track.detach().forEach((el: HTMLElement) => el.remove());
			});

			room.on(RoomEvent.ParticipantConnected, () => {
				updateParticipants();
			});

			room.on(RoomEvent.ParticipantDisconnected, () => {
				updateParticipants();
			});

			room.on(RoomEvent.Disconnected, () => {
				connected = false;
			});

			await room.connect(data.livekitUrl, data.token);
			connected = true;

			await room.localParticipant.enableCameraAndMicrophone();

			const localVideoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
			if (localVideoTrack && localVideoEl) {
				localVideoTrack.attach(localVideoEl);
			}

			updateParticipants();
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

	async function leaveMeeting() {
		room?.disconnect();
		goto('/meetings');
	}

	onDestroy(() => {
		room?.disconnect();
	});
</script>

<div class="meeting-wrapper">
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

		<div class="video-area">
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
		<MeetingChat
			channels={data.teamChannels}
			userId={data.userId}
			onclose={() => (chatOpen = false)}
		/>
	{/if}
</div>

<style>
	.meeting-wrapper {
		display: flex;
		height: calc(100vh - 7rem);
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
</style>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, Tile, Tag, InlineNotification } from 'carbon-components-svelte';
	import Microphone from 'carbon-icons-svelte/lib/Microphone.svelte';
	import MicrophoneOff from 'carbon-icons-svelte/lib/MicrophoneOff.svelte';
	import VideoChat from 'carbon-icons-svelte/lib/VideoChat.svelte';
	import VideoOff from 'carbon-icons-svelte/lib/VideoOff.svelte';
	import PhoneBlockFilled from 'carbon-icons-svelte/lib/PhoneBlockFilled.svelte';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

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

			// Publish local tracks
			await room.localParticipant.enableCameraAndMicrophone();

			// Attach local video
			const localVideoTrack = room.localParticipant.getTrackPublication(
				Track.Source.Camera
			)?.track;
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

<div class="flex h-[calc(100vh-7rem)] flex-col">
	<!-- Meeting header -->
	<div class="flex items-center justify-between border-b border-gray-200 px-6 py-3">
		<div>
			<h2 class="text-xl font-semibold">{data.meeting.title}</h2>
			<div class="mt-1 flex items-center gap-2">
				<Tag type={data.meeting.status === 'active' ? 'green' : 'gray'}>
					{data.meeting.status}
				</Tag>
				<span class="text-sm text-gray-500">
					{participants.length} participant{participants.length !== 1 ? 's' : ''}
				</span>
			</div>
		</div>
	</div>

	{#if errorMsg}
		<InlineNotification kind="error" title="Connection Error" subtitle={errorMsg} class="m-4" />
	{/if}

	<!-- Video grid -->
	<div class="flex-1 overflow-hidden p-4">
		<div
			bind:this={videoGrid}
			class="grid h-full gap-4"
			style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));"
		>
			<!-- Local video -->
			<div class="relative overflow-hidden rounded-lg bg-gray-900">
				<video
					bind:this={localVideoEl}
					autoplay
					muted
					playsinline
					class="h-full w-full object-cover"
					style="transform: scaleX(-1)"
				></video>
				<span
					class="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-sm text-white"
				>
					You
				</span>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="flex items-center justify-center gap-4 border-t border-gray-200 py-4">
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
			kind="danger"
			icon={PhoneBlockFilled}
			iconDescription="Leave meeting"
			on:click={leaveMeeting}
		>
			Leave
		</Button>
	</div>
</div>

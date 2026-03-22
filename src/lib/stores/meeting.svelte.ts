import { browser } from '$app/environment';

export interface RemoteTrackInfo {
	participantIdentity: string;
	participantName: string;
	track: any;
	source: string;
}

class MeetingState {
	room: any = $state(null);
	connected = $state(false);
	meetingId: string | null = $state(null);
	meetingTitle: string | null = $state(null);
	micEnabled = $state(true);
	camEnabled = $state(true);
	screenShareEnabled = $state(false);
	screenShareParticipant: string | null = $state(null);
	participants: string[] = $state([]);
	errorMsg = $state('');
	remoteTracks: RemoteTrackInfo[] = $state([]);

	isActive = $derived(this.connected && this.room !== null);

	private Track: any = null;
	private RoomEvent: any = null;
	private RoomClass: any = null;
	private audioElements: HTMLElement[] = [];
	private handleBeforeUnload = () => this.room?.disconnect();

	async connect(meetingId: string, meetingTitle: string, livekitUrl: string, token: string) {
		if (!browser) return;

		// Already connected to this meeting
		if (this.meetingId === meetingId && this.connected) return;

		// Connected to a different meeting — disconnect first
		if (this.connected) {
			await this.disconnect();
		}

		try {
			const lk = await import('livekit-client');
			this.Track = lk.Track;
			this.RoomEvent = lk.RoomEvent;
			this.RoomClass = lk.Room;

			this.meetingId = meetingId;
			this.meetingTitle = meetingTitle;

			const room = new this.RoomClass();
			this.room = room;

			this.setupEventListeners();

			await room.connect(livekitUrl, token);
			this.connected = true;

			await room.localParticipant.enableCameraAndMicrophone();
			this.micEnabled = true;
			this.camEnabled = true;

			this.updateParticipants();
			this.detectExistingScreenShare();

			window.addEventListener('beforeunload', this.handleBeforeUnload);
		} catch (err: any) {
			this.errorMsg = err.message || 'Failed to connect to meeting';
		}
	}

	async disconnect() {
		if (!browser) return;

		window.removeEventListener('beforeunload', this.handleBeforeUnload);

		this.room?.disconnect();

		// Clean up audio elements
		for (const el of this.audioElements) {
			el.remove();
		}
		this.audioElements = [];

		this.room = null;
		this.connected = false;
		this.meetingId = null;
		this.meetingTitle = null;
		this.micEnabled = true;
		this.camEnabled = true;
		this.screenShareEnabled = false;
		this.screenShareParticipant = null;
		this.participants = [];
		this.errorMsg = '';
		this.remoteTracks = [];
	}

	async toggleMic() {
		if (!this.room) return;
		await this.room.localParticipant.setMicrophoneEnabled(!this.micEnabled);
		this.micEnabled = !this.micEnabled;
	}

	async toggleCam() {
		if (!this.room) return;
		await this.room.localParticipant.setCameraEnabled(!this.camEnabled);
		this.camEnabled = !this.camEnabled;
	}

	async toggleScreenShare() {
		if (!this.room) return;

		if (
			!this.screenShareEnabled &&
			this.screenShareParticipant &&
			this.screenShareParticipant !== this.room.localParticipant.identity
		) {
			this.errorMsg = `${this.getParticipantName(this.screenShareParticipant)} is already sharing their screen`;
			setTimeout(() => {
				if (this.errorMsg.includes('already sharing')) this.errorMsg = '';
			}, 4000);
			return;
		}

		try {
			if (!this.screenShareEnabled) {
				await this.room.localParticipant.setScreenShareEnabled(true, { audio: true });
				this.screenShareEnabled = true;
				this.screenShareParticipant = this.room.localParticipant.identity;
			} else {
				await this.room.localParticipant.setScreenShareEnabled(false);
				this.screenShareEnabled = false;
				this.screenShareParticipant = null;
			}
		} catch (err: any) {
			if (err.name === 'NotAllowedError') return;
			this.errorMsg = err.message || 'Failed to share screen';
		}
	}

	getLocalVideoTrack() {
		if (!this.room || !this.Track) return null;
		return this.room.localParticipant.getTrackPublication(this.Track.Source.Camera)?.track ?? null;
	}

	getLocalScreenShareTrack() {
		if (!this.room || !this.Track) return null;
		return (
			this.room.localParticipant.getTrackPublication(this.Track.Source.ScreenShare)?.track ?? null
		);
	}

	getParticipantName(identity: string): string {
		if (identity === this.room?.localParticipant?.identity) return 'You';
		const remote = this.room?.remoteParticipants?.get(identity);
		return remote?.name || remote?.identity || 'Someone';
	}

	private setupEventListeners() {
		const room = this.room;
		const { Track } = this;
		const RE = this.RoomEvent;

		room.on(RE.TrackSubscribed, (track: any, publication: any, participant: any) => {
			if (track.kind === Track.Kind.Video) {
				const source = publication.source === Track.Source.ScreenShare ? 'screen_share' : 'camera';

				if (source === 'screen_share') {
					this.screenShareParticipant = participant.identity;
				}

				this.remoteTracks = [
					...this.remoteTracks,
					{
						participantIdentity: participant.identity,
						participantName: participant.name || participant.identity,
						track,
						source
					}
				];
			} else if (track.kind === Track.Kind.Audio) {
				const el = track.attach();
				el.style.display = 'none';
				document.body.appendChild(el);
				this.audioElements.push(el);
			}
		});

		room.on(RE.TrackUnsubscribed, (track: any, publication: any, participant: any) => {
			// Remove from remoteTracks
			this.remoteTracks = this.remoteTracks.filter((rt) => rt.track !== track);

			// Detach from any DOM elements
			track.detach().forEach((el: HTMLElement) => el.remove());

			// Clean up audio element references
			this.audioElements = this.audioElements.filter((el) => document.body.contains(el));

			if (
				publication.source === Track.Source.ScreenShare &&
				this.screenShareParticipant === participant.identity
			) {
				this.screenShareParticipant = null;
			}
		});

		room.on(RE.ParticipantConnected, () => this.updateParticipants());
		room.on(RE.ParticipantDisconnected, () => this.updateParticipants());

		room.on(RE.Disconnected, () => {
			this.connected = false;
			this.screenShareEnabled = false;
			this.screenShareParticipant = null;
		});

		room.on(RE.LocalTrackUnpublished, (publication: any) => {
			if (publication.source === Track.Source.ScreenShare) {
				this.screenShareEnabled = false;
				this.screenShareParticipant = null;
			}
		});

		room.on(RE.TrackPublished, (publication: any, participant: any) => {
			if (publication.source === Track.Source.ScreenShare) {
				this.screenShareParticipant = participant.identity;
			}
		});

		room.on(RE.TrackUnpublished, (publication: any, participant: any) => {
			if (
				publication.source === Track.Source.ScreenShare &&
				this.screenShareParticipant === participant.identity
			) {
				this.screenShareParticipant = null;
			}
		});
	}

	private updateParticipants() {
		if (!this.room) return;
		const names = [this.room.localParticipant.name || 'You'];
		for (const p of this.room.remoteParticipants.values()) {
			names.push(p.name || p.identity);
		}
		this.participants = names;
	}

	private detectExistingScreenShare() {
		if (!this.room || !this.Track) return;
		for (const p of this.room.remoteParticipants.values()) {
			const screenPub = p.getTrackPublication(this.Track.Source.ScreenShare);
			if (screenPub && screenPub.isSubscribed && screenPub.track) {
				this.screenShareParticipant = p.identity;
				break;
			}
		}
	}
}

export const meetingState = new MeetingState();

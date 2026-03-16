import { AccessToken } from 'livekit-server-sdk';
import { env } from '$env/dynamic/private';

export async function createRoomToken(
	roomName: string,
	participantName: string,
	participantId: string
) {
	const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
		identity: participantId,
		name: participantName
	});
	token.addGrant({
		room: roomName,
		roomJoin: true,
		canPublish: true,
		canSubscribe: true
	});
	return await token.toJwt();
}

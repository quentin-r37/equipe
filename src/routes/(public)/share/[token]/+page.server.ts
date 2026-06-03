import type { PageServerLoad } from './$types';
import { resolveActiveShare } from '$lib/server/fileShare';

export const load: PageServerLoad = async ({ params }) => {
	const active = await resolveActiveShare(params.token);

	if (!active) {
		return { expired: true as const };
	}

	const { file } = active;

	// Anonymous: expose only the file itself, never the sharer or team.
	return {
		expired: false as const,
		token: params.token,
		name: file.name,
		size: file.size,
		mimeType: file.mimeType
	};
};

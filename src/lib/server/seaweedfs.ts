import { env } from '$env/dynamic/private';

function filerUrl() {
	return env.SEAWEEDFS_FILER_URL || 'http://localhost:8888';
}

export async function uploadFile(path: string, data: Blob, filename: string): Promise<void> {
	const formData = new FormData();
	formData.append('file', data, filename);
	const res = await fetch(`${filerUrl()}/${path}`, { method: 'POST', body: formData });
	if (!res.ok) throw new Error(`SeaweedFS upload failed: ${res.statusText}`);
}

export async function downloadFile(path: string): Promise<Response> {
	const res = await fetch(`${filerUrl()}/${path}`);
	if (!res.ok) throw new Error(`SeaweedFS download failed: ${res.statusText}`);
	return res;
}

export async function deleteFile(path: string): Promise<void> {
	await fetch(`${filerUrl()}/${path}`, { method: 'DELETE' });
}

/**
 * Shared (client + server) file helpers.
 */

/** Maximum accepted upload size. Must match BODY_SIZE_LIMIT in production. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message when a file cannot be uploaded, or null when it is acceptable. */
export function validateUpload(file: File): string | null {
	if (file.size === 0) return 'The selected file is empty.';
	if (file.size > MAX_UPLOAD_BYTES) {
		return `"${file.name}" is too large (${formatSize(file.size)}). Maximum size is ${formatSize(MAX_UPLOAD_BYTES)}.`;
	}
	return null;
}

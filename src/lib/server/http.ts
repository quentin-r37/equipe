/**
 * Build a Content-Disposition header value that is safe for filenames containing
 * non-Latin-1 characters (accents, curly quotes, emoji...). HTTP headers only accept
 * ByteString values, so the real name is sent via the RFC 5987 `filename*` parameter
 * with an ASCII fallback in `filename`.
 */
export function contentDisposition(type: 'attachment' | 'inline', filename: string): string {
	// ASCII fallback: strip diacritics, replace remaining non-ASCII chars and quotes.
	const fallback =
		filename
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^\x20-\x7e]/g, '_')
			.replace(/["\\]/g, '_') || 'download';

	const encoded = encodeURIComponent(filename)
		.replace(/['()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
		.replace(/\*/g, '%2A');

	return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

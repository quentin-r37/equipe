import { browser } from '$app/environment';

export const accentOptions = [
	{ id: 'blue', text: 'Blue', color: '#0f62fe' },
	{ id: 'teal', text: 'Teal', color: '#009d9a' },
	{ id: 'purple', text: 'Purple', color: '#8a3ffc' },
	{ id: 'magenta', text: 'Magenta', color: '#ee5396' },
	{ id: 'cyan', text: 'Cyan', color: '#1192e8' },
	{ id: 'green', text: 'Green', color: '#198038' }
];

const ACCENT_KEY = 'equipe-accent';

const ACCENT_TOKENS = [
	'--cds-interactive-01',
	'--cds-interactive-04',
	'--cds-link-01',
	'--cds-link-primary',
	'--cds-link-primary-hover',
	'--cds-focus',
	'--cds-border-interactive',
	'--cds-interactive',
	'--cds-background-brand',
	'--cds-hover-primary',
	'--cds-active-primary'
];

export function applyAccent(accentId: string) {
	if (!browser) return;
	const accent = accentOptions.find((a) => a.id === accentId);
	if (!accent) return;
	const root = document.documentElement.style;
	for (const token of ACCENT_TOKENS) {
		root.setProperty(token, accent.color);
	}
	localStorage.setItem(ACCENT_KEY, accentId);
}

export function loadAccent(): string {
	if (browser) {
		return localStorage.getItem(ACCENT_KEY) || 'blue';
	}
	return 'blue';
}

import { browser } from '$app/environment';

export type CarbonTheme = 'white' | 'g10' | 'g80' | 'g90' | 'g100';

export const themeOptions: { id: CarbonTheme; text: string }[] = [
	{ id: 'white', text: 'White' },
	{ id: 'g10', text: 'Gray 10' },
	{ id: 'g80', text: 'Gray 80' },
	{ id: 'g90', text: 'Gray 90' },
	{ id: 'g100', text: 'Gray 100' }
];

export const accentOptions = [
	{ id: 'blue', text: 'Blue', color: '#0f62fe' },
	{ id: 'teal', text: 'Teal', color: '#009d9a' },
	{ id: 'purple', text: 'Purple', color: '#8a3ffc' },
	{ id: 'magenta', text: 'Magenta', color: '#ee5396' },
	{ id: 'cyan', text: 'Cyan', color: '#1192e8' },
	{ id: 'green', text: 'Green', color: '#198038' }
];

const THEME_KEY = 'equipe-theme';
const ACCENT_KEY = 'equipe-accent';

function loadTheme(): CarbonTheme {
	if (browser) {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved && themeOptions.some((t) => t.id === saved)) {
			return saved as CarbonTheme;
		}
	}
	return 'white';
}

function loadAccent(): string {
	if (browser) {
		return localStorage.getItem(ACCENT_KEY) || 'blue';
	}
	return 'blue';
}

let currentTheme = $state<CarbonTheme>(loadTheme());
let currentAccent = $state<string>(loadAccent());

function applyTheme(theme: CarbonTheme) {
	if (browser) {
		document.documentElement.setAttribute('theme', theme);
	}
}

function applyAccent(accentId: string) {
	if (browser) {
		const accent = accentOptions.find((a) => a.id === accentId);
		if (accent) {
			const root = document.documentElement.style;
			// Primary interactive color (buttons, links, focus rings)
			root.setProperty('--cds-interactive-01', accent.color);
			root.setProperty('--cds-interactive-04', accent.color);
			root.setProperty('--cds-link-01', accent.color);
			root.setProperty('--cds-link-primary', accent.color);
			root.setProperty('--cds-link-primary-hover', accent.color);
			root.setProperty('--cds-focus', accent.color);
			root.setProperty('--cds-border-interactive', accent.color);
			root.setProperty('--cds-interactive', accent.color);
			root.setProperty('--cds-background-brand', accent.color);
			// Hover / active states for primary buttons
			root.setProperty('--cds-hover-primary', accent.color);
			root.setProperty('--cds-active-primary', accent.color);
		}
	}
}

export const themeStore = {
	get theme() {
		return currentTheme;
	},
	set theme(value: CarbonTheme) {
		currentTheme = value;
		if (browser) {
			localStorage.setItem(THEME_KEY, value);
			applyTheme(value);
		}
	},
	get accent() {
		return currentAccent;
	},
	set accent(value: string) {
		currentAccent = value;
		if (browser) {
			localStorage.setItem(ACCENT_KEY, value);
			applyAccent(value);
		}
	},
	/** Call once on app init to apply saved preferences */
	init() {
		applyTheme(currentTheme);
		applyAccent(currentAccent);
	}
};

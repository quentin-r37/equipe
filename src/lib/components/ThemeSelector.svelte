<script lang="ts">
	import { Dropdown } from 'carbon-components-svelte';
	import { themeStore, themeOptions, accentOptions } from '$lib/stores/theme.svelte';
	import type { CarbonTheme } from '$lib/stores/theme.svelte';

	let selectedTheme = $state(themeStore.theme);
	let selectedAccent = $state(themeStore.accent);

	$effect(() => {
		themeStore.theme = selectedTheme as CarbonTheme;
	});

	$effect(() => {
		themeStore.accent = selectedAccent;
	});
</script>

<div class="theme-selector">
	<div class="theme-selector__field">
		<Dropdown
			labelText="Theme"
			size="sm"
			items={themeOptions}
			bind:selectedId={selectedTheme}
		/>
	</div>
	<div class="theme-selector__field">
		<Dropdown
			labelText="Accent color"
			size="sm"
			items={accentOptions}
			bind:selectedId={selectedAccent}
		/>
	</div>
</div>

<style>
	.theme-selector {
		padding: var(--cds-spacing-05);
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
	}

	.theme-selector__field {
		width: 100%;
	}
</style>

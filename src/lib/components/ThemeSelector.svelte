<script lang="ts">
	import { Theme, Select, SelectItem } from 'carbon-components-svelte';
	import type { CarbonTheme } from 'carbon-components-svelte/src/Theme/Theme.svelte';
	import { accentOptions, applyAccent, loadAccent } from '$lib/stores/theme.svelte';

	let selectedAccent = $state(loadAccent());

	$effect(() => {
		applyAccent(selectedAccent);
	});
</script>

<div class="theme-selector">
	<Theme render="select" persist persistKey="theme" />
	<Select
		labelText="Accent color"
		size="sm"
		bind:selected={selectedAccent}
	>
		{#each accentOptions as option (option.id)}
			<SelectItem value={option.id} text={option.text} />
		{/each}
	</Select>
</div>

<style>
	.theme-selector {
		padding: var(--cds-spacing-05);
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
	}

	.theme-selector :global(.bx--select),
	.theme-selector :global(.bx--form-item) {
		width: 100%;
	}
</style>

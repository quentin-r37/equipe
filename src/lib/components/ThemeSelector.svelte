<script lang="ts">
	import { Select, SelectItem } from 'carbon-components-svelte';
	import {
		accentOptions,
		applyAccent,
		loadAccent,
		themeState,
		themeOptions
	} from '$lib/stores/theme.svelte';

	let selectedAccent = $state(loadAccent());

	$effect(() => {
		applyAccent(selectedAccent);
	});
</script>

<div class="theme-selector" data-carbon-theme="g100">
	<Select labelText="Theme" size="sm" bind:selected={themeState.current}>
		{#each themeOptions as option (option.id)}
			<SelectItem value={option.id} text={option.text} />
		{/each}
	</Select>
	<Select labelText="Accent color" size="sm" bind:selected={selectedAccent}>
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

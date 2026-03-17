<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import 'carbon-components-svelte/css/all.css';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { applyAccent, loadAccent, themeState } from '$lib/stores/theme.svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	$effect(() => {
		if (browser) {
			applyAccent(loadAccent());
		}
	});

	$effect(() => {
		if (browser) {
			document.documentElement.setAttribute('data-carbon-theme', themeState.current);
			localStorage.setItem('theme', themeState.current);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>

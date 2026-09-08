<script lang="ts">
	import { page } from '$app/state';
	import ErrorView from '$lib/components/ErrorView.svelte';
</script>

<div class="error-page">
	<ErrorView status={page.status} message={page.error?.message} showLogo />
</div>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cds-layer-01);
	}
</style>

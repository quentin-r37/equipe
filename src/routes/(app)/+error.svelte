<script lang="ts">
	import { page } from '$app/state';
	import ErrorView from '$lib/components/ErrorView.svelte';
</script>

<!-- Rendered inside the app shell so the sidebar and header stay available. -->
<ErrorView status={page.status} message={page.error?.message} />

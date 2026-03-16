<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<h1>Hi, {data.user.name}!</h1>
<p>Your user ID is {data.user.id}.</p>
<form method="post" action="?/signOut" use:enhance>
	<button type="submit">Sign out</button>
</form>

<style>
	p {
		margin: var(--cds-spacing-03) 0;
	}

	button {
		padding: var(--cds-spacing-03) var(--cds-spacing-05);
		background: var(--cds-link-primary);
		color: var(--cds-text-on-color);
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background: #0353e9;
	}
</style>

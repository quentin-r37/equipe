<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Login</h1>
<form method="post" action="?/signInEmail" use:enhance>
	<label>
		Email
		<input type="email" name="email" />
	</label>
	<label>
		Password
		<input type="password" name="password" />
	</label>
	<label>
		Name (for registration)
		<input name="name" />
	</label>
	<button type="submit">Login</button>
	<button formaction="?/signUpEmail">Register</button>
</form>
<p class="error">{form?.message ?? ''}</p>

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
		max-width: 24rem;
		margin-top: var(--cds-spacing-05);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-02);
		font-size: 0.875rem;
		font-weight: 500;
	}

	input {
		padding: var(--cds-spacing-03) var(--cds-spacing-04);
		border: 1px solid var(--cds-border-subtle);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	input:focus {
		outline: 2px solid var(--cds-link-primary);
		outline-offset: -2px;
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

	.error {
		color: #da1e28;
		margin-top: var(--cds-spacing-03);
	}
</style>

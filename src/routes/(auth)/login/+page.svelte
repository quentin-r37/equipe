<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		PasswordInput,
		Tile,
		InlineNotification
	} from 'carbon-components-svelte';
	import Logo from '$lib/components/Logo.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let mode = $state<'login' | 'register'>('login');
</script>

<div class="login-container">
	<div class="login-card">
		<div class="login-branding">
			<Logo size={48} />
			<h1>Equipe</h1>
		</div>
		<Tile>
			<h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

			{#if form?.message}
				<div class="notification">
					<InlineNotification
						kind="error"
						title="Error"
						subtitle={form.message}
						hideCloseButton
					/>
				</div>
			{/if}

			<form method="post" action={mode === 'login' ? '?/signIn' : '?/signUp'} use:enhance>
				{#if mode === 'register'}
					<div class="form-field">
						<TextInput
							name="name"
							labelText="Name"
							placeholder="Your full name"
							required
						/>
					</div>
				{/if}
				<div class="form-field">
					<TextInput
						name="email"
						type="email"
						labelText="Email"
						placeholder="email@example.com"
						required
					/>
				</div>
				<div class="form-field">
					<PasswordInput
						name="password"
						labelText="Password"
						placeholder="Enter password"
						required
					/>
				</div>
				<div class="form-actions">
					<Button type="submit">{mode === 'login' ? 'Sign In' : 'Register'}</Button>
					<button
						type="button"
						class="toggle-link"
						onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
					>
						{mode === 'login' ? 'Need an account?' : 'Already have an account?'}
					</button>
				</div>
			</form>
		</Tile>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cds-layer-01);
	}

	.login-card {
		width: 100%;
		max-width: 28rem;
	}

	.login-branding {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cds-spacing-03);
		margin-bottom: var(--cds-spacing-06);
		color: var(--cds-text-primary);
	}

	.login-branding h1 {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0;
	}

	h2 {
		margin-bottom: var(--cds-spacing-06);
	}

	.notification {
		margin-bottom: var(--cds-spacing-05);
	}

	.form-field {
		margin-bottom: var(--cds-spacing-05);
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
	}

	.toggle-link {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.875rem;
		color: var(--cds-link-primary);
		cursor: pointer;
	}

	.toggle-link:hover {
		text-decoration: underline;
	}
</style>

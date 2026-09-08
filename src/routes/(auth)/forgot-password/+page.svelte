<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, TextInput, Tile, InlineNotification } from 'carbon-components-svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { feedbackEnhance } from '$lib/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);

	// Failures are already rendered inline above the form, so the toast is suppressed.
	const resetEnhance = feedbackEnhance({
		pending: (v) => (submitting = v),
		onError: () => {}
	});
</script>

<svelte:head>
	<title>Forgot password · Equipe</title>
</svelte:head>

<div class="page-container">
	<div class="page-card">
		<div class="page-branding">
			<Logo size={48} />
			<h1>Equipe</h1>
		</div>
		<Tile>
			<h2>Forgot Password</h2>

			{#if form?.message && !form?.success}
				<div class="notification">
					<InlineNotification kind="error" title="Error" subtitle={form.message} hideCloseButton />
				</div>
			{/if}

			{#if form?.success}
				<div class="notification">
					<InlineNotification
						kind="success"
						title="Email sent"
						subtitle={form.message}
						hideCloseButton
					/>
				</div>
			{:else}
				<p class="description">
					Enter your email address and we'll send you a link to reset your password.
				</p>
				<form method="post" use:enhance={resetEnhance}>
					<div class="form-field">
						<TextInput
							name="email"
							type="email"
							labelText="Email"
							placeholder="email@example.com"
							autocomplete="email"
							required
						/>
					</div>
					<div class="form-actions">
						<Button type="submit" disabled={submitting}>
							{submitting ? 'Sending…' : 'Send Reset Link'}
						</Button>
						<a href="/login" class="back-link">Back to Sign In</a>
					</div>
				</form>
			{/if}
		</Tile>
	</div>
</div>

<style>
	.page-container {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cds-layer-01);
	}

	.page-card {
		width: 100%;
		max-width: 28rem;
	}

	.page-branding {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--cds-spacing-03);
		margin-bottom: var(--cds-spacing-06);
		color: var(--cds-text-primary);
	}

	.page-branding h1 {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0;
	}

	h2 {
		margin-bottom: var(--cds-spacing-06);
	}

	.description {
		margin-bottom: var(--cds-spacing-05);
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
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

	.back-link {
		font-size: 0.875rem;
		color: var(--cds-link-primary);
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}
</style>

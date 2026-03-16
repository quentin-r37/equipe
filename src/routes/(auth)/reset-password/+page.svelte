<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, PasswordInput, Tile, InlineNotification } from 'carbon-components-svelte';
	import Logo from '$lib/components/Logo.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="page-container">
	<div class="page-card">
		<div class="page-branding">
			<Logo size={48} />
			<h1>Equipe</h1>
		</div>
		<Tile>
			<h2>Reset Password</h2>

			{#if data.error}
				<div class="notification">
					<InlineNotification kind="error" title="Error" subtitle={data.error} hideCloseButton />
				</div>
				<a href="/forgot-password" class="back-link">Request a new link</a>
			{:else if form?.success}
				<div class="notification">
					<InlineNotification
						kind="success"
						title="Success"
						subtitle={form.message}
						hideCloseButton
					/>
				</div>
				<a href="/login" class="back-link">Go to Sign In</a>
			{:else}
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

				<form method="post" use:enhance>
					<input type="hidden" name="token" value={data.token} />
					<div class="form-field">
						<PasswordInput
							name="newPassword"
							labelText="New Password"
							placeholder="Enter new password"
							required
						/>
					</div>
					<div class="form-field">
						<PasswordInput
							name="confirmPassword"
							labelText="Confirm Password"
							placeholder="Confirm new password"
							required
						/>
					</div>
					<div class="form-actions">
						<Button type="submit">Reset Password</Button>
					</div>
				</form>
			{/if}
		</Tile>
	</div>
</div>

<style>
	.page-container {
		min-height: 100vh;
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

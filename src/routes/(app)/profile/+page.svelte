<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Tile, Tag, TextInput, PasswordInput } from 'carbon-components-svelte';
	import { feedbackEnhance } from '$lib/forms';
	import type { PageData } from './$types';
	import type { LayoutServerData } from '../$types';

	let { data }: { data: PageData & LayoutServerData } = $props();

	// Writable derived: edits stay local, and the field re-syncs when the profile reloads.
	let nameValue = $derived(data.profile.name);
	let namePending = $state(false);

	const nameDirty = $derived(nameValue.trim() !== data.profile.name && !!nameValue.trim());

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordPending = $state(false);

	const passwordReady = $derived(
		!!currentPassword && newPassword.length >= 8 && newPassword === confirmPassword
	);

	const initials = $derived(
		data.profile.name
			.split(/[\s@._-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]!.toUpperCase())
			.join('')
	);

	const providerLabels: Record<string, string> = { microsoft: 'Microsoft' };
</script>

<svelte:head>
	<title>My profile · Equipe</title>
</svelte:head>

<div class="page-header">
	<h1>My profile</h1>
</div>

<div class="sections">
	<Tile>
		<div class="identity">
			<span class="avatar" aria-hidden="true">{initials}</span>
			<div class="identity-labels">
				<p class="identity-name">{data.profile.name}</p>
				<!-- Carbon's Tag renders a <div>, so these rows cannot be <p> elements. -->
				<div class="identity-meta">
					{data.profile.email}
					{#if data.profile.emailVerified}
						<Tag size="sm" type="green">verified</Tag>
					{:else}
						<Tag size="sm" type="warm-gray">not verified</Tag>
					{/if}
				</div>
				<div class="identity-meta">
					Member since {new Date(data.profile.createdAt).toLocaleDateString()}
					{#each data.providers as provider (provider)}
						<Tag size="sm" type="blue">{providerLabels[provider] ?? provider}</Tag>
					{/each}
				</div>
			</div>
		</div>

		<form
			method="post"
			action="?/updateProfile"
			class="form"
			use:enhance={feedbackEnhance({
				pending: (v) => (namePending = v),
				success: 'Profile updated',
				reset: false
			})}
		>
			<TextInput
				name="name"
				labelText="Display name"
				bind:value={nameValue}
				disabled={namePending}
				maxlength={100}
				required
			/>
			<TextInput
				labelText="Email"
				value={data.profile.email}
				readonly
				helperText="Contact an administrator to change your email address."
			/>
			<div class="form-actions">
				<Button size="field" type="submit" disabled={!nameDirty || namePending}>
					Save changes
				</Button>
			</div>
		</form>
	</Tile>

	{#if data.hasPassword}
		<Tile>
			<h2>Password</h2>
			<p class="section-hint">Changing your password signs you out of every other device.</p>
			<form
				method="post"
				action="?/changePassword"
				class="form"
				use:enhance={feedbackEnhance({
					pending: (v) => (passwordPending = v),
					success: 'Password changed',
					onSuccess: () => {
						currentPassword = '';
						newPassword = '';
						confirmPassword = '';
					}
				})}
			>
				<PasswordInput
					name="currentPassword"
					labelText="Current password"
					bind:value={currentPassword}
					disabled={passwordPending}
					autocomplete="current-password"
					required
				/>
				<PasswordInput
					name="newPassword"
					labelText="New password"
					bind:value={newPassword}
					disabled={passwordPending}
					autocomplete="new-password"
					helperText="At least 8 characters."
					required
				/>
				<PasswordInput
					name="confirmPassword"
					labelText="Confirm new password"
					bind:value={confirmPassword}
					disabled={passwordPending}
					autocomplete="new-password"
					invalid={!!confirmPassword && confirmPassword !== newPassword}
					invalidText="Passwords do not match"
					required
				/>
				<div class="form-actions">
					<Button size="field" type="submit" disabled={!passwordReady || passwordPending}>
						Change password
					</Button>
				</div>
			</form>
		</Tile>
	{/if}
</div>

<style>
	.page-header {
		margin-bottom: var(--cds-spacing-07);
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
		max-width: 40rem;
	}

	.identity {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
		padding-bottom: var(--cds-spacing-05);
		margin-bottom: var(--cds-spacing-05);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background: var(--cds-interactive-01, var(--cds-link-primary));
		color: var(--cds-text-on-color, #fff);
		font-weight: 600;
	}

	.identity-labels {
		min-width: 0;
	}

	.identity-name {
		font-size: 1.125rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.identity-meta {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		flex-wrap: wrap;
		margin-top: var(--cds-spacing-02);
	}

	h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.section-hint {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		margin-top: var(--cds-spacing-02);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-05);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}
</style>

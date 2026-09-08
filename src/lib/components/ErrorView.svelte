<script lang="ts">
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import { resolve } from '$app/paths';
	import ArrowLeft from 'carbon-icons-svelte/lib/ArrowLeft.svelte';
	import Home from 'carbon-icons-svelte/lib/Home.svelte';
	import Logo from '$lib/components/Logo.svelte';

	let {
		status,
		message = '',
		showLogo = false
	}: { status: number; message?: string; showLogo?: boolean } = $props();

	const copy = $derived.by(() => {
		switch (status) {
			case 401:
				return {
					title: 'Sign in required',
					detail: 'You need to sign in to see this page.',
					action: { href: resolve('/login'), label: 'Go to sign in' }
				};
			case 403:
				return {
					title: 'Access denied',
					detail:
						message ||
						"You don't have permission to see this page. Ask a team owner or admin to add you.",
					action: { href: resolve('/'), label: 'Back to dashboard' }
				};
			case 404:
				return {
					title: 'Page not found',
					detail:
						message ||
						"This page doesn't exist or has been deleted. It may have been removed by another member.",
					action: { href: resolve('/'), label: 'Back to dashboard' }
				};
			default:
				return {
					title: 'Something went wrong',
					detail: message || 'An unexpected error occurred. Please try again in a moment.',
					action: { href: resolve('/'), label: 'Back to dashboard' }
				};
		}
	});
</script>

<svelte:head>
	<title>{copy.title} · Equipe</title>
</svelte:head>

<div class="error-view">
	{#if showLogo}
		<div class="error-logo"><Logo size={40} /></div>
	{/if}
	<p class="error-status">{status}</p>
	<h1>{copy.title}</h1>
	<p class="error-detail">{copy.detail}</p>
	<div class="error-actions">
		<LabeledButton href={copy.action.href} icon={Home} tooltip={copy.action.label}>
			{copy.action.label}
		</LabeledButton>
		<LabeledButton kind="ghost" icon={ArrowLeft} tooltip="Go back" onclick={() => history.back()}
			>Go back</LabeledButton
		>
	</div>
</div>

<style>
	.error-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-10) var(--cds-spacing-05);
		max-width: 32rem;
		margin: 0 auto;
	}

	.error-logo {
		color: var(--cds-text-primary);
		margin-bottom: var(--cds-spacing-03);
	}

	.error-status {
		font-size: 0.875rem;
		letter-spacing: 0.1em;
		color: var(--cds-text-secondary);
		margin: 0;
	}

	h1 {
		margin: 0;
	}

	.error-detail {
		color: var(--cds-text-secondary);
		margin: 0;
	}

	.error-actions {
		display: flex;
		gap: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-05);
		flex-wrap: wrap;
		justify-content: center;
	}
</style>

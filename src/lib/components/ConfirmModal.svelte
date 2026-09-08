<script lang="ts">
	import { Modal, InlineNotification, InlineLoading } from 'carbon-components-svelte';
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import { feedbackEnhance, GENERIC_ERROR } from '$lib/forms';
	import { notificationState } from '$lib/stores/notifications.svelte';

	/**
	 * Confirmation dialog for destructive or irreversible actions.
	 *
	 * Two modes:
	 *  - form mode: pass `action` (e.g. "?/deleteTeam") and `fields`; the modal owns a hidden
	 *    form, submits it with `use:enhance`, shows failures inline and closes on success.
	 *  - callback mode: pass `onconfirm`; it is awaited, errors are shown inline.
	 *
	 * The modal stays open while the request is pending so the user always gets an outcome.
	 */
	let {
		open = $bindable(false),
		heading,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		danger = true,
		action,
		fields = {},
		onconfirm,
		successMessage,
		confirmDisabled = false,
		children
	}: {
		open?: boolean;
		heading: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		action?: string;
		fields?: Record<string, string>;
		onconfirm?: () => Promise<void> | void;
		successMessage?: string;
		/** Extra condition to enable the confirm button (e.g. a typed confirmation). */
		confirmDisabled?: boolean;
		children?: Snippet;
	} = $props();

	let pending = $state(false);
	let errorMsg = $state('');
	let formEl: HTMLFormElement | undefined = $state();

	// Reset transient state whenever the dialog closes.
	$effect(() => {
		if (!open) {
			pending = false;
			errorMsg = '';
		}
	});

	async function confirm() {
		if (pending || confirmDisabled) return;
		errorMsg = '';

		if (action) {
			formEl?.requestSubmit();
			return;
		}

		if (onconfirm) {
			pending = true;
			try {
				await onconfirm();
				open = false;
				if (successMessage) notificationState.toast('success', successMessage);
			} catch (err) {
				errorMsg = err instanceof Error && err.message ? err.message : GENERIC_ERROR;
			} finally {
				pending = false;
			}
		}
	}
</script>

<Modal
	bind:open
	{danger}
	modalHeading={heading}
	primaryButtonText={confirmLabel}
	secondaryButtonText={cancelLabel}
	primaryButtonDisabled={pending || confirmDisabled}
	shouldSubmitOnEnter={false}
	preventCloseOnClickOutside={pending}
	on:click:button--secondary={() => (open = false)}
	on:submit={confirm}
>
	{#if errorMsg}
		<div class="confirm-error">
			<InlineNotification kind="error" title={errorMsg} hideCloseButton lowContrast />
		</div>
	{/if}

	{@render children?.()}

	{#if pending}
		<div class="confirm-pending">
			<InlineLoading description="Please wait…" />
		</div>
	{/if}

	{#if action}
		<form
			bind:this={formEl}
			method="post"
			{action}
			hidden
			use:enhance={feedbackEnhance({
				pending: (v) => (pending = v),
				success: successMessage,
				onSuccess: () => (open = false),
				onError: (message) => (errorMsg = message)
			})}
		>
			{#each Object.entries(fields) as [name, value] (name)}
				<input type="hidden" {name} {value} />
			{/each}
		</form>
	{/if}
</Modal>

<style>
	.confirm-error {
		margin-bottom: var(--cds-spacing-04);
	}

	.confirm-pending {
		margin-top: var(--cds-spacing-04);
	}
</style>

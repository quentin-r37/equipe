import type { SubmitFunction } from '@sveltejs/kit';
import { notificationState } from '$lib/stores/notifications.svelte';

export const GENERIC_ERROR = 'Something went wrong. Please try again.';

/** Extracts the user-facing message from a `fail()` payload, whatever key the action used. */
export function failureMessage(data: unknown): string {
	if (data && typeof data === 'object') {
		for (const key of ['message', 'error', 'addMemberError']) {
			const value = (data as Record<string, unknown>)[key];
			if (typeof value === 'string' && value) return value;
		}
	}
	return GENERIC_ERROR;
}

export interface FeedbackOptions<Data = Record<string, unknown>> {
	/** Called with `true` when the request starts and `false` when it settles. */
	pending?: (value: boolean) => void;
	/** Success toast text (or a function of the action's returned data). Omit for no toast. */
	success?: string | ((data: Data) => string | undefined);
	/** Called after a successful action (before data is refreshed). */
	onSuccess?: (data: Data) => void;
	/** Called with the failure message. When omitted, an error toast is shown instead. */
	onError?: (message: string) => void;
	/** Set to `false` to keep the form values after success (default resets the form). */
	reset?: boolean;
}

/**
 * Standard `use:enhance` handler: pending state, success/error feedback, then the default
 * SvelteKit behaviour (apply the result, refresh data, follow redirects).
 *
 *   <form method="post" use:enhance={feedbackEnhance({ pending: (v) => (busy = v), success: 'Saved' })}>
 */
export function feedbackEnhance<Data = Record<string, unknown>>(
	opts: FeedbackOptions<Data> = {}
): SubmitFunction {
	return () => {
		opts.pending?.(true);
		return async ({ result, update }) => {
			opts.pending?.(false);

			if (result.type === 'failure') {
				const message = failureMessage(result.data);
				if (opts.onError) opts.onError(message);
				else notificationState.toast('error', message);
				await update({ reset: false });
				return;
			}

			if (result.type === 'error') {
				const message = result.error?.message ?? GENERIC_ERROR;
				if (opts.onError) opts.onError(message);
				else notificationState.toast('error', message);
				return;
			}

			if (result.type === 'success' || result.type === 'redirect') {
				const data = (result.type === 'success' ? (result.data ?? {}) : {}) as Data;
				const text = typeof opts.success === 'function' ? opts.success(data) : opts.success;
				if (text) notificationState.toast('success', text);
				opts.onSuccess?.(data);
			}

			await update({ reset: opts.reset });
		};
	};
}

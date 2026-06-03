<script lang="ts">
	import { Modal, Select, SelectItem, Button, InlineLoading } from 'carbon-components-svelte';
	import Copy from 'carbon-icons-svelte/lib/Copy.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';

	type ShareDTO = {
		id: string;
		token: string;
		url: string;
		expiresAt: string | null;
		oneTime: boolean;
		downloadCount: number;
	};

	let { fileId, open = $bindable(false) }: { fileId: string; open?: boolean } = $props();

	let shares = $state<ShareDTO[]>([]);
	let loadingShares = $state(false);
	let duration = $state<'hour' | 'day' | 'week' | 'onetime'>('day');
	let creating = $state(false);
	let errorMsg = $state('');
	let copiedId = $state('');

	// Fetch the active links whenever the modal opens for a file. The state
	// assignment lives in loadShares(), keeping this effect a pure side-effect.
	$effect(() => {
		if (open && fileId) loadShares(fileId);
	});

	async function loadShares(id: string) {
		loadingShares = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/files/share?fileId=${id}`);
			shares = res.ok ? await res.json() : [];
		} catch {
			shares = [];
		} finally {
			loadingShares = false;
		}
	}

	function close() {
		open = false;
		// Reset transient state so the next file opens a fresh modal.
		shares = [];
		duration = 'day';
		errorMsg = '';
		copiedId = '';
	}

	async function createLink() {
		creating = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/files/share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId, duration })
			});
			if (!res.ok) throw new Error(String(res.status));
			const created: ShareDTO = await res.json();
			shares = [created, ...shares];
			// Refresh the page load data so the file's "Shared (N)" badge updates.
			await invalidateAll();
		} catch {
			errorMsg = m.share_error();
		} finally {
			creating = false;
		}
	}

	async function revoke(id: string) {
		errorMsg = '';
		try {
			const res = await fetch(`/api/files/share?id=${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(String(res.status));
			shares = shares.filter((s) => s.id !== id);
			// Refresh the page load data so the file's "Shared (N)" badge updates.
			await invalidateAll();
		} catch {
			errorMsg = m.share_error();
		}
	}

	async function copyLink(share: ShareDTO) {
		await navigator.clipboard.writeText(share.url);
		copiedId = share.id;
	}

	// Build the secondary metadata line shown under each link: expiry (or
	// one-time) and the download count, joined by a middle dot.
	function metaLabel(share: ShareDTO): string {
		const parts: string[] = [];
		if (share.oneTime) parts.push(m.share_active_onetime());
		else if (share.expiresAt)
			parts.push(m.share_active_expires({ date: new Date(share.expiresAt).toLocaleString() }));
		parts.push(m.share_active_downloads({ count: share.downloadCount }));
		return parts.join(' · ');
	}
</script>

<Modal
	bind:open
	passiveModal
	preventCloseOnClickOutside
	modalHeading={m.share_file()}
	on:close={close}
>
	<div class="share-modal">
		<section class="share-create">
			<Select bind:selected={duration} labelText={m.share_duration_label()}>
				<SelectItem value="hour" text={m.share_duration_hour()} />
				<SelectItem value="day" text={m.share_duration_day()} />
				<SelectItem value="week" text={m.share_duration_week()} />
				<SelectItem value="onetime" text={m.share_duration_onetime()} />
			</Select>
			<Button on:click={createLink} disabled={creating}>{m.share_create_link()}</Button>
		</section>

		{#if errorMsg}
			<p class="share-error">{errorMsg}</p>
		{/if}

		<section class="share-links">
			<h6>{m.share_active_links()}</h6>
			{#if loadingShares}
				<InlineLoading description={m.share_loading()} />
			{:else if shares.length === 0}
				<p class="share-empty">{m.share_no_links()}</p>
			{:else}
				<ul class="link-list">
					{#each shares as s (s.id)}
						<li class="link-item">
							<div class="link-info">
								<span class="link-url" title={s.url}>{s.url}</span>
								<span class="link-meta">{metaLabel(s)}</span>
							</div>
							<div class="link-actions">
								<Button
									kind="ghost"
									size="small"
									icon={Copy}
									tooltipPosition="top"
									iconDescription={copiedId === s.id ? m.share_link_copied() : m.share_copy_link()}
									on:click={() => copyLink(s)}
								/>
								<Button
									kind="danger-ghost"
									size="small"
									icon={TrashCan}
									tooltipPosition="top"
									iconDescription={m.share_revoke()}
									on:click={() => revoke(s.id)}
								/>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</Modal>

<style>
	.share-modal {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-06);
	}

	.share-links h6 {
		margin-bottom: var(--cds-spacing-03);
	}

	.share-empty {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.link-list {
		display: flex;
		flex-direction: column;
	}

	.link-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03) 0;
		border-bottom: 1px solid var(--cds-border-subtle-01);
	}

	.link-item:last-child {
		border-bottom: none;
	}

	.link-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-01);
		min-width: 0;
	}

	.link-url {
		font-size: 0.8125rem;
		font-family: var(--cds-code-01-font-family, monospace);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.link-meta {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	.link-actions {
		display: flex;
		flex-shrink: 0;
	}

	.share-create {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
	}

	.share-error {
		color: var(--cds-text-error);
		font-size: 0.875rem;
	}
</style>

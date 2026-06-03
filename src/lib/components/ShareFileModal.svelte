<script lang="ts">
	import { Modal, Select, SelectItem, Button, InlineLoading, Tag } from 'carbon-components-svelte';
	import Copy from 'carbon-icons-svelte/lib/Copy.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
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
		} catch {
			errorMsg = m.share_error();
		}
	}

	async function copyLink(share: ShareDTO) {
		await navigator.clipboard.writeText(share.url);
		copiedId = share.id;
	}

	function expiryLabel(share: ShareDTO): string {
		if (share.oneTime) return m.share_active_onetime();
		if (share.expiresAt)
			return m.share_active_expires({ date: new Date(share.expiresAt).toLocaleString() });
		return '';
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
								<Tag size="sm" type="cool-gray">{expiryLabel(s)}</Tag>
							</div>
							<div class="link-actions">
								<Button
									kind="ghost"
									size="small"
									icon={Copy}
									iconDescription={copiedId === s.id ? m.share_link_copied() : m.share_copy_link()}
									on:click={() => copyLink(s)}
								/>
								<Button
									kind="danger-ghost"
									size="small"
									icon={TrashCan}
									iconDescription={m.share_revoke()}
									on:click={() => revoke(s.id)}
								/>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

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
		gap: var(--cds-spacing-02);
	}

	.link-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-03);
		padding: var(--cds-spacing-03);
		background: var(--cds-layer-01);
		border-radius: 4px;
	}

	.link-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-02);
		min-width: 0;
	}

	.link-url {
		font-size: 0.8125rem;
		font-family: var(--cds-code-01-font-family, monospace);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

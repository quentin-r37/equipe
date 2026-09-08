<script lang="ts">
	import FileTable from '$lib/components/FileTable.svelte';
	import LabeledButton from '$lib/components/LabeledButton.svelte';
	import KpiBand from '$lib/components/KpiBand.svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		Button,
		Modal,
		Select,
		SelectItem,
		InlineNotification,
		TextInput
	} from 'carbon-components-svelte';
	import Add from 'carbon-icons-svelte/lib/Add.svelte';
	import DocumentMultiple01 from 'carbon-icons-svelte/lib/DocumentMultiple_01.svelte';
	import ShareFileModal from '$lib/components/ShareFileModal.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { feedbackEnhance } from '$lib/forms';
	import { formatSize, validateUpload, MAX_UPLOAD_BYTES } from '$lib/files';
	import type { PageServerData } from './$types';
	import type { LayoutServerData } from '../$types';

	let { data }: { data: PageServerData & LayoutServerData } = $props();
	const hasFilters = $derived(!!(data.filters.q || data.filters.team || data.filters.type));
	function pageHref(number: number) {
		return `${resolve('/files')}?${new URLSearchParams({ ...data.filters, page: String(number) })}`;
	}

	/*
	 * The same figures band the dashboard and team pages open with. It describes the whole
	 * library rather than the filtered table below, so a search does not move the baseline.
	 * Storage is a sum, not a count, so it carries its own `summary` wording.
	 */
	const kpis = $derived([
		{ label: 'Files', value: data.library.files, verb: 'uploaded', series: data.trends.files },
		{
			label: 'Storage',
			value: formatSize(data.library.bytes),
			verb: 'added',
			series: data.trends.bytes,
			summary: `${formatSize(data.trends.bytes.reduce((a, b) => a + b, 0))} added`
		},
		{
			label: 'Share links',
			value: data.library.shares,
			verb: 'created',
			series: data.trends.shares
		},
		{ label: 'Your uploads', value: data.library.mine, verb: 'uploaded', series: data.trends.mine }
	]);

	// ── Upload modal ──
	let showUploadModal = $state(false);
	let uploadPending = $state(false);
	let uploadError = $state('');
	let selectedFileName = $state('');

	function openUpload() {
		uploadError = '';
		selectedFileName = '';
		showUploadModal = true;
	}

	function onFileChosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		selectedFileName = f?.name ?? '';
		uploadError = f ? (validateUpload(f) ?? '') : '';
	}

	function submitUpload() {
		if (uploadError) return;
		(document.getElementById('upload-form') as HTMLFormElement | null)?.requestSubmit();
	}

	// ── Share ──
	let showShareModal = $state(false);
	let shareFileId = $state('');

	function openShare(id: string) {
		shareFileId = id;
		showShareModal = true;
	}

	// ── Delete ──
	let deleteTarget = $state<{
		id: string;
		name: string;
		shareCount: number;
		attached: boolean;
	} | null>(null);
	let showDeleteConfirm = $state(false);

	function confirmDelete(f: {
		id: string;
		name: string;
		shareCount: number;
		messageId: string | null;
	}) {
		deleteTarget = { id: f.id, name: f.name, shareCount: f.shareCount, attached: !!f.messageId };
		showDeleteConfirm = true;
	}
</script>

<svelte:head>
	<title>Files · Equipe</title>
</svelte:head>

<div class="files-page">
	<header class="page-header">
		<div class="page-title">
			<h1>Files</h1>
			<p>Everything shared across your teams.</p>
		</div>
		{#if data.teams.length > 0}
			<LabeledButton icon={Add} tooltip="Upload file" onclick={openUpload}
				>Upload File</LabeledButton
			>
		{/if}
	</header>

	{#if data.teams.length > 0}
		<KpiBand {kpis} days={data.trendDays} />
	{/if}

	<section class="panel">
		<div class="section-header">
			<h2 class="section-title">Find files</h2>
		</div>
		<form
			class="file-filters"
			method="get"
			action={resolve('/files')}
			role="search"
			aria-label="Find files"
		>
			<TextInput
				name="q"
				labelText="File name"
				placeholder="Search files…"
				value={data.filters.q}
			/>
			<Select name="team" labelText="Team" selected={data.filters.team}>
				<SelectItem value="" text="All teams" />
				{#each data.teams as team (team.id)}<SelectItem value={team.id} text={team.name} />{/each}
			</Select>
			<Select name="type" labelText="File type" selected={data.filters.type}>
				<SelectItem value="" text="All types" />
				<SelectItem value="image" text="Images" /><SelectItem value="video" text="Videos" />
				<SelectItem value="audio" text="Audio" /><SelectItem value="pdf" text="PDF" />
				<SelectItem value="other" text="Other documents" />
			</Select>
			<Select name="sort" labelText="Sort by" selected={data.filters.sort}>
				<SelectItem value="newest" text="Newest first" /><SelectItem
					value="oldest"
					text="Oldest first"
				/>
			</Select>
			<Button size="field" type="submit">Search</Button>
			<Button size="field" kind="ghost" href={resolve('/files')}>Reset</Button>
		</form>
	</section>

	<section class="panel results">
		<div class="section-header">
			<h2 class="section-title">{hasFilters ? 'Matching files' : 'All files'}</h2>
			<p class="section-note" role="status">
				{data.total} file{data.total !== 1 ? 's' : ''} found
			</p>
		</div>

		{#if data.files.length === 0}
			<div class="empty-state">
				<DocumentMultiple01 size={32} />
				{#if hasFilters}
					<h3>Nothing matches</h3>
					<p>No files match your search. Try another name or clear the filters.</p>
					<LabeledButton
						kind="ghost"
						icon={DocumentMultiple01}
						tooltip="Clear the filters"
						href="/files">Clear filters</LabeledButton
					>
				{:else if data.teams.length === 0}
					<h3>No files yet</h3>
					<p>Join or create a team to start sharing files.</p>
				{:else}
					<h3>No files yet</h3>
					<p>Upload one to share it with everyone on the team.</p>
					<LabeledButton icon={Add} tooltip="Upload your first file" onclick={openUpload}
						>Upload your first file</LabeledButton
					>
				{/if}
			</div>
		{:else}
			<FileTable
				files={data.files}
				userId={data.user.id}
				onshare={openShare}
				ondelete={confirmDelete}
			/>
		{/if}

		{#if data.pageCount > 1}
			<nav class="file-pagination" aria-label="File result pages">
				{#if data.currentPage > 1}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- pageHref resolves the route before adding query parameters -->
					<a href={pageHref(data.currentPage - 1)}>Previous</a>
				{/if}
				<span>Page {data.currentPage} of {data.pageCount}</span>
				{#if data.currentPage < data.pageCount}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- pageHref resolves the route before adding query parameters -->
					<a href={pageHref(data.currentPage + 1)}>Next</a>
				{/if}
			</nav>
		{/if}
	</section>
</div>

<!-- Upload modal: stays open until the upload succeeds -->
<Modal
	bind:open={showUploadModal}
	modalHeading="Upload File"
	primaryButtonText={uploadPending ? 'Uploading…' : 'Upload'}
	primaryButtonDisabled={uploadPending || !!uploadError || !selectedFileName}
	secondaryButtonText="Cancel"
	shouldSubmitOnEnter={false}
	preventCloseOnClickOutside={uploadPending}
	on:click:button--secondary={() => (showUploadModal = false)}
	on:submit={submitUpload}
>
	{#if uploadError}
		<div class="modal-error">
			<InlineNotification kind="error" title={uploadError} hideCloseButton lowContrast />
		</div>
	{/if}
	<form
		id="upload-form"
		method="post"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={feedbackEnhance<{ name?: string }>({
			pending: (v) => (uploadPending = v),
			success: (d) => `"${d.name}" uploaded`,
			onSuccess: () => (showUploadModal = false),
			onError: (message) => (uploadError = message)
		})}
	>
		<div class="form-field">
			<Select name="teamId" labelText="Team">
				{#each data.teams as t (t.id)}
					<SelectItem value={t.id} text={t.name} />
				{/each}
			</Select>
		</div>
		<div class="file-input-field">
			<label for="file-upload">File</label>
			<input id="file-upload" type="file" name="file" required onchange={onFileChosen} />
			<p class="file-hint">Maximum size: {formatSize(MAX_UPLOAD_BYTES)}</p>
		</div>
	</form>
	{#if uploadPending}
		<p class="upload-progress">Uploading {selectedFileName}… keep this window open.</p>
	{/if}
</Modal>

<!-- Delete confirmation -->
<ConfirmModal
	bind:open={showDeleteConfirm}
	heading="Delete file"
	confirmLabel="Delete"
	action="?/delete"
	fields={{ fileId: deleteTarget?.id ?? '' }}
	successMessage={`"${deleteTarget?.name}" deleted`}
>
	<p>
		Permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
	</p>
	<ul class="confirm-details">
		{#if deleteTarget?.attached}
			<li>It will also be removed from the chat message it was posted in.</li>
		{/if}
		{#if deleteTarget && deleteTarget.shareCount > 0}
			<li>
				{deleteTarget.shareCount === 1
					? 'Its active share link will stop working.'
					: `Its ${deleteTarget.shareCount} active share links will stop working.`}
			</li>
		{/if}
	</ul>
</ConfirmModal>

<ShareFileModal bind:open={showShareModal} fileId={shareFileId} />

<style>
	/*
	 * Same page system as the dashboard and the team page: separation comes from layering, not
	 * from rules — every block is a `--cds-ui-01` surface on the `--cds-ui-background` page and
	 * the gutter between surfaces does the dividing. The 1px lines are the filets inside the
	 * KPI band and the rules of the data table, which are structural to a table.
	 */
	.files-page {
		max-width: 90rem;
		margin: 0 auto;
	}
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cds-spacing-05);
		flex-wrap: wrap;
		margin-bottom: var(--cds-spacing-06);
	}
	.page-title h1 {
		font-size: clamp(1.5rem, 2vw, 2rem);
		line-height: 1.3;
		font-weight: 400;
		overflow-wrap: anywhere;
	}
	.page-title p {
		margin-top: 0.5rem;
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}
	.panel {
		background: var(--cds-ui-01);
		padding: var(--cds-spacing-05) var(--cds-spacing-06) var(--cds-spacing-06);
	}
	.results {
		margin-top: var(--cds-spacing-05);
	}
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
		min-height: 2rem;
	}
	.section-title {
		font-size: 1rem;
		font-weight: 600;
	}
	.section-note {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}
	.file-filters {
		display: grid;
		grid-template-columns: minmax(12rem, 2fr) repeat(3, minmax(8rem, 1fr)) auto auto;
		gap: var(--cds-spacing-04);
		align-items: end;
	}
	/*
	 * Carbon fills fields with `--cds-field-01`, the same value as the `--cds-ui-01` panel they
	 * sit on here, which would leave the search box and the selects reading as bare text. On a
	 * raised surface the fields take the next token up.
	 */
	.panel :global(.bx--text-input),
	.panel :global(.bx--select-input) {
		background-color: var(--cds-field-02);
	}
	/*
	 * The table draws its own header band on `--cds-ui-01`, which is this panel's own surface.
	 * On the panel the header takes the step up instead, and the rows stay transparent so the
	 * hover band is what separates them — the row treatment used everywhere else.
	 */
	.results :global(table th) {
		background: var(--cds-ui-03);
	}
	.results :global(table td) {
		background: transparent;
	}
	.file-pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-06);
	}
	.file-pagination a {
		color: var(--cds-link-primary);
		padding: var(--cds-spacing-03);
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 2rem 0;
		color: var(--cds-text-secondary);
	}
	.empty-state h3 {
		color: var(--cds-text-primary);
	}
	.empty-state p {
		font-size: 0.875rem;
	}
	.form-field,
	.modal-error {
		margin-bottom: var(--cds-spacing-05);
	}
	.file-input-field label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: var(--cds-spacing-02);
	}
	.file-input-field input[type='file'] {
		display: block;
		width: 100%;
		font-size: 0.875rem;
	}
	.file-hint,
	.upload-progress {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		margin-top: var(--cds-spacing-03);
	}
	.confirm-details {
		margin-top: var(--cds-spacing-04);
		padding-left: var(--cds-spacing-05);
		list-style: disc;
		color: var(--cds-text-secondary);
	}
	.confirm-details li {
		margin-bottom: var(--cds-spacing-02);
	}
	@media (max-width: 1056px) {
		.file-filters {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 420px) {
		.file-filters {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>

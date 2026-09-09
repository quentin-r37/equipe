<script lang="ts">
	import type { Snippet } from 'svelte';
	import ArrowRight from 'carbon-icons-svelte/lib/ArrowRight.svelte';

	/**
	 * Full-width gradient banner that opens a page.
	 *
	 * The gradient is mixed from the user's accent colour (`--cds-interactive-01`, set by
	 * ThemeSelector) into the current theme's own layer colour, so the banner is a surface
	 * on the page in every Carbon theme rather than a fixed dark band. See the style block.
	 *
	 * `media` is the illustration column on the left, `aside` the secondary column on the
	 * right (a short list of what the page contains); both are optional and the banner
	 * collapses to a single column without them.
	 *
	 * `linkHref` is used as-is, so callers pass it through `resolve()` themselves.
	 */
	let {
		title,
		description,
		eyebrow,
		linkText,
		linkHref,
		asideTitle,
		as = 'h1',
		media,
		aside
	}: {
		title: string;
		description?: string;
		eyebrow?: string;
		linkText?: string;
		linkHref?: string;
		asideTitle?: string;
		as?: 'h1' | 'h2';
		media?: Snippet;
		aside?: Snippet;
	} = $props();
</script>

<section class="hero-banner" class:has-media={!!media}>
	{#if media}
		<div class="hero-media" aria-hidden="true">{@render media()}</div>
	{/if}

	<div class="hero-body">
		{#if eyebrow}<p class="hero-eyebrow">{eyebrow}</p>{/if}
		<svelte:element this={as} class="hero-title">{title}</svelte:element>
		{#if description}<p class="hero-description">{description}</p>{/if}
		{#if linkText && linkHref}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the caller passes an already-resolved href -->
			<a class="hero-link" href={linkHref}>
				{linkText}
				<ArrowRight size={16} />
			</a>
		{/if}
	</div>

	{#if aside}
		<div class="hero-aside">
			{#if asideTitle}<p class="hero-aside-title">{asideTitle}</p>{/if}
			{@render aside()}
		</div>
	{/if}
</section>

<style>
	/*
	 * One ramp, expressed against the theme instead of against fixed hexes: the base is the
	 * same `--cds-ui-01` surface the rest of the page uses, and the accent is mixed into it.
	 * That keeps the banner one step off the canvas in every theme — darker than the page on
	 * `white`, lighter on `g80`/`g90`/`g100` — instead of punching a near-black hole into the
	 * mid-grey canvases of g80/g90.
	 *
	 * The dark themes then take a second block: the same mix reads much weaker over a dark
	 * base, so the accent share goes up, and the link colour has to be lifted towards white
	 * because ThemeSelector overwrites `--cds-link-primary` with the raw accent in every theme.
	 *
	 * Without color-mix() the custom properties below are invalid at computed-value time, so
	 * `background-image` drops out and the banner degrades to the flat `--hero-base` surface.
	 */
	.hero-banner {
		--hero-accent: var(--cds-interactive-01, #0f62fe);
		--hero-base: var(--cds-ui-01, #f4f4f4);
		--hero-tint: color-mix(in oklab, var(--hero-accent) 7%, var(--hero-base));
		--hero-deep: color-mix(in oklab, var(--hero-accent) 30%, var(--hero-base));
		--hero-glow-strong: color-mix(in oklab, var(--hero-accent) 30%, transparent);
		--hero-glow-soft: color-mix(in oklab, var(--hero-accent) 10%, transparent);
		--hero-fg: var(--cds-text-primary, #161616);
		--hero-fg-muted: var(--cds-text-secondary, #525252);
		--hero-icon: var(--cds-icon-secondary, currentColor);
		--hero-link: var(--cds-link-primary, #0f62fe);
		--hero-focus: var(--cds-focus, #0f62fe);

		position: relative;
		isolation: isolate;
		overflow: hidden;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--cds-spacing-06) var(--cds-spacing-07);
		align-items: start;
		padding: var(--cds-spacing-07) var(--cds-spacing-06);
		color: var(--hero-fg);
		background-color: var(--hero-base);
		background-image:
			radial-gradient(95% 130% at 88% -15%, var(--hero-glow-strong), transparent 62%),
			radial-gradient(70% 110% at 45% 115%, var(--hero-glow-soft), transparent 68%),
			linear-gradient(100deg, var(--hero-base) 0%, var(--hero-tint) 42%, var(--hero-deep) 100%);
	}

	:global(html[theme='g80']) .hero-banner,
	:global(html[theme='g90']) .hero-banner,
	:global(html[theme='g100']) .hero-banner {
		--hero-tint: color-mix(in oklab, var(--hero-accent) 12%, var(--hero-base));
		--hero-deep: color-mix(in oklab, var(--hero-accent) 58%, var(--hero-base));
		--hero-glow-strong: color-mix(in oklab, var(--hero-accent) 55%, transparent);
		--hero-glow-soft: color-mix(in oklab, var(--hero-accent) 22%, transparent);
		--hero-link: color-mix(in oklab, var(--hero-accent) 45%, #ffffff);
	}

	.hero-banner.has-media {
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) auto;
	}

	.hero-media {
		align-self: center;
		display: grid;
		place-items: center;
		min-width: 0;
		/* The illustration is decorative: keep it from ever outgrowing the text column. */
		max-height: 12rem;
	}

	.hero-media :global(svg),
	.hero-media :global(img) {
		max-width: 100%;
		height: auto;
	}

	.hero-body {
		min-width: 0;
	}

	.hero-eyebrow {
		font-size: 0.75rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--hero-fg-muted);
		margin-bottom: var(--cds-spacing-03);
	}

	.hero-title {
		font-size: clamp(1.5rem, 2.2vw, 2rem);
		font-weight: 400;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.hero-description {
		margin-top: var(--cds-spacing-04);
		max-width: 32rem;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--hero-fg-muted);
		overflow-wrap: anywhere;
	}

	.hero-link {
		display: inline-flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		margin-top: var(--cds-spacing-06);
		font-size: 0.875rem;
		color: var(--hero-link);
		text-decoration: none;
	}

	.hero-link:hover {
		text-decoration: underline;
	}

	.hero-link :global(svg) {
		fill: currentColor;
	}

	.hero-banner :global(a:focus-visible) {
		outline: 2px solid var(--hero-focus);
		outline-offset: 2px;
	}

	.hero-aside {
		min-width: 0;
	}

	.hero-aside-title {
		font-size: 0.75rem;
		color: var(--hero-fg-muted);
		margin-bottom: var(--cds-spacing-04);
	}

	/* Styling for the caller's aside content, which is plain markup passed as a snippet. */
	.hero-aside :global(ul) {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-04);
	}

	.hero-aside :global(li) {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-04);
		font-size: 0.875rem;
	}

	.hero-aside :global(a) {
		color: inherit;
		text-decoration: none;
	}

	.hero-aside :global(a:hover) {
		text-decoration: underline;
	}

	.hero-aside :global(svg) {
		flex-shrink: 0;
		fill: var(--hero-icon);
	}

	@media (max-width: 1056px) {
		.hero-banner,
		.hero-banner.has-media {
			grid-template-columns: minmax(0, 1fr);
		}
		.hero-media {
			display: none;
		}
	}
</style>

<script lang="ts">
	import Sparkline from '$lib/components/Sparkline.svelte';

	/**
	 * The figures band that opens every overview page (dashboard, team, meetings, files).
	 *
	 * The headline is the current total; the sparkline under it is how many were added per
	 * day over the window, so `verb` names what the series counts and keeps the plot from
	 * being read as the total over time. `summary` overrides the "{sum} {verb}" wording for
	 * a series whose buckets are not plain counts — bytes, say.
	 */
	let {
		kpis,
		days
	}: {
		kpis: {
			label: string;
			value: string | number;
			verb: string;
			series: number[];
			summary?: string;
		}[];
		days: number;
	} = $props();

	const cells = $derived(
		kpis.map((kpi) => {
			const added = kpi.series.reduce((a, b) => a + b, 0);
			const summary = kpi.summary ?? `${added} ${kpi.verb}`;
			return {
				label: kpi.label,
				value: kpi.value,
				/*
				 * A flat line on the baseline would read as a rule rather than as data, so a window
				 * with nothing in it draws no plot — but the slot keeps its height, so the tiles stay
				 * the same size once the band wraps onto more than one row.
				 */
				series: added > 0 ? kpi.series : [],
				note: `${summary} · ${days}d`,
				plotLabel: `${kpi.label}: ${summary} over the last ${days} days`
			};
		})
	);
</script>

<dl class="workspace-summary">
	{#each cells as kpi (kpi.label)}
		<div class="kpi">
			<dt>{kpi.label}</dt>
			<dd>
				<span class="kpi-value">{kpi.value}</span>
				<span class="kpi-note">{kpi.note}</span>
				<Sparkline values={kpi.series} height={32} label={kpi.plotLabel} />
			</dd>
		</div>
	{/each}
</dl>

<style>
	.workspace-summary {
		display: flex;
		flex-wrap: wrap;
		background: var(--cds-ui-01);
		/* No side or bottom padding: each cell's sparkline runs to its own edges. The inset
		   is carried by the text inside the cells instead. */
		padding: var(--cds-spacing-05) 0 0;
		margin: 0 0 var(--cds-spacing-05);
	}
	.kpi {
		display: flex;
		flex-direction: column;
		flex: 1 1 8rem;
		border-left: 1px solid var(--cds-border-subtle);
	}
	.kpi:first-child {
		border-left: none;
	}
	.kpi dd {
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.kpi dt,
	.kpi-value,
	.kpi-note {
		padding: 0 var(--cds-spacing-06);
	}
	.kpi dt {
		color: var(--cds-text-secondary);
		font-size: 0.75rem;
	}
	.kpi-value {
		font-size: 1.75rem;
		font-weight: 300;
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}
	.kpi-note {
		color: var(--cds-text-secondary);
		font-size: 0.6875rem;
	}
	/* Anchor the plot to the bottom so the tiles line up despite unequal text height. */
	.kpi :global(.sparkline) {
		margin-top: auto;
		padding-top: var(--cds-spacing-04);
	}
	@media (max-width: 672px) {
		/*
		 * Once the cells wrap, a left-border filet would reappear at the start of the second
		 * row (CSS can't see row starts in a flex container). Below this breakpoint the band
		 * drops the filets and separates by gutter instead — the same layering rule the rest
		 * of the page follows.
		 */
		.workspace-summary {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1px;
			background: var(--cds-ui-background);
			padding: 0;
		}
		.kpi {
			background: var(--cds-ui-01);
			border-left: none;
			padding-top: var(--cds-spacing-05);
		}
	}
</style>

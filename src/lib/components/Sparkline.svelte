<script lang="ts">
	import { sparklineGeometry, VIEW_WIDTH } from '$lib/sparkline';

	/**
	 * A single-series, axis-free trend line that bleeds to the edges of the card it sits in.
	 *
	 * One series, so there is no legend and no categorical palette to validate: the stroke
	 * uses `--cds-interactive-01`, which the accent picker rewrites, so the chart follows the
	 * user's chosen accent instead of introducing a hue of its own. All six accent options
	 * clear 3:1 against both the light and dark panel surfaces.
	 *
	 * The scale is carried by the caller as a direct label (the totals in the card meta row),
	 * which is why the plot itself needs no axis.
	 */
	let {
		values,
		label,
		height = 40
	}: {
		/** One bucket per time slot, oldest first. */
		values: number[];
		/** Text alternative — the chart is decorative without it. */
		label: string;
		height?: number;
	} = $props();

	/*
	 * The viewBox is a fixed 100 units wide and stretched with `preserveAspectRatio="none"`
	 * so the plot fills any card width. That non-uniform scale would smear the stroke, so the
	 * path carries `vector-effect="non-scaling-stroke"` to keep it at a true 2px.
	 *
	 * The point maths lives in `$lib/sparkline` so it can be unit-tested.
	 */
	const geometry = $derived(sparklineGeometry(values, height));
</script>

<svg
	class="sparkline"
	viewBox="0 0 {VIEW_WIDTH} {height}"
	preserveAspectRatio="none"
	style="height: {height}px"
	role="img"
	aria-label={label}
>
	{#if geometry.line}
		<polygon class="area" points={geometry.area} />
		<polyline class="line" points={geometry.line} vector-effect="non-scaling-stroke" />
	{/if}
</svg>

<style>
	.sparkline {
		display: block;
		width: 100%;
	}
	.area {
		fill: var(--cds-interactive-01);
		fill-opacity: 0.15;
	}
	.line {
		fill: none;
		stroke: var(--cds-interactive-01);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
</style>

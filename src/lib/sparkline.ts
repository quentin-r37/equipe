/**
 * Point maths for `Sparkline.svelte`, kept out of the component so it can be unit-tested.
 *
 * Coordinates are emitted in a fixed-width viewBox that the SVG stretches to the card via
 * `preserveAspectRatio="none"`; the component restores a true stroke width with
 * `vector-effect="non-scaling-stroke"`.
 */

/** Width of the viewBox the points are laid out in. */
export const VIEW_WIDTH = 100;

/** Half the stroke width, reserved top and bottom so the line is never clipped. */
export const PAD = 1.5;

export interface SparklineGeometry {
	/** `points` for the trend polyline, empty when there is nothing to draw. */
	line: string;
	/** `points` for the area polygon closed down to the baseline, empty likewise. */
	area: string;
}

/**
 * Lay out one bucket per slot, oldest first, scaled to the series peak.
 *
 * The peak floors at 1 so an all-zero series draws a flat line on the baseline rather than
 * dividing by zero — a quiet team reads as quiet, not as broken.
 */
export function sparklineGeometry(values: number[], height: number): SparklineGeometry {
	if (values.length === 0) return { line: '', area: '' };

	const peak = Math.max(1, ...values);
	const plot = height - PAD * 2;
	// A lone bucket has no span to spread over, so it sits at the left edge.
	const stepX = values.length > 1 ? VIEW_WIDTH / (values.length - 1) : 0;

	const points = values.map((v, i) => {
		const x = (i * stepX).toFixed(2);
		const y = (height - PAD - (v / peak) * plot).toFixed(2);
		return `${x},${y}`;
	});

	const line = points.join(' ');
	return { line, area: `0,${height} ${line} ${VIEW_WIDTH},${height}` };
}

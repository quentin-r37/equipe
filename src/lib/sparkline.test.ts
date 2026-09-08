import { describe, it, expect } from 'vitest';
import { sparklineGeometry, VIEW_WIDTH, PAD } from './sparkline';

const H = 40;
/** y for a bucket at the series peak, and y for a zero bucket. */
const TOP = (H - PAD - (H - PAD * 2)).toFixed(2);
const BASE = (H - PAD).toFixed(2);

describe('sparklineGeometry', () => {
	it('draws nothing for an empty series', () => {
		expect(sparklineGeometry([], H)).toEqual({ line: '', area: '' });
	});

	it('spans the full viewBox width, first bucket to last', () => {
		const { line } = sparklineGeometry([1, 2, 3], H);
		const xs = line.split(' ').map((p) => Number(p.split(',')[0]));
		expect(xs[0]).toBe(0);
		expect(xs.at(-1)).toBe(VIEW_WIDTH);
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
	});

	it('scales to the series peak, not to an absolute ceiling', () => {
		// Same shape, different magnitudes — both should plot identically.
		expect(sparklineGeometry([0, 5], H).line).toBe(sparklineGeometry([0, 500], H).line);
		expect(sparklineGeometry([0, 5], H).line).toBe(`0.00,${BASE} ${VIEW_WIDTH.toFixed(2)},${TOP}`);
	});

	it('keeps every point inside the padded band so the stroke is never clipped', () => {
		const { line } = sparklineGeometry([0, 3, 9, 1, 7], H);
		const ys = line.split(' ').map((p) => Number(p.split(',')[1]));
		for (const y of ys) {
			expect(y).toBeGreaterThanOrEqual(PAD);
			expect(y).toBeLessThanOrEqual(H - PAD);
		}
	});

	it('flatlines an all-zero series on the baseline instead of dividing by zero', () => {
		const { line } = sparklineGeometry([0, 0, 0], H);
		const ys = line.split(' ').map((p) => p.split(',')[1]);
		expect(ys).toEqual([BASE, BASE, BASE]);
	});

	it('does not treat a single bucket as a full-width span', () => {
		expect(sparklineGeometry([4], H).line).toBe(`0.00,${TOP}`);
	});

	it('closes the area down to the baseline at both ends', () => {
		const { line, area } = sparklineGeometry([1, 2], H);
		expect(area).toBe(`0,${H} ${line} ${VIEW_WIDTH},${H}`);
	});
});

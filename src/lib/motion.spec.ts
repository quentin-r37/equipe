import { expect, it } from 'vitest';
import { addItem, cubicBezier, easing, removeItem } from './motion.svelte';

/*
 * The easing sampler is the only piece of the motion module with arithmetic worth pinning:
 * everything else is a token lookup, and the animation itself is only observable in a browser.
 */

const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);

it('anchors an eased curve at both ends', () => {
	for (const curve of Object.values(easing)) {
		expect(curve(0)).toBe(0);
		expect(curve(1)).toBe(1);
	}
});

it('clamps input outside the unit interval', () => {
	expect(easing.standard(-0.5)).toBe(0);
	expect(easing.standard(1.5)).toBe(1);
});

it('resolves the diagonal control points to a straight line', () => {
	for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
		expect(linear(t)).toBeCloseTo(t, 5);
	}
});

it('front-loads entrance motion and back-loads exit motion', () => {
	// Carbon's entrance curve covers most of its distance early, the exit curve late.
	expect(easing.entrance(0.5)).toBeGreaterThan(0.5);
	expect(easing.exit(0.5)).toBeLessThan(0.5);
});

it('rises monotonically', () => {
	for (const curve of Object.values(easing)) {
		let previous = -1;
		for (let t = 0; t <= 1.0001; t += 0.01) {
			const value = curve(t);
			expect(value).toBeGreaterThanOrEqual(previous);
			previous = value;
		}
	}
});

it('leaves faster than it arrives', () => {
	const node = {} as Element;
	expect(removeItem(node).duration).toBeLessThan(addItem(node).duration!);
});

it('drops the animation when it is gated off', () => {
	const node = {} as Element;
	expect(addItem(node, { enabled: false })).toEqual({ duration: 0 });
	expect(removeItem(node, { enabled: false })).toEqual({ duration: 0 });
});

it('fades without moving when no distance is given', () => {
	const config = addItem({} as Element, { distance: '0' });
	expect(config.css?.(0.5, 0.5)).toBe('opacity: 0.5; ');
});

it('offsets along the requested axis', () => {
	const vertical = addItem({} as Element, { distance: '1rem' });
	const horizontal = addItem({} as Element, { distance: '1rem', axis: 'x' });
	expect(vertical.css?.(0, 1)).toContain('translate: 0 calc(1rem * 1)');
	expect(horizontal.css?.(0, 1)).toContain('translate: calc(1rem * 1) 0');
});

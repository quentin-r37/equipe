import { onMount } from 'svelte';
import { flip } from 'svelte/animate';
import type { AnimationConfig } from 'svelte/animate';
import type { TransitionConfig } from 'svelte/transition';

/*
 * Add/remove choreography, in the shape Svelte transitions want.
 * https://carbondesignsystem.com/elements/motion/choreography/
 *
 * The declarative half of Carbon motion lives in `$lib/styles/motion.scss`; it cannot express
 * removal, because the node is gone from the DOM before a CSS transition could run on it. So
 * the tokens are mirrored here as numbers and easing functions.
 *
 * The choreography Carbon asks for falls out of how Svelte sequences these: an item leaves
 * (`removeItem`, exit easing, fast) while it still occupies its space, and only once it is gone
 * do the rows below close the gap (`reflow`, standard easing). Adding runs the other way — the
 * list opens the space, then the new item fades in over it (`addItem`, entrance easing, delayed
 * by one beat).
 */

/** Carbon productive durations, in milliseconds. */
export const duration = {
	fast01: 70,
	fast02: 110,
	moderate01: 150,
	moderate02: 240
} as const;

/**
 * Samples a CSS `cubic-bezier(x1, y1, x2, y2)` as the `(t) => t` easing function Svelte wants.
 * Newton-Raphson on x, falling back to bisection when the curve's slope goes flat.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
	const a = (c1: number, c2: number) => 1 - 3 * c2 + 3 * c1;
	const b = (c1: number, c2: number) => 3 * c2 - 6 * c1;
	const c = (c1: number) => 3 * c1;
	const bezier = (t: number, c1: number, c2: number) =>
		((a(c1, c2) * t + b(c1, c2)) * t + c(c1)) * t;
	const slope = (t: number, c1: number, c2: number) =>
		3 * a(c1, c2) * t * t + 2 * b(c1, c2) * t + c(c1);

	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;

		let t = x;
		for (let i = 0; i < 8; i++) {
			const error = bezier(t, x1, x2) - x;
			if (Math.abs(error) < 1e-6) return bezier(t, y1, y2);
			const d = slope(t, x1, x2);
			if (Math.abs(d) < 1e-6) break;
			t -= error / d;
		}

		let low = 0;
		let high = 1;
		t = x;
		while (high - low > 1e-6) {
			if (bezier(t, x1, x2) < x) low = t;
			else high = t;
			t = (low + high) / 2;
		}
		return bezier(t, y1, y2);
	};
}

/** The three productive curves from the Carbon motion tokens. */
export const easing = {
	/** Stays on screen, start to finish — reflow, resize. */
	standard: cubicBezier(0.2, 0, 0.38, 0.9),
	/** Enters the screen: fast out of the gate, settles softly. */
	entrance: cubicBezier(0, 0, 0.38, 0.9),
	/** Leaves the screen: eases in, then accelerates away. */
	exit: cubicBezier(0.2, 0, 1, 0.9)
} as const;

function reduced(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
	);
}

type ItemParams = {
	/** `false` skips the animation outright — see `listMotion`. */
	enabled?: boolean;
	duration?: number;
	delay?: number;
	/** CSS length the item travels; `'0'` for a pure fade. */
	distance?: string;
	axis?: 'x' | 'y';
};

function translate(axis: 'x' | 'y', distance: string, u: number): string {
	if (distance === '0') return '';
	const offset = `calc(${distance} * ${u})`;
	return `translate: ${axis === 'x' ? `${offset} 0` : `0 ${offset}`};`;
}

/**
 * An item joining a list: fades up into the space the list has just opened for it.
 * Use as `in:addItem` — pairs with `reflow` on the same each block.
 */
export function addItem(node: Element, params: ItemParams = {}): TransitionConfig {
	const {
		enabled = true,
		duration: ms = duration.moderate01,
		delay = duration.fast01,
		distance = 'var(--cds-spacing-03)',
		axis = 'y'
	} = params;
	if (!enabled || reduced()) return { duration: 0 };
	return {
		duration: ms,
		delay,
		easing: easing.entrance,
		css: (t, u) => `opacity: ${t}; ${translate(axis, distance, u)}`
	};
}

/**
 * An item leaving a list: fades out in place, faster than it arrived, holding its space until
 * it is gone so the rows below only move once. Use as `out:removeItem`.
 */
export function removeItem(node: Element, params: ItemParams = {}): TransitionConfig {
	const {
		enabled = true,
		duration: ms = duration.fast02,
		delay = 0,
		distance = '0',
		axis = 'y'
	} = params;
	if (!enabled || reduced()) return { duration: 0 };
	return {
		duration: ms,
		delay,
		easing: easing.exit,
		css: (t, u) => `opacity: ${t}; ${translate(axis, distance, u)}`
	};
}

/**
 * The rest of the list closing (or opening) the gap. Use as `animate:reflow` on the sole child
 * of a keyed each block.
 */
export function reflow(
	node: Element,
	positions: { from: DOMRect; to: DOMRect },
	params: { duration?: number; delay?: number } = {}
): AnimationConfig {
	if (reduced()) return { duration: 0 };
	return flip(node, positions, {
		duration: params.duration ?? duration.moderate01,
		delay: params.delay ?? 0,
		easing: easing.standard
	});
}

/**
 * Gate for entrance transitions, so `addItem` means "this item was just added" rather than
 * "this page just rendered": the rows a list is born with appear instantly, everything that
 * lands afterwards animates in.
 */
export function listMotion(): { readonly ready: boolean } {
	let ready = $state(false);
	onMount(() => {
		const frame = requestAnimationFrame(() => (ready = true));
		return () => cancelAnimationFrame(frame);
	});
	return {
		get ready() {
			return ready;
		}
	};
}

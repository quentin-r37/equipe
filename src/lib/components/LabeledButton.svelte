<script lang="ts">
	import { Button } from 'carbon-components-svelte';
	import PortalTooltip from 'carbon-components-svelte/src/Portal/PortalTooltip.svelte';
	import type { ComponentProps, Snippet } from 'svelte';

	type Props = Omit<ComponentProps<Button>, 'iconDescription' | 'children' | 'onclick'> & {
		tooltip: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	};
	let {
		tooltip,
		tooltipPosition = 'bottom',
		tooltipAlignment = 'center',
		class: className = '',
		disabled = false,
		hideTooltip = false,
		ref = $bindable(null),
		onclick,
		children,
		...rest
	}: Props = $props();
	let hovered = $state(false);
	let focused = $state(false);
	let dismissed = $state(false);
</script>

<!-- Keep tooltip trigger CSS off the button: it resets Carbon backgrounds and padding. -->
<Button
	{...rest}
	{disabled}
	bind:ref
	class="btn--labeled {className}"
	on:click={(event) => {
		dismissed = true;
		onclick?.(event);
	}}
	on:mouseenter={() => {
		hovered = true;
		dismissed = false;
	}}
	on:mouseleave={() => (hovered = false)}
	on:focus={() => {
		focused = true;
		dismissed = false;
	}}
	on:blur={() => (focused = false)}
	onkeydown={(event) => {
		if (event.key === 'Escape') dismissed = true;
	}}
>
	{@render children()}
</Button>
<PortalTooltip
	anchor={ref}
	direction={tooltipPosition}
	intrinsicAlign={tooltipAlignment}
	open={(hovered || focused) && !disabled && !hideTooltip && !dismissed}
	text={tooltip}
	tooltipType="icon"
/>

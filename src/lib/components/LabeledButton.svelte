<script lang="ts">
	import { Button } from 'carbon-components-svelte';
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
		onclick,
		children,
		...rest
	}: Props = $props();
	let dismissed = $state(false);
</script>

<!-- Carbon's tooltip classes also support buttons with visible labels. -->
<Button
	{...rest}
	{disabled}
	class="btn--labeled bx--tooltip__trigger bx--tooltip--a11y bx--btn--icon-only--{tooltipPosition} bx--tooltip--align-{tooltipAlignment} {disabled ||
	hideTooltip ||
	dismissed
		? 'bx--tooltip--hidden'
		: ''} {className}"
	on:click={(event) => onclick?.(event)}
	on:mouseenter={() => (dismissed = false)}
	on:focus={() => (dismissed = false)}
	onkeydown={(event) => {
		if (event.key === 'Escape') dismissed = true;
	}}
>
	<span class="bx--assistive-text" aria-hidden="true" style="pointer-events: none">{tooltip}</span>
	{@render children()}
</Button>

<script lang="ts">
	// Basic placeholder Label component
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	type Props = HTMLLabelAttributes & {
		children?: Snippet;
		class?: string;
	};

	let { children, class: className, ...restProps }: Props = $props();
</script>

<label
	class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 {className ?? ''}"
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</label>

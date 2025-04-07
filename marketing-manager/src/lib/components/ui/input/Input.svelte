<script lang="ts">
	// Basic placeholder Input component
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = HTMLInputAttributes & {
		// Add specific props if needed
		class?: string;
	};

	let { class: className, value = $bindable(), ...restProps }: Props = $props();
</script>

<input
	class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {className ?? ''}"
	bind:value
	{...restProps}
/>

<style>
	/* Basic styling - assumes Tailwind setup */
	.border-input { border-color: hsl(214.3 31.8% 91.4%); }
	.bg-background { background-color: hsl(0 0% 100%); }
	.text-muted-foreground { color: hsl(215.4 16.3% 46.9%); }
	/* Add dark mode styles if needed */
</style>

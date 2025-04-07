<script lang="ts">
	// Basic placeholder Textarea component
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	type Props = HTMLTextareaAttributes & {
		// Add specific props if needed
		class?: string;
	};

	let { class: className, value = $bindable(), ...restProps }: Props = $props();
</script>

<textarea
	class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {className ?? ''}"
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

<script lang="ts">
	import { Accordion as AccordionPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();
</script>

<AccordionPrimitive.Root
	bind:ref
	class={cn("w-full", className)}
	{...restProps}
>
	{@render children?.()}
</AccordionPrimitive.Root>

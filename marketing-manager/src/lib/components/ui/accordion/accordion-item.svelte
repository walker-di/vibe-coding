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

<AccordionPrimitive.Item
	bind:ref
	class={cn("border-b", className)}
	{...restProps}
>
	{@render children?.()}
</AccordionPrimitive.Item>

<script lang="ts">
	import { Popover as PopoverPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	} = $props();
</script>

<PopoverPrimitive.Trigger
	bind:ref
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</PopoverPrimitive.Trigger>

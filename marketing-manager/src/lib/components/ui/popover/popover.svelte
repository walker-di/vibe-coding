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

<PopoverPrimitive.Root
	bind:ref
	{...restProps}
>
	{@render children?.()}
</PopoverPrimitive.Root>

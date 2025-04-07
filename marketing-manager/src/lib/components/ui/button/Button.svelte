<script lang="ts">
	// Basic placeholder Button component
	// TODO: Replace with actual implementation (e.g., shadcn-svelte) later
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type CommonProps = {
		children: Snippet;
		variant?: string; // Placeholder for variants like 'outline'
		class?: string;
		// Add other common props if needed
	};

	// Separate props for anchor and button
	type AnchorProps = CommonProps & HTMLAnchorAttributes & { href: string };
	type ButtonProps = CommonProps & HTMLButtonAttributes & { href?: undefined; type?: 'button' | 'submit' | 'reset' };

	type Props = AnchorProps | ButtonProps;

	let props: Props = $props();

	// Use $derived for computed values
	const isAnchor = $derived(!!props.href);
	const componentType = $derived(isAnchor ? 'a' : 'button');

	const { children, class: className, ...rest } = $derived.by(() => {
		const { children, class: cn, ...restAll } = props;
		return { children, class: cn, rest: restAll };
	});

	// Correctly type and filter restProps for each case
	const anchorRestProps = $derived(() => {
		if (!isAnchor) return {};
		// Ensure only valid anchor props are included
		const { type: _t, ...validRest } = rest as HTMLAnchorAttributes;
		return validRest;
	});

	const buttonRestProps = $derived(() => {
		if (isAnchor) return {};
		// Ensure only valid button props are included (excluding type which is handled separately)
		const { type: _t, ...validRest } = rest as HTMLButtonAttributes;
		return validRest;
	});

	// Removed buttonTypeAttr derivation, will handle in template

</script>

{#if componentType === 'a'}
	<a
		href={props.href}
		class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {className ?? ''}"
		{...anchorRestProps}
	>
		{@render children()}
	</a>
{:else}
	<button
		class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {className ?? ''}"
		{...buttonRestProps}
		type={(props as ButtonProps).type ?? 'button'}
	>
		{@render children()}
	</button>
{/if}

<style>
	/* Basic styling - assumes Tailwind setup with primary colors */
	.bg-primary {
		background-color: hsl(222.2 47.4% 11.2%); /* Example primary color */
	}
	.text-primary-foreground {
		color: hsl(210 40% 98%); /* Example primary text color */
	}
	.hover\:bg-primary\/90:hover {
		background-color: hsla(222.2 47.4% 11.2% / 0.9);
	}
	/* Add styles for other variants if needed */
</style>

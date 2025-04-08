<script lang="ts">
	// Basic placeholder Button component
	// TODO: Replace with actual implementation (e.g., shadcn-svelte) later
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { melt, type Builder } from '@melt-ui/svelte'; 

	type CommonProps = {
		children: Snippet;
		variant?: string; // Placeholder for variants like 'outline'
		class?: string;
		builder?: Builder; // Changed to single builder prop
		// Add other common props if needed
	};

	// Separate props for anchor and button
	type AnchorProps = CommonProps & HTMLAnchorAttributes & { href: string };
	type ButtonProps = CommonProps & HTMLButtonAttributes & { href?: undefined; type?: 'button' | 'submit' | 'reset' };

	type Props = AnchorProps | ButtonProps;

	// Capture all props
	let {href, class: className, children, builder, ...restProps}: Props = $props(); // Destructure single builder

	// Derive component type and common props
	const isAnchor = $derived(!!href);

	// Derive button type separately
	const buttonType = $derived(isAnchor ? undefined : (restProps as ButtonProps).type ?? 'button');

</script>

{#if isAnchor}
	<a
		{...builder}
		href={href}
		class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {className ?? ''}"
		{...restProps}
	>
		{@render children()}
	</a>
{:else}
	<button
		{...builder}
		class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {className ?? ''}"
		type={buttonType}
		{...restProps}
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

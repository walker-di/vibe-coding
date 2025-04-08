<script lang="ts">
	import { page } from '$app/stores';

	// Define navigation links
	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/campaigns', label: 'Campaigns' },
		{ href: '/personas', label: 'Personas' },
		{ href: '/creatives', label: 'Creatives' }
		// { href: '/settings', label: 'Settings' } // Add later
	];

	// Reactive variable to check the current path
	let currentPath = $derived($page.url.pathname);

	// Function to determine if a link is active (or a sub-route of it)
	function isActive(href: string): boolean {
		if (href === '/') {
			return currentPath === '/'; // Exact match for home
		}
		// Check if the current path starts with the link's href
		return currentPath.startsWith(href);
	}
</script>

<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container flex h-14 items-center">
		<a href="/" class="mr-6 flex items-center space-x-2">
			<!-- TODO: Add a logo/icon here if desired -->
			<span class="font-bold">Marketing Manager</span>
		</a>
		<nav class="flex items-center space-x-6 text-sm font-medium">
			{#each navLinks as link}
				<a
					href={link.href}
					class={`transition-colors hover:text-foreground/80 ${isActive(link.href) ? 'text-foreground' : 'text-foreground/60'}`}
				>
					{link.label}
				</a>
			{/each}
		</nav>
		<!-- Optional: Add user profile/actions to the right -->
		<!-- <div class="flex flex-1 items-center justify-end space-x-4"> ... </div> -->
	</div>
</header>

<style>
	/* Add any component-specific styles if needed, Tailwind is preferred */
</style>

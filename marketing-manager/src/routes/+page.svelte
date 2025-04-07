<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { LayoutGrid } from 'lucide-svelte';
</script>

<div class="container mx-auto flex flex-col items-center justify-center py-16 text-center">
	<h1 class="mb-4 text-4xl font-bold tracking-tight">Marketing Manager</h1>
	<p class="mb-8 max-w-xl text-lg text-muted-foreground">
		Welcome! Manage your marketing campaigns, personas, and creatives efficiently.
	</p>

	<div class="flex gap-4">
		<Button href="/campaigns">
			<LayoutGrid class="mr-2 h-5 w-5" />
			View Campaigns
		</Button>
		<!-- Add links to other sections as they are built -->
		<!--
		<Button href="/personas" variant="secondary" size="lg" disabled>Personas (Coming Soon)</Button>
		<Button href="/creatives" variant="secondary" size="lg" disabled>Creatives (Coming Soon)</Button>
		-->
	</div>
</div>

<style>
	/* Add specific styles if needed */
</style>

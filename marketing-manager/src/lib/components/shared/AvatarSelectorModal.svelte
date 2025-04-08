<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { User } from 'lucide-svelte'; // Keep for potential fallback

	// --- Props ---
	let { open = $bindable(false), onSelect } = $props<{
		open?: boolean;
		onSelect: (url: string) => void;
	}>();

	// --- Sample Avatar URLs ---
	// Based on patterns from avagar.prompt.ts
	// GENERATED LIST - VERY EXTENSIVE
	const sampleAvatars = [
		// --- Illustrated (avatar.iran.liara.run/public) ---
		// Basic
		'https://avatar.iran.liara.run/public',
		'https://avatar.iran.liara.run/public/boy',
		'https://avatar.iran.liara.run/public/girl',
		// Username Specific (Selection)
		'https://avatar.iran.liara.run/public/boy?username=Scott',
		'https://avatar.iran.liara.run/public/girl?username=Maria',
		'https://avatar.iran.liara.run/public/boy?username=Peter',
		'https://avatar.iran.liara.run/public/girl?username=Olivia',
		'https://avatar.iran.liara.run/public?username=Alex',
		'https://avatar.iran.liara.run/public?username=Taylor',
		// Job Specific (Further Expanded Selection)
		'https://avatar.iran.liara.run/public/job/doctor/male',
		'https://avatar.iran.liara.run/public/job/doctor/female',
		'https://avatar.iran.liara.run/public/job/police/male',
		'https://avatar.iran.liara.run/public/job/police/female',
		'https://avatar.iran.liara.run/public/job/lawyer/male',
		'https://avatar.iran.liara.run/public/job/lawyer/female',
		'https://avatar.iran.liara.run/public/job/farmer/male',
		'https://avatar.iran.liara.run/public/job/farmer/female',
		// ID Specific (All 1-100)
		...Array.from({ length: 100 }, (_, i) => `https://avatar.iran.liara.run/public/${i + 1}`),

		// --- Realistic (randomuser.me) ---
		// Men (All 0-100)
		...Array.from({ length: 101 }, (_, i) => `https://randomuser.me/api/portraits/men/${i}.jpg`),
		// Women (All 0-100)
		...Array.from({ length: 101 }, (_, i) => `https://randomuser.me/api/portraits/women/${i}.jpg`),
	];

	// --- Event Handlers ---
	function handleSelect(url: string) {
		onSelect(url);
		open = false; // Close dialog after selection
	}

</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Select Placeholder Avatar</Dialog.Title>
			<Dialog.Description>Click an image to select it.</Dialog.Description>
		</Dialog.Header>

		<!-- Scrollable Grid Area -->
		<div class="overflow-y-auto py-4 pr-2" style="max-height: 60vh;">
			<div class="grid grid-cols-3 gap-4 md:grid-cols-4">
				{#each sampleAvatars as avatarUrl}
					<button
						type="button"
						class="relative aspect-square overflow-hidden rounded-md border p-0 transition-all hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
						onclick={() => handleSelect(avatarUrl)}
						title="Select this avatar"
					>
						<img
							src={avatarUrl}
							alt="Avatar Option"
							class="h-full w-full object-cover"
							loading="lazy"
							onerror={(e) => {
								const img = e.target as HTMLImageElement;
								img.style.display='none';
								const fallback = img.nextElementSibling as HTMLElement | null;
								if (fallback) {
									fallback.style.display='flex';
								}
							}}
						/>
						<!-- Fallback Icon -->
						<div class="absolute inset-0 hidden items-center justify-center bg-muted text-muted-foreground">
							<User class="h-1/2 w-1/2" />
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Footer (Only Cancel Button) -->
		<Dialog.Footer class="border-t pt-4">
			<Button variant="outline" onclick={() => open = false}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs/index.js'; // Corrected import path
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Slider } from '$lib/components/ui/slider';
	import { User } from 'lucide-svelte';

	// --- Props ---
	let { open = $bindable(false), onSelect } = $props<{
		open?: boolean;
		onSelect: (url: string) => void;
	}>();

	// --- Constants ---
	const illustratedBaseUrl = 'https://avatar.iran.liara.run/public';
	const realisticBaseUrl = 'https://randomuser.me/api/portraits';

	// --- State ---
	let selectedTab = $state<'illustrated' | 'realistic'>('illustrated');

	// Illustrated State
	let illustratedType = $state<'random' | 'username' | 'job'>('random');
	let illustratedGender = $state<'boy' | 'girl' | ''>('');
	let illustratedUsername = $state('');
	let illustratedJobTitle = $state('');

	// Realistic State
	let realisticGender = $state<'men' | 'women'>('men');
	let realisticNumber = $state(50); // Default middle value

	// --- State for Preview URL ---
	let previewUrl = $state(''); // Use $state instead of $derived

	// --- Effect to update Preview URL ---
	$effect(() => {
		let url = '';
		if (selectedTab === 'illustrated') {
			switch (illustratedType) {
				case 'random':
					url = illustratedGender ? `${illustratedBaseUrl}/${illustratedGender}` : illustratedBaseUrl;
					break;
				case 'username':
					if (illustratedUsername) {
						const usernameParam = encodeURIComponent(illustratedUsername);
						url = illustratedGender
							? `${illustratedBaseUrl}/${illustratedGender}?username=${usernameParam}`
							: `${illustratedBaseUrl}/?username=${usernameParam}`;
					} else {
						url = '';
					}
					break;
				case 'job':
					if (illustratedJobTitle && illustratedGender) {
						const jobParam = encodeURIComponent(illustratedJobTitle);
						url = `${illustratedBaseUrl}/job/${jobParam}/${illustratedGender}`;
					} else {
						url = '';
					}
					break;
				default:
					url = '';
					break;
			}
		} else {
			// Realistic
			url = `${realisticBaseUrl}/${realisticGender}/${realisticNumber}.jpg`;
		}
		previewUrl = url; // Update the state variable
	});

	// --- Event Handlers ---
	function handleSelect() {
		if (previewUrl) {
			onSelect(previewUrl);
			open = false; // Close dialog after selection
		}
	}

	function resetIllustratedState() {
		illustratedGender = '';
		illustratedUsername = '';
		illustratedJobTitle = '';
	}

	// Reset specific illustrated state when type changes
	$effect(() => {
		resetIllustratedState();
	});

</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Select Avatar Placeholder</Dialog.Title>
			<Dialog.Description>Choose an avatar type and configure options.</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root bind:value={selectedTab} class="w-full pt-4">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="illustrated">Illustrated</Tabs.Trigger>
				<Tabs.Trigger value="realistic">Realistic</Tabs.Trigger>
			</Tabs.List>

			<!-- Illustrated Tab Content -->
			<Tabs.Content value="illustrated" class="mt-4 space-y-4">
				<RadioGroup bind:value={illustratedType} class="flex space-x-4">
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="random" id="r1" />
						<Label for="r1">Random</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="username" id="r2" />
						<Label for="r2">By Username</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="job" id="r3" />
						<Label for="r3">By Job</Label>
					</div>
				</RadioGroup>

				{#if illustratedType !== 'random'}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">Gender *</Label>
						<RadioGroup bind:value={illustratedGender} class="col-span-3 flex space-x-4">
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="boy" id="g-boy" />
								<Label for="g-boy">Male</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="girl" id="g-girl" />
								<Label for="g-girl">Female</Label>
							</div>
						</RadioGroup>
					</div>
				{/if}

				{#if illustratedType === 'random'}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">Gender</Label>
						<RadioGroup bind:value={illustratedGender} class="col-span-3 flex space-x-4">
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="" id="g-any" />
								<Label for="g-any">Any</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="boy" id="g-boy-rand" />
								<Label for="g-boy-rand">Male</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="girl" id="g-girl-rand" />
								<Label for="g-girl-rand">Female</Label>
							</div>
						</RadioGroup>
					</div>
				{/if}

				{#if illustratedType === 'username'}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="username" class="text-right">Username *</Label>
						<Input id="username" bind:value={illustratedUsername} class="col-span-3" placeholder="e.g., Scott" required />
					</div>
				{/if}

				{#if illustratedType === 'job'}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="jobtitle" class="text-right">Job Title *</Label>
						<Input id="jobtitle" bind:value={illustratedJobTitle} class="col-span-3" placeholder="e.g., doctor" required />
					</div>
				{/if}
			</Tabs.Content>

			<!-- Realistic Tab Content -->
			<Tabs.Content value="realistic" class="mt-4 space-y-6">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">Gender</Label>
					<RadioGroup bind:value={realisticGender} class="col-span-3 flex space-x-4">
						<div class="flex items-center space-x-2">
							<RadioGroupItem value="men" id="rg-men" />
							<Label for="rg-men">Men</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroupItem value="women" id="rg-women" />
							<Label for="rg-women">Women</Label>
						</div>
					</RadioGroup>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">Number ({realisticNumber})</Label>
					<Slider
						bind:value={realisticNumber}
						max={99}
						min={0}
						step={1}
						class="col-span-3"
					/>
				</div>
			</Tabs.Content>
		</Tabs.Root>

		<!-- Preview Area -->
		<div class="mt-6 flex flex-col items-center justify-center space-y-2">
			<Label>Preview</Label>
			{#if previewUrl}
				<img src={previewUrl} alt="Avatar Preview" class="h-24 w-24 rounded-full border object-cover" />
				<p class="text-xs text-muted-foreground break-all">{previewUrl}</p>
			{:else}
				<div class="flex h-24 w-24 items-center justify-center rounded-full border bg-gray-100 text-gray-400">
					<User class="h-12 w-12" />
				</div>
				<p class="text-xs text-muted-foreground">Configure options to see preview</p>
			{/if}
		</div>

		<Dialog.Footer class="pt-4">
			<Button variant="outline" onclick={() => open = false}>Cancel</Button>
			<Button onclick={handleSelect} disabled={!previewUrl}>Select Avatar</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

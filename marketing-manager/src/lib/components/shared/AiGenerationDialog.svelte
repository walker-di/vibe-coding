<script lang="ts">
	import Button from '$lib/components/ui/button/Button.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Label from '$lib/components/ui/label/Label.svelte';
	import Textarea from '$lib/components/ui/textarea/Textarea.svelte';
	import { AlertCircle, Loader2 } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		open: boolean; // Bindable prop for visibility
		apiUrl: string; // API endpoint for generation
		triggerButtonText?: string;
		triggerButtonVariant?: string; // Allow customizing trigger button variant
		dialogTitle?: string;
		dialogDescription?: string;
		instructionPlaceholder?: string;
		disabled?: boolean; // To disable the trigger
		currentData?: Record<string, any> | null; // Add prop for current form data
		onGenerated: (data: any) => void; // Event callback for generated data
		children?: Snippet; // Optional slot for custom trigger
	};

	let {
		open = $bindable(false), // Make prop bindable with explicit default
		apiUrl,
		triggerButtonText = 'AI',
		triggerButtonVariant = 'secondary',
		dialogTitle = 'Generate with AI',
		dialogDescription = 'Enter instructions for the AI to fill out the form fields.',
		instructionPlaceholder = 'e.g., Create details for...',
		disabled = false,
		currentData = null, // Default currentData to null
		onGenerated,
		children = undefined // Default children to undefined
	}: Props = $props();

	// --- Internal State ---
	let instructions = $state('');
	let isGenerating = $state(false);
	let error = $state<string | null>(null);

	// --- Generation Logic ---
	async function generate() {
		if (!instructions.trim()) {
			error = 'Please provide instructions for the AI.';
			return;
		}
		isGenerating = true;
		error = null;

		try {
			console.log('--- AI DIALOG: Attempting to fetch from apiUrl:', apiUrl); // Log the URL
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					instructions: instructions,
					currentData: currentData // Include currentData in the request body
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: response.statusText }));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const generatedData = await response.json();

			// Call the event handler prop with the data
			onGenerated(generatedData);

			// Close modal and reset internal state on success
			open = false; // This updates the bound prop in the parent
			instructions = '';

		} catch (err: any) {
			console.error('AI Generation Error:', err);
			error = `Failed to generate content: ${err.message}`;
		} finally {
			isGenerating = false;
		}
	}

	// Reset error when instructions change
	$effect(() => {
		if (instructions) {
			error = null;
		}
	});

</script>

<Dialog.Root open={open} onOpenChange={(isOpen) => open = isOpen}>
	{#if children}
		<Dialog.Trigger asChild>
			{@render children()}
		</Dialog.Trigger>
	{/if}
	<Dialog.Content class="sm:max-w-[525px]">
		<Dialog.Header>
			<Dialog.Title>{dialogTitle}</Dialog.Title>
			<Dialog.Description>{dialogDescription}</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<Label for="ai-instructions">Instructions</Label>
			<Textarea
				id="ai-instructions"
				bind:value={instructions}
				placeholder={instructionPlaceholder}
				rows={5}
				disabled={isGenerating}
			/>
			{#if error}
				<div class="flex items-center text-sm text-red-600">
					<AlertCircle class="mr-1 h-4 w-4" />
					<span>{error}</span>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Dialog.Close>
			<Button variant="outline" type="button" disabled={isGenerating}>Cancel</Button>
			</Dialog.Close>
			<Button onclick={(e: MouseEvent) => { e.stopPropagation(); generate(); }} disabled={isGenerating || !instructions.trim()} type="button">
				{#if isGenerating}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Generating...
				{:else}
					Generate
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { ptBRVoices, defaultVoices } from '$lib/constants/voices'; // Assuming pt-BR for now

	// --- Image Generation State ---
	let imagePrompt = $state('');
	let imageAspectRatio = $state<'1:1' | '16:9'>('1:1');
	let generatedImageUrl = $state<string | null>(null);
	let isGeneratingImage = $state(false);
	let imageError = $state<string | null>(null);

	// --- Narration Generation State ---
	let narrationText = $state('');
	let selectedVoice = $state(defaultVoices['pt-BR']); // Default to pt-BR Francisca
	let generatedAudioUrl = $state<string | null>(null);
	let isGeneratingNarration = $state(false);
	let narrationError = $state<string | null>(null);

	// --- Handlers ---
	async function handleGenerateImage() {
		if (!imagePrompt.trim()) {
			imageError = 'Please enter a prompt.';
			return;
		}
		isGeneratingImage = true;
		imageError = null;
		generatedImageUrl = null;

		try {
			const response = await fetch('/api/test/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: imagePrompt, aspectRatio: imageAspectRatio })
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || `HTTP error! status: ${response.status}`);
			}

			generatedImageUrl = result.imageUrl;
		} catch (err: any) {
			console.error('Image generation error:', err);
			imageError = err.message || 'Failed to generate image.';
		} finally {
			isGeneratingImage = false;
		}
	}

	async function handleGenerateNarration() {
		if (!narrationText.trim()) {
			narrationError = 'Please enter text for narration.';
			return;
		}
		isGeneratingNarration = true;
		narrationError = null;
		generatedAudioUrl = null;

		try {
			const response = await fetch('/api/test/generate-narration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: narrationText, voiceName: selectedVoice })
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || `HTTP error! status: ${response.status}`);
			}

			generatedAudioUrl = result.narrationAudioUrl;
		} catch (err: any) {
			console.error('Narration generation error:', err);
			narrationError = err.message || 'Failed to generate narration audio.';
		} finally {
			isGeneratingNarration = false;
		}
	}
</script>

<svelte:head>
	<title>AI Feature Test</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 space-y-8">
	<h1 class="text-3xl font-bold mb-6">AI Feature Test Page</h1>

	<!-- Image Generation Section -->
	<section class="p-6 border rounded-lg shadow-sm">
		<h2 class="text-2xl font-semibold mb-4">Image Generation Test</h2>
		<div class="space-y-4">
			<div>
				<Label for="image-prompt">Prompt</Label>
				<Input id="image-prompt" placeholder="Enter image prompt..." bind:value={imagePrompt} disabled={isGeneratingImage} />
			</div>
			<div>
				<Label>Aspect Ratio</Label>
				<RadioGroup bind:value={imageAspectRatio} class="flex space-x-4 mt-1" disabled={isGeneratingImage}>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="1:1" id="ar-1-1" />
						<Label for="ar-1-1">1:1 (Square)</Label>
					</div>
					<div class="flex items-center space-x-2">
						<RadioGroupItem value="16:9" id="ar-16-9" />
						<Label for="ar-16-9">16:9 (Widescreen)</Label>
					</div>
				</RadioGroup>
			</div>
			<Button onclick={handleGenerateImage} disabled={isGeneratingImage}>
				{isGeneratingImage ? 'Generating...' : 'Generate Image'}
			</Button>

			{#if imageError}
				<p class="text-red-600 mt-2">{imageError}</p>
			{/if}

			{#if generatedImageUrl}
				<div class="mt-4 border rounded p-4">
					<h3 class="text-lg font-medium mb-2">Generated Image:</h3>
					<img src={generatedImageUrl} alt="Generated from prompt: {imagePrompt}" class="max-w-full h-auto rounded" />
				</div>
			{/if}
		</div>
	</section>

	<Separator />

	<!-- Narration Generation Section -->
	<section class="p-6 border rounded-lg shadow-sm">
		<h2 class="text-2xl font-semibold mb-4">Narration Generation Test</h2>
		<div class="space-y-4">
			<div>
				<Label for="narration-text">Narration Text</Label>
				<Textarea id="narration-text" placeholder="Enter text to narrate..." bind:value={narrationText} rows={4} disabled={isGeneratingNarration} />
			</div>
			<div>
				<Label for="voice-select">Voice</Label>
				<!-- Use value prop and onSelectedChange handler -->
				<Select
					value={selectedVoice}
					onSelectedChange={(v: { value: string; label: string } | null) => {
						// The event might provide an object with value/label or null
						if (v) selectedVoice = v.value;
					}}
					type="single"
					disabled={isGeneratingNarration}
				>
					<SelectTrigger id="voice-select" class="w-[280px]">
						<SelectValue placeholder="Select a voice" />
					</SelectTrigger>
					<SelectContent>
						{#each ptBRVoices as voice}
							<SelectItem value={voice.value}>{voice.name}</SelectItem>
						{/each}
						<!-- TODO: Add other languages if needed -->
					</SelectContent>
				</Select>
			</div>
			<Button onclick={handleGenerateNarration} disabled={isGeneratingNarration}>
				{isGeneratingNarration ? 'Generating...' : 'Generate Narration'}
			</Button>

			{#if narrationError}
				<p class="text-red-600 mt-2">{narrationError}</p>
			{/if}

			{#if generatedAudioUrl}
				<div class="mt-4 border rounded p-4">
					<h3 class="text-lg font-medium mb-2">Generated Audio:</h3>
					<audio controls src={generatedAudioUrl}>
						Your browser does not support the audio element.
					</audio>
				</div>
			{/if}
		</div>
	</section>
</div>

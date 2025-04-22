<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '$lib/components/ui/accordion';
	import { Slider } from '$lib/components/ui/slider';
	import { Switch } from '$lib/components/ui/switch';
	import { Sparkles, Save, Trash2, Copy, Clock, Star, StarOff } from 'lucide-svelte';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';

	// Types
	type GeneratedImage = {
		id: string;
		url: string;
		prompt: string;
		aspectRatio: '1:1' | '16:9' | '9:16';
		timestamp: string;
		isFavorite: boolean;
		additionalParams?: {
			quality?: number;
			safetyTolerance?: number;
			promptUpsampling?: boolean;
		};
	};

	// State
	let imagePrompt = $state('');
	let aspectRatio = $state<'1:1' | '16:9' | '9:16'>('1:1');
	let isGenerating = $state(false);
	let error = $state<string | null>(null);
	let currentImage = $state<GeneratedImage | null>(null);
	let generatedImages = $state<GeneratedImage[]>([]);
	let favoriteImages = $state<GeneratedImage[]>([]);
	let activeTab = $state('generator');
	let historyTab = $state('all');

	// Advanced options
	let showAdvancedOptions = $state(false);
	let imageQuality = $state(80); // 1-100
	let safetyTolerance = $state(2); // 0-3
	let promptUpsampling = $state(true);

	// Load saved images from localStorage on mount
	onMount(() => {
		try {
			const savedImages = localStorage.getItem('generatedImages');
			if (savedImages) {
				generatedImages = JSON.parse(savedImages);
				// Filter favorite images
				favoriteImages = generatedImages.filter(img => img.isFavorite);
			}
		} catch (e) {
			console.error('Error loading saved images:', e);
		}
	});

	// Save images to localStorage whenever they change
	$effect(() => {
		try {
			localStorage.setItem('generatedImages', JSON.stringify(generatedImages));
		} catch (e) {
			console.error('Error saving images to localStorage:', e);
		}
	});

	// Generate image handler
	async function handleGenerateImage() {
		if (!imagePrompt.trim()) {
			error = 'Please enter a prompt.';
			return;
		}

		isGenerating = true;
		error = null;
		currentImage = null;

		try {
			const response = await fetch('/api/test/advanced-image-generation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: imagePrompt,
					aspectRatio,
					additionalParams: {
						quality: imageQuality,
						safetyTolerance,
						promptUpsampling
					}
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || `HTTP error! status: ${response.status}`);
			}

			// Create a new image object
			const newImage: GeneratedImage = {
				id: Date.now().toString(),
				url: result.imageUrl,
				prompt: imagePrompt,
				aspectRatio,
				timestamp: new Date().toISOString(),
				isFavorite: false,
				additionalParams: {
					quality: imageQuality,
					safetyTolerance,
					promptUpsampling
				}
			};

			// Set as current image and add to history
			currentImage = newImage;
			generatedImages = [newImage, ...generatedImages];

		} catch (err: any) {
			console.error('Image generation error:', err);
			error = err.message || 'Failed to generate image.';
		} finally {
			isGenerating = false;
		}
	}

	// Toggle favorite status
	function toggleFavorite(imageId: string) {
		generatedImages = generatedImages.map(img => {
			if (img.id === imageId) {
				const updatedImg = { ...img, isFavorite: !img.isFavorite };
				if (currentImage?.id === imageId) {
					currentImage = updatedImg;
				}
				return updatedImg;
			}
			return img;
		});

		// Update favorites list
		favoriteImages = generatedImages.filter(img => img.isFavorite);
	}

	// Delete image
	function deleteImage(imageId: string) {
		generatedImages = generatedImages.filter(img => img.id !== imageId);
		if (currentImage?.id === imageId) {
			currentImage = null;
		}
		favoriteImages = favoriteImages.filter(img => img.id !== imageId);
	}

	// Copy prompt to clipboard
	function copyPrompt(prompt: string) {
		navigator.clipboard.writeText(prompt)
			.then(() => {
				// Could show a toast notification here
				console.log('Prompt copied to clipboard');
			})
			.catch(err => {
				console.error('Failed to copy prompt:', err);
			});
	}

	// Use an existing image as the current image
	function useImage(image: GeneratedImage) {
		currentImage = image;
		imagePrompt = image.prompt;
		aspectRatio = image.aspectRatio;
		
		// Set advanced options if available
		if (image.additionalParams) {
			if (image.additionalParams.quality !== undefined) {
				imageQuality = image.additionalParams.quality;
			}
			if (image.additionalParams.safetyTolerance !== undefined) {
				safetyTolerance = image.additionalParams.safetyTolerance;
			}
			if (image.additionalParams.promptUpsampling !== undefined) {
				promptUpsampling = image.additionalParams.promptUpsampling;
			}
		}
	}

	// Format date for display
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}
</script>

<svelte:head>
	<title>AI Image Generator</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 space-y-8">
	<h1 class="text-3xl font-bold mb-6">AI Image Generator</h1>

	<Tabs value={activeTab} onValueChange={(value) => activeTab = value} class="w-full">
		<TabsList class="grid w-full grid-cols-2">
			<TabsTrigger value="generator" class="flex items-center gap-1">
				<Sparkles class="h-4 w-4 mr-1" />
				Generator
			</TabsTrigger>
			<TabsTrigger value="history" class="flex items-center gap-1">
				<Clock class="h-4 w-4 mr-1" />
				History
			</TabsTrigger>
		</TabsList>

		<!-- Generator Tab -->
		<TabsContent value="generator" class="space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Input Panel -->
				<div class="space-y-4 p-6 border rounded-lg shadow-sm">
					<div>
						<Label for="image-prompt">Image Prompt</Label>
						<Input 
							id="image-prompt" 
							placeholder="Describe the image you want to generate..." 
							bind:value={imagePrompt} 
							disabled={isGenerating} 
						/>
					</div>

					<div>
						<Label>Aspect Ratio</Label>
						<RadioGroup bind:value={aspectRatio} class="flex flex-wrap gap-4 mt-1" disabled={isGenerating}>
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="1:1" id="ar-1-1" />
								<Label for="ar-1-1">1:1 (Square)</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="16:9" id="ar-16-9" />
								<Label for="ar-16-9">16:9 (Landscape)</Label>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroupItem value="9:16" id="ar-9-16" />
								<Label for="ar-9-16">9:16 (Portrait)</Label>
							</div>
						</RadioGroup>
					</div>

					<Accordion type="single" collapsible>
						<AccordionItem value="advanced-options">
							<AccordionTrigger>Advanced Options</AccordionTrigger>
							<AccordionContent>
								<div class="space-y-4 pt-2">
									<div>
										<div class="flex justify-between mb-2">
											<Label for="image-quality">Image Quality: {imageQuality}</Label>
										</div>
										<Slider 
											id="image-quality" 
											min={10} 
											max={100} 
											step={5} 
											bind:value={imageQuality} 
											disabled={isGenerating}
										/>
									</div>

									<div>
										<div class="flex justify-between mb-2">
											<Label for="safety-tolerance">Safety Tolerance: {safetyTolerance}</Label>
										</div>
										<Slider 
											id="safety-tolerance" 
											min={0} 
											max={3} 
											step={1} 
											bind:value={safetyTolerance} 
											disabled={isGenerating}
										/>
										<p class="text-xs text-gray-500 mt-1">
											Higher values allow more creative freedom but may include sensitive content
										</p>
									</div>

									<div class="flex items-center space-x-2">
										<Switch 
											id="prompt-upsampling" 
											bind:checked={promptUpsampling} 
											disabled={isGenerating}
										/>
										<Label for="prompt-upsampling">Prompt Upsampling</Label>
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<Button 
						onclick={handleGenerateImage} 
						disabled={isGenerating} 
						class="w-full"
					>
						{#if isGenerating}
							<span class="animate-spin mr-2">⟳</span> Generating...
						{:else}
							<Sparkles class="h-4 w-4 mr-2" /> Generate Image
						{/if}
					</Button>

					{#if error}
						<p class="text-red-600 mt-2">{error}</p>
					{/if}
				</div>

				<!-- Preview Panel -->
				<div class="p-6 border rounded-lg shadow-sm">
					<h2 class="text-xl font-semibold mb-4">Preview</h2>
					
					{#if isGenerating}
						<div class="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
							<div class="animate-spin text-2xl mb-2">⟳</div>
							<p>Generating image...</p>
						</div>
					{:else if currentImage}
						<div class="space-y-4">
							<div class="relative">
								<img 
									src={currentImage.url} 
									alt="Generated from prompt: {currentImage.prompt}" 
									class="max-w-full h-auto rounded-md border"
								/>
								<div class="absolute top-2 right-2 flex space-x-1">
									<button 
										class="p-1 bg-white/80 rounded-full hover:bg-white"
										onclick={() => toggleFavorite(currentImage.id)}
										title={currentImage.isFavorite ? "Remove from favorites" : "Add to favorites"}
									>
										{#if currentImage.isFavorite}
											<Star class="h-5 w-5 text-yellow-500" />
										{:else}
											<StarOff class="h-5 w-5 text-gray-500" />
										{/if}
									</button>
								</div>
							</div>
							
							<div class="space-y-2">
								<div class="flex justify-between">
									<span class="text-sm font-medium">Prompt:</span>
									<button 
										class="text-sm text-blue-600 hover:text-blue-800"
										onclick={() => copyPrompt(currentImage.prompt)}
										title="Copy prompt"
									>
										<Copy class="h-4 w-4" />
									</button>
								</div>
								<p class="text-sm">{currentImage.prompt}</p>
								
								<div class="flex justify-between text-sm">
									<span>Aspect Ratio: {currentImage.aspectRatio}</span>
									<span>Generated: {formatDate(currentImage.timestamp)}</span>
								</div>
							</div>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
							<Sparkles class="h-8 w-8 text-gray-400 mb-2" />
							<p class="text-gray-500">No image generated yet</p>
							<p class="text-sm text-gray-400">Enter a prompt and click Generate</p>
						</div>
					{/if}
				</div>
			</div>
		</TabsContent>

		<!-- History Tab -->
		<TabsContent value="history">
			<div class="space-y-4">
				<Tabs value={historyTab} onValueChange={(value) => historyTab = value} class="w-full">
					<TabsList class="grid w-full grid-cols-2">
						<TabsTrigger value="all">All Images</TabsTrigger>
						<TabsTrigger value="favorites">Favorites</TabsTrigger>
					</TabsList>

					<TabsContent value="all" class="pt-4">
						{#if generatedImages.length === 0}
							<div class="text-center py-8 border border-dashed rounded-md">
								<p class="text-gray-500">No images generated yet</p>
							</div>
						{:else}
							<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{#each generatedImages as image (image.id)}
									<Card>
										<CardHeader class="p-4 pb-2">
											<CardTitle class="text-sm truncate">{image.prompt.substring(0, 30)}...</CardTitle>
											<CardDescription class="text-xs">{formatDate(image.timestamp)}</CardDescription>
										</CardHeader>
										<CardContent class="p-4 pt-0 pb-2">
											<div class="relative aspect-square">
												<img 
													src={image.url} 
													alt={image.prompt} 
													class="w-full h-full object-cover rounded-md"
												/>
												{#if image.isFavorite}
													<div class="absolute top-1 right-1">
														<Star class="h-4 w-4 text-yellow-500" />
													</div>
												{/if}
											</div>
										</CardContent>
										<CardFooter class="p-4 pt-2 flex justify-between">
											<Button 
												variant="outline" 
												size="sm" 
												onclick={() => useImage(image)}
												title="Use this image"
											>
												Use
											</Button>
											<div class="flex space-x-1">
												<Button 
													variant="ghost" 
													size="icon" 
													onclick={() => toggleFavorite(image.id)}
													title={image.isFavorite ? "Remove from favorites" : "Add to favorites"}
												>
													{#if image.isFavorite}
														<Star class="h-4 w-4 text-yellow-500" />
													{:else}
														<StarOff class="h-4 w-4" />
													{/if}
												</Button>
												<Button 
													variant="ghost" 
													size="icon" 
													onclick={() => deleteImage(image.id)}
													title="Delete image"
												>
													<Trash2 class="h-4 w-4 text-red-500" />
												</Button>
											</div>
										</CardFooter>
									</Card>
								{/each}
							</div>
						{/if}
					</TabsContent>

					<TabsContent value="favorites" class="pt-4">
						{#if favoriteImages.length === 0}
							<div class="text-center py-8 border border-dashed rounded-md">
								<p class="text-gray-500">No favorite images yet</p>
								<p class="text-sm text-gray-400">Star images to add them to favorites</p>
							</div>
						{:else}
							<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{#each favoriteImages as image (image.id)}
									<Card>
										<CardHeader class="p-4 pb-2">
											<CardTitle class="text-sm truncate">{image.prompt.substring(0, 30)}...</CardTitle>
											<CardDescription class="text-xs">{formatDate(image.timestamp)}</CardDescription>
										</CardHeader>
										<CardContent class="p-4 pt-0 pb-2">
											<div class="relative aspect-square">
												<img 
													src={image.url} 
													alt={image.prompt} 
													class="w-full h-full object-cover rounded-md"
												/>
												<div class="absolute top-1 right-1">
													<Star class="h-4 w-4 text-yellow-500" />
												</div>
											</div>
										</CardContent>
										<CardFooter class="p-4 pt-2 flex justify-between">
											<Button 
												variant="outline" 
												size="sm" 
												onclick={() => useImage(image)}
												title="Use this image"
											>
												Use
											</Button>
											<div class="flex space-x-1">
												<Button 
													variant="ghost" 
													size="icon" 
													onclick={() => toggleFavorite(image.id)}
													title="Remove from favorites"
												>
													<Star class="h-4 w-4 text-yellow-500" />
												</Button>
												<Button 
													variant="ghost" 
													size="icon" 
													onclick={() => deleteImage(image.id)}
													title="Delete image"
												>
													<Trash2 class="h-4 w-4 text-red-500" />
												</Button>
											</div>
										</CardFooter>
									</Card>
								{/each}
							</div>
						{/if}
					</TabsContent>
				</Tabs>
			</div>
		</TabsContent>
	</Tabs>
</div>

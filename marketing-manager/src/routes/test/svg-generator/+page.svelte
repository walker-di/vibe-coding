<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '$lib/components/ui/accordion';
	import { Slider } from '$lib/components/ui/slider';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { FileText, Save, Trash2, Copy, Clock, Star, StarOff, Download } from 'lucide-svelte';

	// Types
	type GeneratedSvg = {
		id: string;
		svgUrl: string;
		prompt: string;
		svg: string;
		timestamp: string;
		isFavorite: boolean;
		metadata: {
			width: number;
			height: number;
			description: string;
			elements: string[];
		};
	};

	// State
	let svgPrompt = $state('');
	let width = $state(800);
	let height = $state(600);
	let temperature = $state(0.5);
	let isGenerating = $state(false);
	let error = $state<string | null>(null);
	let currentSvg = $state<GeneratedSvg | null>(null);
	let generatedSvgs = $state<GeneratedSvg[]>([]);
	let favoriteSvgs = $state<GeneratedSvg[]>([]);
	let activeTab = $state('generator');
	let historyTab = $state('all');

	// Load saved SVGs from localStorage on mount
	onMount(() => {
		try {
			const savedSvgs = localStorage.getItem('generatedSvgs');
			if (savedSvgs) {
				generatedSvgs = JSON.parse(savedSvgs);
				// Filter favorite SVGs
				favoriteSvgs = generatedSvgs.filter(svg => svg.isFavorite);
			}
		} catch (e) {
			console.error('Error loading saved SVGs:', e);
		}
	});

	// Save SVGs to localStorage whenever they change
	$effect(() => {
		try {
			localStorage.setItem('generatedSvgs', JSON.stringify(generatedSvgs));
		} catch (e) {
			console.error('Error saving SVGs to localStorage:', e);
		}
	});

	// Generate SVG handler
	async function handleGenerateSvg() {
		if (!svgPrompt.trim()) {
			error = 'Please enter a prompt.';
			return;
		}

		isGenerating = true;
		error = null;
		currentSvg = null;

		try {
			// Add a timeout to the fetch request
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

			try {
				const response = await fetch('/api/test/generate-svg', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						prompt: svgPrompt,
						width,
						height,
						temperature
					}),
					signal: controller.signal
				});

				// Clear the timeout
				clearTimeout(timeoutId);

				const result = await response.json();

				if (!response.ok || !result.success) {
					// Handle API error response
					let errorMessage = result.message || `HTTP error! status: ${response.status}`;
					if (result.errorDetails) {
						console.error('Error details:', result.errorDetails);
					}
					throw new Error(errorMessage);
				}

				// Create a new SVG object
				const newSvg: GeneratedSvg = {
					id: Date.now().toString(),
					svgUrl: result.svgUrl,
					prompt: svgPrompt,
					svg: result.svgData.svg,
					timestamp: new Date().toISOString(),
					isFavorite: false,
					metadata: result.svgData.metadata
				};

				// Set as current SVG and add to history
				currentSvg = newSvg;
				generatedSvgs = [newSvg, ...generatedSvgs];
			} catch (fetchError: any) {
				// Handle fetch errors (network issues, timeouts, etc.)
				console.error('Fetch error:', fetchError);

				if (fetchError.name === 'AbortError') {
					error = 'Request timed out. The SVG generation is taking too long or there might be connectivity issues.';
				} else if (fetchError.message.includes('Failed to fetch')) {
					error = 'Network error. Please check your internet connection and try again.';
				} else {
					error = fetchError.message || 'Failed to generate SVG.';
				}
			} finally {
				// Clear the timeout if it hasn't fired yet
				clearTimeout(timeoutId);
			}
		} catch (err: any) {
			// Handle any other errors
			console.error('SVG generation error:', err);
			error = err.message || 'Failed to generate SVG.';
		} finally {
			isGenerating = false;
		}
	}

	// Toggle favorite status
	function toggleFavorite(svgId: string) {
		generatedSvgs = generatedSvgs.map(svg => {
			if (svg.id === svgId) {
				const updatedSvg = { ...svg, isFavorite: !svg.isFavorite };
				if (currentSvg?.id === svgId) {
					currentSvg = updatedSvg;
				}
				return updatedSvg;
			}
			return svg;
		});

		// Update favorites list
		favoriteSvgs = generatedSvgs.filter(svg => svg.isFavorite);
	}

	// Delete SVG
	function deleteSvg(svgId: string) {
		generatedSvgs = generatedSvgs.filter(svg => svg.id !== svgId);
		if (currentSvg?.id === svgId) {
			currentSvg = null;
		}
		favoriteSvgs = favoriteSvgs.filter(svg => svg.id !== svgId);
	}

	// Copy SVG code to clipboard
	function copySvgCode(svg: string) {
		navigator.clipboard.writeText(svg)
			.then(() => {
				// Could show a toast notification here
				console.log('SVG code copied to clipboard');
			})
			.catch(err => {
				console.error('Failed to copy SVG code:', err);
			});
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

	// Use an existing SVG as the current SVG
	function useSvg(svg: GeneratedSvg) {
		currentSvg = svg;
		svgPrompt = svg.prompt;
		width = svg.metadata.width;
		height = svg.metadata.height;
	}

	// Download SVG file
	function downloadSvg(svg: GeneratedSvg) {
		const blob = new Blob([svg.svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `svg-${svg.id}.svg`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Format date for display
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}
</script>

<svelte:head>
	<title>SVG Generator</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 space-y-8">
	<h1 class="text-3xl font-bold mb-6">SVG Generator</h1>

	<Tabs value={activeTab} onValueChange={(value) => activeTab = value} class="w-full">
		<TabsList class="grid w-full grid-cols-2">
			<TabsTrigger value="generator" class="flex items-center gap-1">
				<FileText class="h-4 w-4 mr-1" />
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
						<Label for="svg-prompt">SVG Description</Label>
						<Textarea
							id="svg-prompt"
							placeholder="Describe the SVG you want to generate..."
							bind:value={svgPrompt}
							disabled={isGenerating}
							rows={5}
						/>
					</div>

					<Accordion type="single" collapsible>
						<AccordionItem value="advanced-options">
							<AccordionTrigger>Advanced Options</AccordionTrigger>
							<AccordionContent>
								<div class="space-y-4 pt-2">
									<div>
										<div class="flex justify-between mb-2">
											<Label for="svg-width">Width: {width}px</Label>
										</div>
										<Slider
											id="svg-width"
											min={200}
											max={1600}
											step={50}
											bind:value={width}
											disabled={isGenerating}
										/>
									</div>

									<div>
										<div class="flex justify-between mb-2">
											<Label for="svg-height">Height: {height}px</Label>
										</div>
										<Slider
											id="svg-height"
											min={200}
											max={1200}
											step={50}
											bind:value={height}
											disabled={isGenerating}
										/>
									</div>

									<div>
										<div class="flex justify-between mb-2">
											<Label for="temperature">Temperature: {temperature}</Label>
										</div>
										<Slider
											id="temperature"
											min={0.1}
											max={1.0}
											step={0.1}
											bind:value={temperature}
											disabled={isGenerating}
										/>
										<p class="text-xs text-gray-500 mt-1">
											Lower values produce more predictable results, higher values more creative ones
										</p>
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<Button
						onclick={handleGenerateSvg}
						disabled={isGenerating}
						class="w-full"
					>
						{#if isGenerating}
							<span class="animate-spin mr-2">⟳</span> Generating...
						{:else}
							<FileText class="h-4 w-4 mr-2" /> Generate SVG
						{/if}
					</Button>

					{#if error}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-2" role="alert">
							<strong class="font-bold">Error: </strong>
							<span class="block sm:inline">{error}</span>
							{#if error.includes('network') || error.includes('connection') || error.includes('Failed to connect')}
								<div class="text-sm mt-2">
									<p class="font-medium">Tips:</p>
									<ul class="list-disc list-inside">
										<li>Check your internet connection</li>
										<li>Verify that the ANTHROPIC_API_KEY environment variable is set correctly</li>
										<li>Try again in a few minutes</li>
									</ul>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Preview Panel -->
				<div class="p-6 border rounded-lg shadow-sm">
					<h2 class="text-xl font-semibold mb-4">Preview</h2>

					{#if isGenerating}
						<div class="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
							<div class="animate-spin text-2xl mb-2">⟳</div>
							<p>Generating SVG...</p>
						</div>
					{:else if currentSvg}
						<div class="space-y-4">
							<div class="relative border rounded-md p-2 bg-white">
								{@html currentSvg.svg}
								<div class="absolute top-2 right-2 flex space-x-1">
									<button
										class="p-1 bg-white/80 rounded-full hover:bg-white"
										onclick={() => toggleFavorite(currentSvg.id)}
										title={currentSvg.isFavorite ? "Remove from favorites" : "Add to favorites"}
									>
										{#if currentSvg.isFavorite}
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
										onclick={() => copyPrompt(currentSvg.prompt)}
										title="Copy prompt"
									>
										<Copy class="h-4 w-4" />
									</button>
								</div>
								<p class="text-sm">{currentSvg.prompt}</p>

								<div class="flex justify-between text-sm">
									<span>Size: {currentSvg.metadata.width}x{currentSvg.metadata.height}</span>
									<span>Generated: {formatDate(currentSvg.timestamp)}</span>
								</div>

								<div class="flex justify-between text-sm">
									<span>Description: {currentSvg.metadata.description}</span>
								</div>

								<div class="flex justify-between text-sm">
									<span>Elements: {currentSvg.metadata.elements.join(', ')}</span>
								</div>

								<div class="flex space-x-2 mt-4">
									<Button
										variant="outline"
										size="sm"
										onclick={() => copySvgCode(currentSvg.svg)}
										class="flex-1"
									>
										<Copy class="h-4 w-4 mr-2" /> Copy SVG Code
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => downloadSvg(currentSvg)}
										class="flex-1"
									>
										<Download class="h-4 w-4 mr-2" /> Download SVG
									</Button>
								</div>
							</div>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center h-64 border border-dashed rounded-md">
							<FileText class="h-8 w-8 text-gray-400 mb-2" />
							<p class="text-gray-500">No SVG generated yet</p>
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
						<TabsTrigger value="all">All SVGs</TabsTrigger>
						<TabsTrigger value="favorites">Favorites</TabsTrigger>
					</TabsList>

					<TabsContent value="all" class="pt-4">
						{#if generatedSvgs.length === 0}
							<div class="text-center py-8 border border-dashed rounded-md">
								<p class="text-gray-500">No SVGs generated yet</p>
							</div>
						{:else}
							<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{#each generatedSvgs as svg (svg.id)}
									<Card>
										<CardHeader class="p-4 pb-2">
											<CardTitle class="text-sm truncate">{svg.prompt.substring(0, 30)}...</CardTitle>
											<CardDescription class="text-xs">{formatDate(svg.timestamp)}</CardDescription>
										</CardHeader>
										<CardContent class="p-4 pt-0 pb-2">
											<div class="relative aspect-square bg-white p-2 rounded-md flex items-center justify-center">
												{@html svg.svg}
												{#if svg.isFavorite}
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
												onclick={() => useSvg(svg)}
												title="Use this SVG"
											>
												Use
											</Button>
											<div class="flex space-x-1">
												<Button
													variant="ghost"
													size="icon"
													onclick={() => toggleFavorite(svg.id)}
													title={svg.isFavorite ? "Remove from favorites" : "Add to favorites"}
												>
													{#if svg.isFavorite}
														<Star class="h-4 w-4 text-yellow-500" />
													{:else}
														<StarOff class="h-4 w-4" />
													{/if}
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onclick={() => downloadSvg(svg)}
													title="Download SVG"
												>
													<Download class="h-4 w-4 text-blue-500" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onclick={() => deleteSvg(svg.id)}
													title="Delete SVG"
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
						{#if favoriteSvgs.length === 0}
							<div class="text-center py-8 border border-dashed rounded-md">
								<p class="text-gray-500">No favorite SVGs yet</p>
								<p class="text-sm text-gray-400">Star SVGs to add them to favorites</p>
							</div>
						{:else}
							<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{#each favoriteSvgs as svg (svg.id)}
									<Card>
										<CardHeader class="p-4 pb-2">
											<CardTitle class="text-sm truncate">{svg.prompt.substring(0, 30)}...</CardTitle>
											<CardDescription class="text-xs">{formatDate(svg.timestamp)}</CardDescription>
										</CardHeader>
										<CardContent class="p-4 pt-0 pb-2">
											<div class="relative aspect-square bg-white p-2 rounded-md flex items-center justify-center">
												{@html svg.svg}
												<div class="absolute top-1 right-1">
													<Star class="h-4 w-4 text-yellow-500" />
												</div>
											</div>
										</CardContent>
										<CardFooter class="p-4 pt-2 flex justify-between">
											<Button
												variant="outline"
												size="sm"
												onclick={() => useSvg(svg)}
												title="Use this SVG"
											>
												Use
											</Button>
											<div class="flex space-x-1">
												<Button
													variant="ghost"
													size="icon"
													onclick={() => toggleFavorite(svg.id)}
													title="Remove from favorites"
												>
													<Star class="h-4 w-4 text-yellow-500" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onclick={() => downloadSvg(svg)}
													title="Download SVG"
												>
													<Download class="h-4 w-4 text-blue-500" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onclick={() => deleteSvg(svg.id)}
													title="Delete SVG"
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

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Sparkles, Music, Play, Beaker, Image, FileText } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Test Pages</title>
</svelte:head>

<div class="container mx-auto p-4 md:p-8 space-y-8">
	<h1 class="text-3xl font-bold mb-6">Test Pages</h1>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<!-- AI Features Test -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Sparkles class="h-5 w-5" />
					AI Features Test
				</CardTitle>
				<CardDescription>Test basic AI features like image and narration generation</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Simple interface to test the basic AI generation capabilities including:</p>
				<ul class="list-disc list-inside mt-2 space-y-1">
					<li>Basic image generation</li>
					<li>Narration text-to-speech</li>
				</ul>
			</CardContent>
			<CardFooter>
				<Button asChild>
					<a href="/test/ai-features">Open AI Features Test</a>
				</Button>
			</CardFooter>
		</Card>

		<!-- Advanced Image Generator -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Image class="h-5 w-5" />
					Advanced Image Generator
				</CardTitle>
				<CardDescription>Test advanced image generation with history and favorites</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Comprehensive image generation testing tool with:</p>
				<ul class="list-disc list-inside mt-2 space-y-1">
					<li>Advanced generation options</li>
					<li>History of generated images</li>
					<li>Favorites system</li>
					<li>Multiple aspect ratios</li>
				</ul>
			</CardContent>
			<CardFooter>
				<Button asChild>
					<a href="/test/image-generator">Open Image Generator</a>
				</Button>
			</CardFooter>
		</Card>

		<!-- Scene Player Test -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Play class="h-5 w-5" />
					Scene Player Test
				</CardTitle>
				<CardDescription>Test the scene player component</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Test the scene player functionality by:</p>
				<ul class="list-disc list-inside mt-2 space-y-1">
					<li>Loading scenes by ID</li>
					<li>Testing playback controls</li>
					<li>Debugging scene rendering</li>
				</ul>
			</CardContent>
			<CardFooter>
				<Button asChild>
					<a href="/test/scene-player">Open Scene Player Test</a>
				</Button>
			</CardFooter>
		</Card>

		<!-- Audio Player Test -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Music class="h-5 w-5" />
					Audio Player Test
				</CardTitle>
				<CardDescription>Test audio playback functionality</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Simple interface to test audio playback:</p>
				<ul class="list-disc list-inside mt-2 space-y-1">
					<li>Load audio by URL</li>
					<li>Test playback controls</li>
					<li>Verify audio loading</li>
				</ul>
			</CardContent>
			<CardFooter>
				<Button asChild>
					<a href="/test/audio-player">Open Audio Player Test</a>
				</Button>
			</CardFooter>
		</Card>

		<!-- SVG Generator -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<FileText class="h-5 w-5" />
					SVG Generator
				</CardTitle>
				<CardDescription>Generate SVG images using Claude AI</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Create vector graphics with AI:</p>
				<ul class="list-disc list-inside mt-2 space-y-1">
					<li>Generate SVGs from text prompts</li>
					<li>Customize dimensions and settings</li>
					<li>Save and download SVG files</li>
					<li>Manage a library of generated SVGs</li>
				</ul>
			</CardContent>
			<CardFooter>
				<Button asChild>
					<a href="/test/svg-generator">Open SVG Generator</a>
				</Button>
			</CardFooter>
		</Card>
	</div>
</div>

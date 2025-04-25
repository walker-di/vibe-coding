<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types'; // Import layout data type
	import type { Snippet } from 'svelte'; // Import Snippet type
	import { browser } from '$app/environment';

	let { children, data } = $props<{ data: LayoutData; children: Snippet }>(); // Receive data prop

	// Add ONNX runtime script in browser environment
	if (browser) {
		// Add script tag for ONNX runtime from CDN
		const script = document.createElement('script');
		script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';
		script.async = true;
		document.head.appendChild(script);
	}
</script>

<svelte:head>
	<!-- Preload ONNX WASM files -->
	<link rel="preload" href="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm.wasm" as="fetch" crossorigin="anonymous">
	<link rel="preload" href="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd.wasm" as="fetch" crossorigin="anonymous">
</svelte:head>

<header>
	<nav>
		<a href="/">Home</a>
		{#if data.user}
			<a href="/eots">My EOTs</a>
			<a href="/art/generate">Generate Art</a>
			<a href="/nfts">My NFTs</a> <!-- Add link to NFT Management page -->
			<span style="margin-left: auto;">Welcome, {data.user.email}!</span> <!-- Move welcome message -->
			<!-- Logout Form -->
			<form method="POST" action="/logout" style="display: inline; margin-left: 1rem;">
				<button type="submit">Logout</button>
			</form>
		{:else}
			<a href="/login">Login</a>
			<a href="/register">Register</a>
		{/if}
	</nav>
</header>

<main>
	{@render children()}
</main> <!-- Close the main tag -->

<style>
	header {
		padding: 1rem;
		background-color: #f0f0f0;
		border-bottom: 1px solid #ccc;
	}
	nav {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	main {
		padding: 1rem;
	}
</style>

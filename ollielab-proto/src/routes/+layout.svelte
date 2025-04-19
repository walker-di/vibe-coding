<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types'; // Import layout data type
	import type { Snippet } from 'svelte'; // Import Snippet type

	let { children, data } = $props<{ data: LayoutData; children: Snippet }>(); // Receive data prop
</script>

<header>
	<nav>
		<a href="/">Home</a>
		{#if data.user}
			<span>Welcome, {data.user.email}!</span>
			<!-- Logout Form -->
			<form method="POST" action="/logout" style="display: inline;">
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

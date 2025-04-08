<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, AlertCircle, Trash2, Edit, User } from 'lucide-svelte';
	import type { personas as personasTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	type Persona = InferSelectModel<typeof personasTable>;

	// --- State ---
	let persona = $state<Persona | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isDeleting = $state(false);

	// --- Data Fetching ---
	$effect(() => {
		const personaId = $page.params.id;

		async function fetchPersona() {
			isLoading = true;
			error = null;
			persona = null;

			if (!personaId || isNaN(parseInt(personaId, 10))) {
				error = 'Invalid Persona ID';
				isLoading = false;
				return;
			}

			try {
				const response = await fetch(`/api/personas/${personaId}`);
				if (response.status === 404) {
					throw new Error('Persona not found');
				}
				if (!response.ok) {
					const errResult = await response.json().catch(() => ({}));
					throw new Error(errResult.message || `HTTP error! status: ${response.status}`);
				}
				const data: Persona = await response.json();
				persona = data;
			} catch (e: any) {
				console.error('Failed to fetch persona:', e);
				error = e.message || 'Failed to load persona details.';
			} finally {
				isLoading = false;
			}
		}

		fetchPersona();
	});

	// --- Delete Logic ---
	async function handleDelete() {
		if (!persona || isDeleting) return;

		if (!confirm(`Are you sure you want to delete the persona "${persona.name}"? This cannot be undone.`)) {
			return;
		}

		isDeleting = true;
		error = null;

		try {
			const response = await fetch(`/api/personas/${persona.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errResult = await response.json().catch(() => ({}));
				throw new Error(errResult.message || `Failed to delete persona. Status: ${response.status}`);
			}

			await goto('/personas'); // Navigate back to the list

		} catch (e: any) {
			console.error('Failed to delete persona:', e);
			error = e.message || 'Failed to delete persona.';
		} finally {
			isDeleting = false;
		}
	}

	// --- Helpers ---
	function displayAgeRange(selection: string | null | undefined, custom: string | null | undefined): string {
		if (selection === 'Custom' && custom) {
			return custom;
		}
		return selection || 'Unspecified';
	}

	function formatText(text: string | null | undefined): string {
		// Display dash for empty fields, preserve line breaks for textareas
		if (!text) return '-';
		return text;
	}

</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6">
		<Button href="/personas" variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Personas
		</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading persona details...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Persona</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/personas" variant="outline">Go Back</Button>
		</div>
	{:else if persona}
		<div class="rounded border p-6 shadow">
			<div class="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center">
				{#if persona.imageUrl}
					<img
						src={persona.imageUrl}
						alt={persona.name}
						class="h-32 w-32 flex-shrink-0 rounded-full border object-cover"
					/>
				{:else}
					<div class="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full border bg-gray-200 text-gray-500">
						<User class="h-16 w-16" />
					</div>
				{/if}
				<div class="flex-grow">
					<h1 class="text-3xl font-bold">{persona.name}</h1>
					{#if persona.personaTitle}
						<p class="text-lg text-muted-foreground">{persona.personaTitle}</p>
					{/if}
					{#if persona.isGenerated}
						<span class="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
							AI Generated
						</span>
					{/if}
				</div>
				<div class="flex flex-shrink-0 gap-2 self-start md:self-center">
					<Button variant="outline" href={`/personas/${persona.id}/edit`}> <!-- Removed disabled -->
						<Edit class="mr-2 h-4 w-4" />
						Edit
					</Button>
					<Button variant="destructive" onclick={handleDelete} disabled={isDeleting}>
						{#if isDeleting}
							Deleting...
						{:else}
							<Trash2 class="mr-2 h-4 w-4" />
							Delete
						{/if}
					</Button>
				</div>
			</div>

			<!-- Details Grid -->
			<div class="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t pt-6 md:grid-cols-2">
				<!-- Demographics -->
				<div class="space-y-3">
					<h3 class="text-lg font-semibold">Demographics</h3>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Age Range</dt>
						<dd class="mt-1 text-base">{displayAgeRange(persona.ageRangeSelection, persona.ageRangeCustom)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Gender</dt>
						<dd class="mt-1 text-base">{formatText(persona.gender)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Location</dt>
						<dd class="mt-1 text-base">{formatText(persona.location)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Job Title</dt>
						<dd class="mt-1 text-base">{formatText(persona.jobTitle)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Income Level</dt>
						<dd class="mt-1 text-base">{formatText(persona.incomeLevel)}</dd>
					</div>
				</div>

				<!-- Psychographics -->
				<div class="space-y-3">
					<h3 class="text-lg font-semibold">Psychographics</h3>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Personality Traits</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.personalityTraits)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Values</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.valuesText)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Spending Habits</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.spendingHabits)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Interests & Hobbies</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.interestsHobbies)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Lifestyle (Holiday Spending)</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.lifestyle)}</dd>
					</div>
				</div>

				<!-- Needs & Goals -->
				<div class="space-y-3 md:col-span-2">
					<h3 class="text-lg font-semibold">Needs & Goals</h3>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Needs & Pain Points</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.needsPainPoints)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Goals & Expectations for Solution</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.goalsExpectations)}</dd>
					</div>
				</div>

				<!-- Story & Behavior -->
				<div class="space-y-3 md:col-span-2">
					<h3 class="text-lg font-semibold">Story & Behavior</h3>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Backstory</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.backstory)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Purchase Process</dt>
						<dd class="mt-1 text-base whitespace-pre-wrap">{formatText(persona.purchaseProcess)}</dd>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Fallback if not loading and no error, but persona is null -->
		<div class="rounded border border-dashed p-12 text-center">
			<h2 class="text-xl font-semibold">Persona Not Found</h2>
			<p class="text-muted-foreground">The requested persona could not be found.</p>
		</div>
	{/if}
</div>

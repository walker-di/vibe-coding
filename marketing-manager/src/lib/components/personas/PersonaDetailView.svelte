<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { User, FileText, Image, Video, Link as LinkIcon } from 'lucide-svelte';
	import type { personas as personasTable, creatives as creativesTable } from '$lib/server/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	type Persona = InferSelectModel<typeof personasTable>;
	type CreativeListItem = {
		id: number;
		name: string;
		type: typeof creativesTable.$inferSelect.type;
		description: string | null;
	};

	// --- Props ---
	let {
		persona,
		associatedCreatives = [], // Default to empty array
		creativesLoading = false, // Default to false
		creativesError = null, // Default to null
		productId = null, // Default to null
		personaId = null, // Default to null
		showCreativesSection = true // Default to true
	} = $props<{
		persona: Persona;
		associatedCreatives?: CreativeListItem[];
		creativesLoading?: boolean;
		creativesError?: string | null;
		productId?: number | null;
		personaId?: number | null;
		showCreativesSection?: boolean;
	}>();

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

<!-- Persona Header -->
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
	<!-- Action buttons (Edit/Delete) are kept in the parent page -->
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

<!-- Section for Associated Creatives (Conditional) -->
{#if showCreativesSection}
	<div class="mt-8 pt-6 border-t">
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-2xl font-semibold">Associated Creatives</h2>
			{#if productId && personaId}
				<!-- Create button kept in parent page -->
			{/if}
		</div>

		{#if creativesLoading}
			<p>Loading creatives...</p>
		{:else if creativesError}
			<p class="text-red-500">Error loading creatives: {creativesError}</p>
		{:else if associatedCreatives.length === 0}
			<p class="text-gray-500 italic">No creatives associated with this persona yet.</p>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each associatedCreatives as creative (creative.id)}
					<div class="border rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col justify-between">
						<div>
							<div class="flex items-center mb-2">
								{#if creative.type === 'text'}
									<FileText class="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" />
								{:else if creative.type === 'image'}
									<Image class="w-5 h-5 mr-2 text-green-600 flex-shrink-0" />
								{:else if creative.type === 'video'}
									<Video class="w-5 h-5 mr-2 text-purple-600 flex-shrink-0" />
								{:else if creative.type === 'lp'}
									<LinkIcon class="w-5 h-5 mr-2 text-orange-600 flex-shrink-0" />
								{/if}
								<h3 class="text-lg font-semibold leading-tight truncate" title={creative.name}>{creative.name}</h3>
							</div>
							{#if creative.description}
								<p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{creative.description}</p>
							{/if}
						</div>
						<div class="flex justify-end mt-2">
							{#if productId && personaId}
								<Button
									href={`/products/${productId}/personas/${personaId}/creatives/${creative.id}`}
									variant="outline"
									class="text-sm px-3 py-1"
								>
									View Details
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

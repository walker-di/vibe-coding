<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		personas as personasTable,
		ageRanges,
		genders,
		type campaignStatuses
	} from '$lib/server/db/schema';
	import { ArrowLeft, AlertCircle, User } from 'lucide-svelte';
	import type { InferSelectModel } from 'drizzle-orm';

	type Persona = InferSelectModel<typeof personasTable>;

	// --- State ---
	let personaId: number | null = null;

	// Form field states - initialize empty, populate after fetch
	let name = $state('');
	let personaTitle = $state('');
	let imageUrl = $state('');
	let ageRangeSelection = $state<typeof ageRanges[number] | ''>('');
	let ageRangeCustom = $state('');
	let gender = $state<typeof genders[number] | ''>('');
	let location = $state('');
	let jobTitle = $state('');
	let incomeLevel = $state('');
	let personalityTraits = $state('');
	let valuesText = $state('');
	let spendingHabits = $state('');
	let interestsHobbies = $state('');
	let lifestyle = $state('');
	let needsPainPoints = $state('');
	let goalsExpectations = $state('');
	let backstory = $state('');
	let purchaseProcess = $state('');
	let isGenerated = $state(false); // Keep track if it was AI generated

	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null); // For fetch errors
	let formErrors = $state<Record<string, string | undefined>>({}); // For submission errors

	// Filter genders for UI display
	const gendersList = genders.filter(g => g !== 'Unspecified');

	// --- Data Fetching ---
	$effect(() => {
		const idParam = $page.params.id;
		personaId = parseInt(idParam, 10);

		async function fetchPersonaData() {
			isLoading = true;
			error = null;
			formErrors = {};

			if (isNaN(personaId!)) {
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

				// Initialize form state
				name = data.name;
				personaTitle = data.personaTitle ?? '';
				imageUrl = data.imageUrl ?? '';
				ageRangeSelection = data.ageRangeSelection ?? '';
				ageRangeCustom = data.ageRangeCustom ?? '';
				gender = data.gender ?? '';
				location = data.location ?? '';
				jobTitle = data.jobTitle ?? '';
				incomeLevel = data.incomeLevel ?? '';
				personalityTraits = data.personalityTraits ?? '';
				valuesText = data.valuesText ?? '';
				spendingHabits = data.spendingHabits ?? '';
				interestsHobbies = data.interestsHobbies ?? '';
				lifestyle = data.lifestyle ?? '';
				needsPainPoints = data.needsPainPoints ?? '';
				goalsExpectations = data.goalsExpectations ?? '';
				backstory = data.backstory ?? '';
				purchaseProcess = data.purchaseProcess ?? '';
				isGenerated = data.isGenerated ?? false;

			} catch (e: any) {
				console.error('Failed to fetch persona data:', e);
				error = e.message || 'Failed to load persona data.';
			} finally {
				isLoading = false;
			}
		}

		fetchPersonaData();
	});

	// --- Form Submission ---
	async function handleSubmit() {
		if (!personaId) return;

		isSubmitting = true;
		formErrors = {};
		error = null;

		// Construct payload carefully, handling nulls/empty strings
		const payload: Record<string, any> = {
			name: name,
			personaTitle: personaTitle || null,
			imageUrl: imageUrl || null,
			ageRangeSelection: ageRangeSelection || 'Unspecified',
			ageRangeCustom: ageRangeSelection === 'Custom' ? ageRangeCustom || null : null, // Only send if 'Custom' is selected
			gender: gender || 'Unspecified',
			location: location || null,
			jobTitle: jobTitle || null,
			incomeLevel: incomeLevel || null,
			personalityTraits: personalityTraits || null,
			valuesText: valuesText || null,
			spendingHabits: spendingHabits || null,
			interestsHobbies: interestsHobbies || null,
			lifestyle: lifestyle || null,
			needsPainPoints: needsPainPoints || null,
			goalsExpectations: goalsExpectations || null,
			backstory: backstory || null,
			purchaseProcess: purchaseProcess || null,
			isGenerated: isGenerated
		};

		// Remove unchanged fields to optimize update? (Optional, API handles partial updates)

		try {
			const response = await fetch(`/api/personas/${personaId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 400 && result.errors) {
					const apiErrors: Record<string, string[]> = result.errors;
					let clientErrors: Record<string, string | undefined> = {};
					for (const key in apiErrors) {
						clientErrors[key] = apiErrors[key].join(', ');
					}
					formErrors = clientErrors;
				} else {
					formErrors = { server: result.message || 'An unknown server error occurred during update.' };
				}
				return;
			}

			// Success! Navigate back to the detail page
			await goto(`/personas/${personaId}`);

		} catch (e: any) {
			console.error('Form submission error:', e);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			isSubmitting = false;
		}
	}

	// Reactive derived state for showing/hiding custom age input
	let showCustomAgeInput = $derived(ageRangeSelection === 'Custom');

</script>

<div class="container mx-auto max-w-3xl py-8">
	<div class="mb-6">
		<Button href={`/personas/${personaId ?? ''}`} variant="outline">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Persona
		</Button>
	</div>

	<h1 class="mb-6 text-2xl font-bold">Edit Persona</h1>

	{#if isLoading}
		<div class="flex justify-center p-12">
			<p>Loading persona data...</p>
			<!-- TODO: Add spinner -->
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center rounded border border-dashed border-red-500 bg-red-50 p-12 text-center text-red-700">
			<AlertCircle class="mb-2 h-8 w-8" />
			<h3 class="text-xl font-semibold">Error Loading Data</h3>
			<p class="mb-4 text-sm">{error}</p>
			<Button href="/personas" variant="outline">Go To Personas List</Button>
		</div>
	{:else}
		{#if formErrors.server}
			<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
				<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
				<span>{formErrors.server}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-8">
			<!-- Section 1: Basic Info & Image -->
			<section class="space-y-4 rounded border p-4">
				<h2 class="text-lg font-semibold">Basic Information</h2>
				<div>
					<Label for="name" class={formErrors.name ? 'text-red-600' : ''}>Persona Name *</Label>
					<Input id="name" name="name" type="text" required maxlength={100} bind:value={name} disabled={isSubmitting} class={formErrors.name ? 'border-red-500' : ''} />
					{#if formErrors.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
				</div>
				<div>
					<Label for="personaTitle" class={formErrors.personaTitle ? 'text-red-600' : ''}>Persona Title (e.g., "Tech-Savvy Early Adopter")</Label>
					<Input id="personaTitle" name="personaTitle" type="text" maxlength={150} bind:value={personaTitle} disabled={isSubmitting} class={formErrors.personaTitle ? 'border-red-500' : ''} />
					{#if formErrors.personaTitle}<p class="mt-1 text-sm text-red-600">{formErrors.personaTitle}</p>{/if}
				</div>
				<div>
					<Label for="imageUrl" class={formErrors.imageUrl ? 'text-red-600' : ''}>Image URL (Optional)</Label>
					<Input id="imageUrl" name="imageUrl" type="url" bind:value={imageUrl} disabled={isSubmitting} class={formErrors.imageUrl ? 'border-red-500' : ''} placeholder="https://..." />
					{#if formErrors.imageUrl}<p class="mt-1 text-sm text-red-600">{formErrors.imageUrl}</p>{/if}
					{#if imageUrl}
						<img src={imageUrl} alt="Preview" class="mt-2 h-24 w-24 rounded-full border object-cover" />
					{:else}
						<div class="mt-2 flex h-24 w-24 items-center justify-center rounded-full border bg-gray-100 text-gray-400">
							<User class="h-12 w-12" />
						</div>
					{/if}
				</div>
			</section>

			<!-- Section 2: Demographics -->
			<section class="space-y-4 rounded border p-4">
				<h2 class="text-lg font-semibold">Demographics</h2>
				<div>
					<Label class={formErrors.ageRangeSelection || formErrors.ageRangeCustom ? 'text-red-600' : ''}>Age Range</Label>
					<div class="mt-1 space-y-2">
						{#each ageRanges as range}
							<label class="flex items-center">
								<input type="radio" name="ageRangeSelection" value={range} bind:group={ageRangeSelection} disabled={isSubmitting} class="mr-2" />
								{range}
							</label>
						{/each}
						{#if showCustomAgeInput}
							<Input type="text" name="ageRangeCustom" bind:value={ageRangeCustom} disabled={isSubmitting} placeholder="e.g., 25-34" maxlength={50} class={`ml-6 ${formErrors.ageRangeCustom ? 'border-red-500' : ''}`} />
						{/if}
					</div>
					{#if formErrors.ageRangeSelection}<p class="mt-1 text-sm text-red-600">{formErrors.ageRangeSelection}</p>{/if}
					{#if formErrors.ageRangeCustom}<p class="mt-1 text-sm text-red-600">{formErrors.ageRangeCustom}</p>{/if}
				</div>
				<div>
				<Label class={formErrors.gender ? 'text-red-600' : ''}>Gender</Label>
				<div class="mt-1 space-x-4">
					{#each gendersList as genderOption}
						<label class="inline-flex items-center">
							<input type="radio" name="gender" value={genderOption} bind:group={gender} disabled={isSubmitting} class="mr-1" />
							{genderOption}
							</label>
						{/each}
					</div>
					{#if formErrors.gender}<p class="mt-1 text-sm text-red-600">{formErrors.gender}</p>{/if}
				</div>
				<div>
					<Label for="location" class={formErrors.location ? 'text-red-600' : ''}>Location (Optional)</Label>
					<Input id="location" name="location" type="text" maxlength={100} bind:value={location} disabled={isSubmitting} class={formErrors.location ? 'border-red-500' : ''} />
					{#if formErrors.location}<p class="mt-1 text-sm text-red-600">{formErrors.location}</p>{/if}
				</div>
				<div>
					<Label for="jobTitle" class={formErrors.jobTitle ? 'text-red-600' : ''}>Job Title (Optional)</Label>
					<Input id="jobTitle" name="jobTitle" type="text" maxlength={100} bind:value={jobTitle} disabled={isSubmitting} class={formErrors.jobTitle ? 'border-red-500' : ''} />
					{#if formErrors.jobTitle}<p class="mt-1 text-sm text-red-600">{formErrors.jobTitle}</p>{/if}
				</div>
				<div>
					<Label for="incomeLevel" class={formErrors.incomeLevel ? 'text-red-600' : ''}>Income Level (Optional)</Label>
					<Input id="incomeLevel" name="incomeLevel" type="text" maxlength={100} bind:value={incomeLevel} disabled={isSubmitting} class={formErrors.incomeLevel ? 'border-red-500' : ''} />
					{#if formErrors.incomeLevel}<p class="mt-1 text-sm text-red-600">{formErrors.incomeLevel}</p>{/if}
				</div>
			</section>

			<!-- Section 3: Psychographics -->
			<section class="space-y-4 rounded border p-4">
				<h2 class="text-lg font-semibold">Psychographics</h2>
				<div>
					<Label for="personalityTraits" class={formErrors.personalityTraits ? 'text-red-600' : ''}>Personality Traits (Optional)</Label>
					<Textarea id="personalityTraits" name="personalityTraits" rows={3} bind:value={personalityTraits} disabled={isSubmitting} class={formErrors.personalityTraits ? 'border-red-500' : ''} />
					{#if formErrors.personalityTraits}<p class="mt-1 text-sm text-red-600">{formErrors.personalityTraits}</p>{/if}
				</div>
				<div>
					<Label for="valuesText" class={formErrors.valuesText ? 'text-red-600' : ''}>Values (Optional)</Label>
					<Textarea id="valuesText" name="valuesText" rows={3} bind:value={valuesText} disabled={isSubmitting} class={formErrors.valuesText ? 'border-red-500' : ''} />
					{#if formErrors.valuesText}<p class="mt-1 text-sm text-red-600">{formErrors.valuesText}</p>{/if}
				</div>
				<div>
					<Label for="spendingHabits" class={formErrors.spendingHabits ? 'text-red-600' : ''}>Spending Habits (Optional)</Label>
					<Textarea id="spendingHabits" name="spendingHabits" rows={3} bind:value={spendingHabits} disabled={isSubmitting} class={formErrors.spendingHabits ? 'border-red-500' : ''} />
					{#if formErrors.spendingHabits}<p class="mt-1 text-sm text-red-600">{formErrors.spendingHabits}</p>{/if}
				</div>
				<div>
					<Label for="interestsHobbies" class={formErrors.interestsHobbies ? 'text-red-600' : ''}>Interests & Hobbies (Optional)</Label>
					<Textarea id="interestsHobbies" name="interestsHobbies" rows={3} bind:value={interestsHobbies} disabled={isSubmitting} class={formErrors.interestsHobbies ? 'border-red-500' : ''} />
					{#if formErrors.interestsHobbies}<p class="mt-1 text-sm text-red-600">{formErrors.interestsHobbies}</p>{/if}
				</div>
				<div>
					<Label for="lifestyle" class={formErrors.lifestyle ? 'text-red-600' : ''}>Lifestyle (Holiday Spending) (Optional)</Label>
					<Textarea id="lifestyle" name="lifestyle" rows={3} bind:value={lifestyle} disabled={isSubmitting} class={formErrors.lifestyle ? 'border-red-500' : ''} />
					{#if formErrors.lifestyle}<p class="mt-1 text-sm text-red-600">{formErrors.lifestyle}</p>{/if}
				</div>
			</section>

			<!-- Section 4: Needs & Goals -->
			<section class="space-y-4 rounded border p-4">
				<h2 class="text-lg font-semibold">Needs & Goals</h2>
				<div>
					<Label for="needsPainPoints" class={formErrors.needsPainPoints ? 'text-red-600' : ''}>Needs & Pain Points (Optional)</Label>
					<Textarea id="needsPainPoints" name="needsPainPoints" rows={4} bind:value={needsPainPoints} disabled={isSubmitting} class={formErrors.needsPainPoints ? 'border-red-500' : ''} />
					{#if formErrors.needsPainPoints}<p class="mt-1 text-sm text-red-600">{formErrors.needsPainPoints}</p>{/if}
				</div>
				<div>
					<Label for="goalsExpectations" class={formErrors.goalsExpectations ? 'text-red-600' : ''}>Goals & Expectations for Solution (Optional)</Label>
					<Textarea id="goalsExpectations" name="goalsExpectations" rows={4} bind:value={goalsExpectations} disabled={isSubmitting} class={formErrors.goalsExpectations ? 'border-red-500' : ''} />
					{#if formErrors.goalsExpectations}<p class="mt-1 text-sm text-red-600">{formErrors.goalsExpectations}</p>{/if}
				</div>
			</section>

			<!-- Section 5: Story & Behavior -->
			<section class="space-y-4 rounded border p-4">
				<h2 class="text-lg font-semibold">Story & Behavior</h2>
				<div>
					<Label for="backstory" class={formErrors.backstory ? 'text-red-600' : ''}>Backstory (Optional)</Label>
					<Textarea id="backstory" name="backstory" rows={4} bind:value={backstory} disabled={isSubmitting} class={formErrors.backstory ? 'border-red-500' : ''} />
					{#if formErrors.backstory}<p class="mt-1 text-sm text-red-600">{formErrors.backstory}</p>{/if}
				</div>
				<div>
					<Label for="purchaseProcess" class={formErrors.purchaseProcess ? 'text-red-600' : ''}>Purchase Process (Optional)</Label>
					<Textarea id="purchaseProcess" name="purchaseProcess" rows={4} bind:value={purchaseProcess} disabled={isSubmitting} class={formErrors.purchaseProcess ? 'border-red-500' : ''} />
					{#if formErrors.purchaseProcess}<p class="mt-1 text-sm text-red-600">{formErrors.purchaseProcess}</p>{/if}
				</div>
			</section>

			<!-- Actions -->
			<div class="flex justify-end gap-2 pt-4">
				<Button href={`/personas/${personaId ?? ''}`} variant="outline">Cancel</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						Saving...
						<!-- TODO: Add spinner icon -->
					{:else}
						Save Changes
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>

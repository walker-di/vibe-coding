<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ageRanges, genders } from '$lib/components/constants'; // Import constants
	import { AlertCircle, User, Sparkles } from 'lucide-svelte'; // Added Sparkles

	// Filter genders for UI display (keep Unspecified out of radio buttons)
	const gendersList = genders.filter(g => g !== 'Unspecified');

	// --- State for form inputs ---
	let name = $state('');
	let personaTitle = $state('');
	let imageUrl = $state('');
	let ageRangeSelection = $state<typeof ageRanges[number] | ''>(''); // Use imported type
	let ageRangeCustom = $state('');
	let gender = $state<typeof genders[number] | ''>(''); // Use imported type
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

	let submitting = $state(false);
	let generating = $state(false); // State for AI generation
	let formErrors = $state<Record<string, string | undefined>>({});
	let generationError = $state<string | null>(null); // Separate error state for generation

	// --- AI Generation Logic ---
	async function handleGenerate() {
		generating = true;
		generationError = null;
		formErrors = {}; // Clear form errors too

		// Basic inputs for generation (can be expanded)
		const generationPayload = {
			ageRange: ageRangeSelection || null,
			gender: gender || null
			// Potentially add industry, core need etc. later
		};

		try {
			const response = await fetch('/api/personas/generate', { // Target new endpoint
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(generationPayload)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to generate persona details.');
			}

			// Populate form fields with generated data
			// Use || '' to avoid null/undefined issues with bind:value
			name = result.name || '';
			personaTitle = result.personaTitle || '';
			imageUrl = result.imageUrl || '';
			// Keep user-selected age/gender if they were provided for generation
			// ageRangeSelection = result.ageRangeSelection || '';
			// ageRangeCustom = result.ageRangeCustom || '';
			// gender = result.gender || '';
			location = result.location || '';
			jobTitle = result.jobTitle || '';
			incomeLevel = result.incomeLevel || '';
			personalityTraits = result.personalityTraits || '';
			valuesText = result.valuesText || '';
			spendingHabits = result.spendingHabits || '';
			interestsHobbies = result.interestsHobbies || '';
			lifestyle = result.lifestyle || '';
			needsPainPoints = result.needsPainPoints || '';
			goalsExpectations = result.goalsExpectations || '';
			backstory = result.backstory || '';
			purchaseProcess = result.purchaseProcess || '';
			isGenerated = true; // Mark as generated

		} catch (e: any) {
			console.error('Persona generation error:', e);
			generationError = e.message || 'An error occurred during generation.';
		} finally {
			generating = false;
		}
	}

	// --- Form Submission Logic ---
	async function handleSubmit() {
		submitting = true;
		formErrors = {}; // Clear previous errors

		const payload = {
			name: name,
			personaTitle: personaTitle || null,
			imageUrl: imageUrl || null,
			ageRangeSelection: ageRangeSelection || 'Unspecified',
			ageRangeCustom: ageRangeSelection === 'Custom' ? ageRangeCustom || null : null,
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
			isGenerated: isGenerated // Include the flag
		};

		try {
			const response = await fetch('/api/personas', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
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
					formErrors = { server: result.message || 'An unknown error occurred.' };
				}
				return; // Stop processing on error
			}

			// Success! Navigate to the new persona's detail page
			if (result.id) {
				await goto(`/personas/${result.id}`);
			} else {
				await goto('/personas'); // Fallback
			}

		} catch (error) {
			console.error('Form submission error:', error);
			formErrors = { server: 'Failed to submit form. Please check your connection.' };
		} finally {
			submitting = false;
		}
	}

	// Reactive derived state for showing/hiding custom age input
	let showCustomAgeInput = $derived(ageRangeSelection === 'Custom');

</script>

<div class="container mx-auto max-w-3xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Create New Persona</h1>

	{#if formErrors.server}
		<div class="mb-4 flex items-center rounded border border-red-500 bg-red-50 p-3 text-sm text-red-700">
			<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
			<span>{formErrors.server}</span>
		</div>
	{/if}

		<form onsubmit={handleSubmit} class="space-y-8">
			<!-- AI Generation Button -->
			<div class="rounded border border-blue-200 bg-blue-50 p-4">
				<h3 class="mb-2 text-base font-semibold text-blue-800">AI Assistance</h3>
				<p class="mb-3 text-sm text-blue-700">
					Optionally provide Age Range and Gender below, then click Generate to get AI-suggested details for the rest of the fields. You can edit them before saving.
				</p>
				<Button type="button" onclick={handleGenerate} disabled={generating || submitting} variant="outline">
					<Sparkles class="mr-2 h-4 w-4" />
					{#if generating}
						Generating...
					{:else}
						Generate Persona Details
					{/if}
				</Button>
				{#if generationError}
					<p class="mt-2 text-sm text-red-600">{generationError}</p>
				{/if}
			</div>

			<!-- Section 1: Basic Info & Image -->
			<section class="space-y-4 rounded border p-4">
				<h2 class="text-lg font-semibold">Basic Information</h2>
				<div>
					<Label for="name" class={formErrors.name ? 'text-red-600' : ''}>Persona Name *</Label>
				<Input id="name" name="name" type="text" required maxlength={100} bind:value={name} disabled={submitting} class={formErrors.name ? 'border-red-500' : ''} />
				{#if formErrors.name}<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>{/if}
			</div>
			<div>
				<Label for="personaTitle" class={formErrors.personaTitle ? 'text-red-600' : ''}>Persona Title (e.g., "Tech-Savvy Early Adopter")</Label>
				<Input id="personaTitle" name="personaTitle" type="text" maxlength={150} bind:value={personaTitle} disabled={submitting} class={formErrors.personaTitle ? 'border-red-500' : ''} />
				{#if formErrors.personaTitle}<p class="mt-1 text-sm text-red-600">{formErrors.personaTitle}</p>{/if}
			</div>
			<div>
				<Label for="imageUrl" class={formErrors.imageUrl ? 'text-red-600' : ''}>Image URL (Optional)</Label>
				<Input id="imageUrl" name="imageUrl" type="url" bind:value={imageUrl} disabled={submitting} class={formErrors.imageUrl ? 'border-red-500' : ''} placeholder="https://..." />
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
							<input type="radio" name="ageRangeSelection" value={range} bind:group={ageRangeSelection} disabled={submitting} class="mr-2" />
							{range}
						</label>
					{/each}
					{#if showCustomAgeInput}
						<Input type="text" name="ageRangeCustom" bind:value={ageRangeCustom} disabled={submitting} placeholder="e.g., 25-34" maxlength={50} class={`ml-6 ${formErrors.ageRangeCustom ? 'border-red-500' : ''}`} />
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
							<input type="radio" name="gender" value={genderOption} bind:group={gender} disabled={submitting} class="mr-1" />
							{genderOption}
						</label>
					{/each}
				</div>
				{#if formErrors.gender}<p class="mt-1 text-sm text-red-600">{formErrors.gender}</p>{/if}
			</div>
			<div>
				<Label for="location" class={formErrors.location ? 'text-red-600' : ''}>Location (Optional)</Label>
				<Input id="location" name="location" type="text" maxlength={100} bind:value={location} disabled={submitting} class={formErrors.location ? 'border-red-500' : ''} />
				{#if formErrors.location}<p class="mt-1 text-sm text-red-600">{formErrors.location}</p>{/if}
			</div>
			<div>
				<Label for="jobTitle" class={formErrors.jobTitle ? 'text-red-600' : ''}>Job Title (Optional)</Label>
				<Input id="jobTitle" name="jobTitle" type="text" maxlength={100} bind:value={jobTitle} disabled={submitting} class={formErrors.jobTitle ? 'border-red-500' : ''} />
				{#if formErrors.jobTitle}<p class="mt-1 text-sm text-red-600">{formErrors.jobTitle}</p>{/if}
			</div>
			<div>
				<Label for="incomeLevel" class={formErrors.incomeLevel ? 'text-red-600' : ''}>Income Level (Optional)</Label>
				<Input id="incomeLevel" name="incomeLevel" type="text" maxlength={100} bind:value={incomeLevel} disabled={submitting} class={formErrors.incomeLevel ? 'border-red-500' : ''} />
				{#if formErrors.incomeLevel}<p class="mt-1 text-sm text-red-600">{formErrors.incomeLevel}</p>{/if}
			</div>
		</section>

		<!-- Section 3: Psychographics -->
		<section class="space-y-4 rounded border p-4">
			<h2 class="text-lg font-semibold">Psychographics</h2>
			<div>
				<Label for="personalityTraits" class={formErrors.personalityTraits ? 'text-red-600' : ''}>Personality Traits (Optional)</Label>
				<Textarea id="personalityTraits" name="personalityTraits" rows={3} bind:value={personalityTraits} disabled={submitting} class={formErrors.personalityTraits ? 'border-red-500' : ''} />
				{#if formErrors.personalityTraits}<p class="mt-1 text-sm text-red-600">{formErrors.personalityTraits}</p>{/if}
			</div>
			<div>
				<Label for="valuesText" class={formErrors.valuesText ? 'text-red-600' : ''}>Values (Optional)</Label>
				<Textarea id="valuesText" name="valuesText" rows={3} bind:value={valuesText} disabled={submitting} class={formErrors.valuesText ? 'border-red-500' : ''} />
				{#if formErrors.valuesText}<p class="mt-1 text-sm text-red-600">{formErrors.valuesText}</p>{/if}
			</div>
			<div>
				<Label for="spendingHabits" class={formErrors.spendingHabits ? 'text-red-600' : ''}>Spending Habits (Optional)</Label>
				<Textarea id="spendingHabits" name="spendingHabits" rows={3} bind:value={spendingHabits} disabled={submitting} class={formErrors.spendingHabits ? 'border-red-500' : ''} />
				{#if formErrors.spendingHabits}<p class="mt-1 text-sm text-red-600">{formErrors.spendingHabits}</p>{/if}
			</div>
			<div>
				<Label for="interestsHobbies" class={formErrors.interestsHobbies ? 'text-red-600' : ''}>Interests & Hobbies (Optional)</Label>
				<Textarea id="interestsHobbies" name="interestsHobbies" rows={3} bind:value={interestsHobbies} disabled={submitting} class={formErrors.interestsHobbies ? 'border-red-500' : ''} />
				{#if formErrors.interestsHobbies}<p class="mt-1 text-sm text-red-600">{formErrors.interestsHobbies}</p>{/if}
			</div>
			<div>
				<Label for="lifestyle" class={formErrors.lifestyle ? 'text-red-600' : ''}>Lifestyle (Holiday Spending) (Optional)</Label>
				<Textarea id="lifestyle" name="lifestyle" rows={3} bind:value={lifestyle} disabled={submitting} class={formErrors.lifestyle ? 'border-red-500' : ''} />
				{#if formErrors.lifestyle}<p class="mt-1 text-sm text-red-600">{formErrors.lifestyle}</p>{/if}
			</div>
		</section>

		<!-- Section 4: Needs & Goals -->
		<section class="space-y-4 rounded border p-4">
			<h2 class="text-lg font-semibold">Needs & Goals</h2>
			<div>
				<Label for="needsPainPoints" class={formErrors.needsPainPoints ? 'text-red-600' : ''}>Needs & Pain Points (Optional)</Label>
				<Textarea id="needsPainPoints" name="needsPainPoints" rows={4} bind:value={needsPainPoints} disabled={submitting} class={formErrors.needsPainPoints ? 'border-red-500' : ''} />
				{#if formErrors.needsPainPoints}<p class="mt-1 text-sm text-red-600">{formErrors.needsPainPoints}</p>{/if}
			</div>
			<div>
				<Label for="goalsExpectations" class={formErrors.goalsExpectations ? 'text-red-600' : ''}>Goals & Expectations for Solution (Optional)</Label>
				<Textarea id="goalsExpectations" name="goalsExpectations" rows={4} bind:value={goalsExpectations} disabled={submitting} class={formErrors.goalsExpectations ? 'border-red-500' : ''} />
				{#if formErrors.goalsExpectations}<p class="mt-1 text-sm text-red-600">{formErrors.goalsExpectations}</p>{/if}
			</div>
		</section>

		<!-- Section 5: Story & Behavior -->
		<section class="space-y-4 rounded border p-4">
			<h2 class="text-lg font-semibold">Story & Behavior</h2>
			<div>
				<Label for="backstory" class={formErrors.backstory ? 'text-red-600' : ''}>Backstory (Optional)</Label>
				<Textarea id="backstory" name="backstory" rows={4} bind:value={backstory} disabled={submitting} class={formErrors.backstory ? 'border-red-500' : ''} />
				{#if formErrors.backstory}<p class="mt-1 text-sm text-red-600">{formErrors.backstory}</p>{/if}
			</div>
			<div>
				<Label for="purchaseProcess" class={formErrors.purchaseProcess ? 'text-red-600' : ''}>Purchase Process (Optional)</Label>
				<Textarea id="purchaseProcess" name="purchaseProcess" rows={4} bind:value={purchaseProcess} disabled={submitting} class={formErrors.purchaseProcess ? 'border-red-500' : ''} />
				{#if formErrors.purchaseProcess}<p class="mt-1 text-sm text-red-600">{formErrors.purchaseProcess}</p>{/if}
			</div>
		</section>

		<!-- Actions -->
		<div class="flex justify-end gap-2 pt-4">
			<Button href="/personas" variant="outline">Cancel</Button>
			<Button type="submit" disabled={submitting}>
				{#if submitting}
					Creating...
					<!-- TODO: Add spinner icon -->
				{:else}
					Create Persona
				{/if}
			</Button>
		</div>
	</form>
</div>

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms'; // For progressive enhancement
	
	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// Reactive variables to hold form input values for create form
	let videoUrl = $state(form?.videoUrl ?? ''); // Use $state for reactive variables in runes mode
	let activity = $state(form?.activity ?? '');
	let location = $state(form?.location ?? '');

	
</script>

<h1>My EOTs (Energy of Things)</h1>

<!-- Create EOT Form -->
<h2>Create New EOT</h2>
<form method="POST" action="?/create" use:enhance>
	{#if form?.error && !form?.success}
		<!-- Display general form error -->
		<p style="color: red;">Error: {form.error}</p>
	{/if}
	<div>
		<label for="videoUrl">Video URL:</label>
		<input type="url" id="videoUrl" name="videoUrl" bind:value={videoUrl} required />
	</div>
	<div>
		<label for="activity">Activity (What):</label>
		<input type="text" id="activity" name="activity" bind:value={activity} required />
	</div> <!-- This div was missing its closing tag -->
	<div>
		<label for="location">Location (Where):</label>
		<input type="text" id="location" name="location" bind:value={location} />
	</div>
	<!-- Add inputs for recordedAt, recordedBy if needed -->
	<button type="submit">Create EOT</button>
</form>

<hr style="margin: 2rem 0;" />

<!-- List EOTs -->
<h2>Existing EOTs</h2>
{#if data.eots.length === 0}
	<p>You haven't created any EOTs yet.</p>
{:else}
	<ul style="list-style: none; padding: 0;">
		{#each data.eots as eot (eot.id)}
			<li style="border: 1px solid #ccc; margin-bottom: 1rem; padding: 1rem;">
				<p><strong>Activity:</strong> {eot.activity ?? 'N/A'}</p>
				<p><strong>Location:</strong> {eot.location ?? 'N/A'}</p>
				<p><strong>Video URL:</strong> <a href={eot.videoUrl} target="_blank">{eot.videoUrl}</a></p>
				<p><strong>Created:</strong> {new Date((eot.createdAt ?? 0) * 1000).toLocaleString()}</p>
				{#if eot.recordedAt}
					<p><strong>Recorded:</strong> {new Date(eot.recordedAt * 1000).toLocaleString()}</p>
				{/if}
				<!-- Delete Form -->
				<form method="POST" action="?/delete" use:enhance style="display: inline;">
					<input type="hidden" name="eotId" value={eot.id} />
					<button type="submit" style="color: red; margin-left: 1rem;">Delete</button>
				</form>
				<!-- Add Edit/View buttons later -->
			</li>
		{/each}
	</ul>
{/if}

<style>
	label {
		display: block;
		margin-top: 0.5rem;
	}
	input[type='text'],
	input[type='url'] {
		width: 100%;
		max-width: 400px;
		padding: 0.3rem;
		margin-bottom: 0.5rem;
	}
	button {
		padding: 0.5rem 1rem;
		margin-top: 0.5rem;
		cursor: pointer;
	}
</style>

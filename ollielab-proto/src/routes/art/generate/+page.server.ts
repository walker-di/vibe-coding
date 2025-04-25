import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// Redirect unauthenticated users
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}
	// Could load user's EOTs here if needed for selection later
	return {};
};

export const actions: Actions = {
	generate: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const prompt = formData.get('prompt');
		const style = formData.get('style'); // Optional style field
		// const eotId = formData.get('eotId'); // Optional EOT ID

		if (!prompt || typeof prompt !== 'string') {
			return fail(400, { error: 'Prompt is required', prompt, style });
		}

		try {
			const response = await fetch('/api/art/generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					prompt: prompt,
					style: style // Pass style if collected
					// eotId: eotId // Pass eotId if collected
				})
			});

			const result = await response.json();

			if (!response.ok) {
				// Forward the error from the API endpoint
				return fail(response.status, { error: result.message || 'Failed to start generation', prompt, style });
			}

			// Return the created art record (which includes the ID and pending status)
			return { success: true, generatedArt: result };

		} catch (e) {
			console.error('Error calling generate API:', e);
			return fail(500, { error: 'Internal server error calling API', prompt, style });
		}
	}
};

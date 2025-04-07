import { fail, redirect, type RequestEvent } from '@sveltejs/kit'; // Added RequestEvent
import { z } from 'zod';
// Removed unused superValidate import
import { db } from '$lib/server/db';
import { campaigns } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types'; // These should be generated by sync

// Define schema for validation
const campaignSchema = z.object({
	name: z.string().min(1, 'Campaign name is required').max(100),
	goal: z.string().max(500).optional()
});

// We don't need a load function for the 'new' page usually,
// unless we need to preload data for the form (e.g., dropdown options).
// export const load: PageServerLoad = async () => {
//   return {};
// };

export const actions: Actions = {
	default: async ({ request }: RequestEvent) => { // Added RequestEvent type
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const goal = formData.get('goal') as string | null;

		// Basic server-side validation (can be enhanced with superValidate later)
		const validationResult = campaignSchema.safeParse({ name, goal });

		if (!validationResult.success) {
			const errors = validationResult.error.flatten().fieldErrors;
			console.log('Validation errors:', errors);
			return fail(400, {
				error: 'Validation failed',
				errors: {
					name: errors.name?.[0],
					goal: errors.goal?.[0]
				},
				// Return submitted values to repopulate form (optional)
				name,
				goal
			});
		}

		const data = validationResult.data;

		try {
			console.log('Inserting new campaign:', data);
			const [newCampaign] = await db
				.insert(campaigns)
				.values({
					name: data.name,
					goal: data.goal ?? null // Ensure null if optional and empty
					// createdAt is handled by default in schema
					// updatedAt needs manual handling on updates, not inserts
				})
				.returning({ id: campaigns.id }); // Return the ID of the new campaign

			console.log('New campaign created with ID:', newCampaign.id);

		} catch (error) {
			console.error('Failed to create campaign:', error);
			return fail(500, {
				error: 'Database error: Failed to create campaign.',
				name: data.name,
				goal: data.goal
			});
		}

		// Redirect to the campaign list page after successful creation
		redirect(303, '/campaigns');
	}
};

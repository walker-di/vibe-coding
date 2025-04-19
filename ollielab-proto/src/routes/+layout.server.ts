import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Pass the user data from locals to the page
	return {
		user: locals.user
	};
};

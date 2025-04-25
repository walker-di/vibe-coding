import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session) {
		// Already logged out, or no session found
		redirect(302, '/login');
		// Or return fail(401); if preferred
	}

	// Invalidate the session
	await lucia.invalidateSession(locals.session.id);

	// Create and set a blank session cookie to remove the existing one
	const sessionCookie = lucia.createBlankSessionCookie();
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});

	// Redirect to the login page after logout
	redirect(302, '/login');
};

// Optional: Add a GET handler if you want to allow logout via link,
// but POST is generally preferred for actions that change state.
// export const GET = POST;

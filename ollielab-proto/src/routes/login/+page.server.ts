import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { Argon2id } from 'oslo/password';
import { db } from '$lib/server/db';
import { keyTable, userTable } from '$lib/server/db/schema'; // Import userTable as well
import { eq } from 'drizzle-orm';

import type { Actions, PageServerLoad } from './$types';

// Redirect logged-in users away from the login page
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/'); // Redirect to home or dashboard
	}
	return {};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => { // Add cookies to params
		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		// Basic validation
		if (typeof email !== 'string' || email.length < 3 || !email.includes('@')) {
			return fail(400, { error: 'Invalid email' });
		}
		if (typeof password !== 'string' || password.length < 1) { // Min length 1 for login check
			return fail(400, { error: 'Invalid password' });
		}

		const lowerCaseEmail = email.toLowerCase();
		const keyId = `email:${lowerCaseEmail}`; // Construct the key ID

		try {
			// Find the key associated with the email
			const key = await db.query.keyTable.findFirst({
				where: eq(keyTable.id, keyId)
			});

			if (!key || !key.hashedPassword) {
				// User not found or password not set
				return fail(400, { error: 'Incorrect email or password' });
			}

			// Verify the password
			const validPassword = await new Argon2id().verify(key.hashedPassword, password);
			if (!validPassword) {
				return fail(400, { error: 'Incorrect email or password' });
			}

			// Password is valid, create session
			const session = await lucia.createSession(key.userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);

			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});

		} catch (e) {
			console.error('Login error:', e);
			return fail(500, { error: 'An unexpected error occurred' });
		}

		// Redirect to the homepage after successful login
		redirect(302, '/');
	}
};

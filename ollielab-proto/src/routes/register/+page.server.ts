import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { generateId } from 'lucia';
import { Argon2id } from 'oslo/password'; // Use oslo for password hashing
import { db } from '$lib/server/db';
import { userTable, keyTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

import type { Actions, PageServerLoad } from './$types';

// Redirect logged-in users away from the register page
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/'); // Redirect to home or dashboard
	}
	return {};
};

export const actions: Actions = {
	register: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		// Basic validation
		if (typeof email !== 'string' || email.length < 3 || !email.includes('@')) {
			return fail(400, { error: 'Invalid email' });
		}
		if (typeof password !== 'string' || password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters long' });
		}

		const hashedPassword = await new Argon2id().hash(password);
		const userId = generateId(15); // Generate a user ID

		try {
			// Check if email already exists
			const existingUser = await db.query.userTable.findFirst({
				where: eq(userTable.email, email.toLowerCase()) // Store emails lowercase
			});

			if (existingUser) {
				return fail(400, { error: 'Email already registered' });
			}

			// Create user and key in a transaction
			await db.transaction(async (tx) => {
				await tx.insert(userTable).values({
					id: userId,
					email: email.toLowerCase()
					// Add name here if collected from form
				});
				await tx.insert(keyTable).values({
					id: `email:${email.toLowerCase()}`, // Lucia convention for email/password key
					userId: userId,
					hashedPassword: hashedPassword
				});
			});

			// Create session after successful registration
			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);

			// Use event.cookies.set in hooks or server actions if available,
			// otherwise redirect and let hooks handle it.
			// Here we redirect, the hook will set the cookie.

		} catch (e) {
			console.error('Registration error:', e);
			// Drizzle specific error check for unique constraint could be added here
			if (e instanceof Error && e.message.includes('UNIQUE constraint failed: user.email')) {
				return fail(400, { error: 'Email already registered' });
			}
			return fail(500, { error: 'An unexpected error occurred' });
		}

		// Redirect to login page or directly log them in by setting cookie here
		// Redirecting to login is simpler for now
		redirect(302, '/login'); // Redirect to login page after successful registration
	}
};

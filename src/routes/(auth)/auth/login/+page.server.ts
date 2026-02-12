import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import db from '$lib/server/db';
import { getSetting, verifyTurnstile } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		settings: {
			allow_signup: getSetting('allow_signup', 'true') === 'true',
			enable_turnstile: getSetting('enable_turnstile') === 'true',
			turnstile_site_key: getSetting('turnstile_site_key')
		}
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username');
		const password = formData.get('password');
		const turnstileToken = formData.get('cf-turnstile-response') as string;

		if (getSetting('enable_turnstile') === 'true') {
			const valid = await verifyTurnstile(turnstileToken);
			if (!valid) return fail(400, { message: '認証に失敗しました。' });
		}

		if (typeof username !== 'string' || username.length < 3 || username.length > 31) {
			return fail(400, { message: 'Invalid username' });
		}
		if (typeof password !== 'string' || password.length < 6 || password.length > 255) {
			return fail(400, { message: 'Invalid password' });
		}

		const existingUser = db.prepare('SELECT * FROM user WHERE username = ?').get(username) as any;
		if (!existingUser) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const validPassword = await verify(existingUser.password_hash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		if (!validPassword) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const session = await lucia.createSession(existingUser.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		throw redirect(302, '/');
	}
};

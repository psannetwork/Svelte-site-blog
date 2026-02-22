import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import db from '$lib/server/db';
import { getSettings } from '$lib/server/settings';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	if (
		locals.user.role !== 'admin' &&
		locals.user.role !== 'editor' &&
		locals.user.role !== 'author'
	) {
		throw redirect(302, '/');
	}

	const settings = getSettings();

	return {
		user: locals.user,
		settings
	};
};

import db from '$lib/server/db';
import { getSetting } from '$lib/server/settings';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') throw redirect(302, '/dashboard');

	const anonymousName = getSetting('anonymous_name', 'Anonymous');

	const comments = db
		.prepare(
			`
		SELECT 
			c.*, 
			COALESCE(u.nickname, u.username, ?) as author_name, 
			u.avatar_url,
			p.title as post_title,
			COALESCE(pu.nickname, pu.username) as parent_author_name
		FROM comment c
		LEFT JOIN user u ON c.author_id = u.id 
		JOIN post p ON c.post_id = p.id
		LEFT JOIN comment pc ON c.parent_id = pc.id
		LEFT JOIN user pu ON pc.author_id = pu.id
		ORDER BY c.created_at DESC
	`
		)
		.all(anonymousName) as any[];

	return {
		comments
	};
};

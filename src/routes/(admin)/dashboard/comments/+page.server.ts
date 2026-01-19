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
			comment.*, 
			COALESCE(user.nickname, user.username, ?) as author_name, 
			user.avatar_url,
			post.title as post_title 
		FROM comment 
		LEFT JOIN user ON comment.author_id = user.id 
		JOIN post ON comment.post_id = post.id
		ORDER BY created_at DESC
	`
		)
		.all(anonymousName) as any[];

	return {
		comments
	};
};

import db from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const comments = db
		.prepare(
			`
		SELECT comment.*, user.username, post.title as post_title 
		FROM comment 
		JOIN user ON comment.author_id = user.id 
		JOIN post ON comment.post_id = post.id
		ORDER BY created_at DESC
	`
		)
		.all() as any[];

	return {
		comments
	};
};

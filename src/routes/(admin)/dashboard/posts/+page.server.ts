import db from '$lib/server/db';
import { cleanupPostImages } from '$lib/server/files';
import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const posts = db
		.prepare(
			`
		SELECT post.*, COALESCE(user.nickname, user.username) as author_name 
		FROM post 
		JOIN user ON post.author_id = user.id 
		ORDER BY created_at DESC
	`
		)
		.all() as any[];

	return {
		posts
	};
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor'))
			return fail(403);

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const status = formData.get('status') as string;

		db.prepare('UPDATE post SET visibility = ?, updated_at = ? WHERE id = ?').run(
			status,
			Date.now(),
			id
		);
		return { success: true };
	},
	deletePost: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor'))
			return fail(403);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		const post = db.prepare('SELECT content FROM post WHERE id = ?').get(id) as
			| { content: string }
			| undefined;
		if (post) {
			cleanupPostImages(post.content);
		}

		db.prepare('DELETE FROM post WHERE id = ?').run(id);
		return { success: true };
	}
};

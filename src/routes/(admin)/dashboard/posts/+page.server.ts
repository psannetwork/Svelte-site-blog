import db from '$lib/server/db';
import { cleanupPostImages } from '$lib/server/files';
import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role))
		throw redirect(302, '/auth/login');

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
		if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) return fail(403);

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const status = formData.get('status') as string;

		const post = db.prepare('SELECT author_id, visibility FROM post WHERE id = ?').get(id) as any;
		if (!post) return fail(404);

		if (locals.user.role === 'author') {
			if (post.author_id !== locals.user.id) return fail(403, { message: '自分の記事のみ変更可能です。' });
			if (!['draft', 'review'].includes(status))
				return fail(403, { message: 'Authorは下書きまたはレビュー待ちにのみ変更可能です。' });
		}

		db.prepare('UPDATE post SET visibility = ?, updated_at = ? WHERE id = ?').run(
			status,
			Date.now(),
			id
		);
		return { success: true };
	},
	deletePost: async ({ request, locals }) => {
		if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) return fail(403);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		const post = db.prepare('SELECT author_id, visibility, content FROM post WHERE id = ?').get(id) as any;
		if (!post) return fail(404);

		if (locals.user.role === 'author') {
			if (post.author_id !== locals.user.id) return fail(403, { message: '自分の記事のみ削除可能です。' });
			if (!['draft', 'review'].includes(post.visibility))
				return fail(403, { message: '公開済みの記事は削除できません。' });
		}

		if (post.content) {
			cleanupPostImages(post.content);
		}

		db.prepare('DELETE FROM post WHERE id = ?').run(id);
		return { success: true };
	}
};

import db from '$lib/server/db';
import { error, redirect, fail } from '@sveltejs/kit';
import { editorJsToHtml } from '$lib/server/editor';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) {
		throw redirect(302, '/auth/login');
	}

	const post = db.prepare('SELECT * FROM post WHERE id = ?').get(params.id) as any;

	if (!post) throw error(404, 'Post not found');

	// Role based access control
	if (locals.user.role === 'editor' && post.author_id !== locals.user.id) {
		throw error(403, 'You do not have permission to edit this post');
	}
	
	if (locals.user.role === 'author') {
		if (post.author_id !== locals.user.id) {
			throw error(403, 'You do not have permission to edit this post');
		}
		if (!['draft', 'review'].includes(post.visibility)) {
			throw error(403, '公開済みの記事は編集できません。');
		}
	}

	return {
		post
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user || !['admin', 'editor', 'author'].includes(locals.user.role)) {
			return fail(403);
		}

		const post = db.prepare('SELECT author_id, visibility FROM post WHERE id = ?').get(params.id) as any;
		if (!post) return fail(404);

		if (locals.user.role === 'author') {
			if (post.author_id !== locals.user.id) return fail(403);
			if (!['draft', 'review'].includes(post.visibility)) {
				return fail(403, { message: '公開済みの記事は編集できません。' });
			}
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const summary = formData.get('summary') as string;
		const visibility = formData.get('visibility') as string;
		const editorDataRaw = formData.get('editorData') as string;

		if (!title || !editorDataRaw) {
			return fail(400, { message: 'Title and content are required' });
		}

		let htmlContent = '';
		try {
			const editorData = JSON.parse(editorDataRaw);
			htmlContent = editorJsToHtml(editorData.blocks);
		} catch (e) {
			return fail(400, { message: 'Invalid editor data' });
		}

		db.prepare(
			`
			UPDATE post 
			SET title = ?, summary = ?, content = ?, raw_json = ?, visibility = ?, updated_at = ? 
			WHERE id = ?
		`
		).run(title, summary, htmlContent, editorDataRaw, visibility, Date.now(), params.id);

		throw redirect(302, '/dashboard/posts');
	}
};

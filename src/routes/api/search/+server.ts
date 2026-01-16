import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const query = url.searchParams.get('q') || '';
	if (!query) return json({ posts: [] });

	const user = locals.user;
	let posts;

	try {
		// 権限に応じた検索
		if (user?.role === 'admin' || user?.role === 'editor') {
			posts = db.prepare(`
				SELECT id, title, summary, created_at 
				FROM post 
				WHERE (title LIKE ? OR content LIKE ? OR summary LIKE ?)
				ORDER BY created_at DESC 
				LIMIT 20
			`).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
		} else {
			posts = db.prepare(`
				SELECT id, title, summary, created_at 
				FROM post 
				WHERE visibility = 'public' 
				AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)
				ORDER BY created_at DESC 
				LIMIT 20
			`).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
		}

		return json({ posts });
	} catch (e) {
		console.error('[SEARCH ERROR]', e);
		return json({ posts: [] }, { status: 500 });
	}
};

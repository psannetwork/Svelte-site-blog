import db from '$lib/server/db';
import { getSetting } from '$lib/server/settings';
import { editorJsToHtml } from '$lib/server/editor';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	let posts;

	const homePage = db.prepare("SELECT content, raw_json FROM pages WHERE id = 'home'").get() as any;

	let homeHtml = homePage?.content || '';
	if (homePage?.raw_json) {
		try {
			const parsed = JSON.parse(homePage.raw_json);
			if (parsed && parsed.blocks) homeHtml = editorJsToHtml(parsed.blocks);
		} catch (e) {
			console.error('[HOME LOAD ERROR] JSON parse failed:', e);
		}
	}

	if (user?.role === 'admin' || user?.role === 'editor') {
		posts = db
			.prepare(
				`
			SELECT post.*, COALESCE(user.nickname, user.username) as author_name 
			FROM post 
			JOIN user ON post.author_id = user.id 
			WHERE post.visibility != 'draft'
			ORDER BY created_at DESC
		`
			)
			.all() as any[];
	} else if (user?.role === 'vip') {
		posts = db
			.prepare(
				`
			SELECT post.*, COALESCE(user.nickname, user.username) as author_name 
			FROM post 
			JOIN user ON post.author_id = user.id 
			WHERE post.visibility IN ('public', 'vip')
			ORDER BY created_at DESC
		`
			)
			.all() as any[];
	} else {
		posts = db
			.prepare(
				`
			SELECT post.*, COALESCE(user.nickname, user.username) as author_name 
			FROM post 
			JOIN user ON post.author_id = user.id 
			WHERE post.visibility = 'public'
			ORDER BY created_at DESC
		`
			)
			.all() as any[];
	}

	return {
		posts,
		homeHtml
	};
};

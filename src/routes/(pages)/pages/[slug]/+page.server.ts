import db from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { getSetting } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// pagesテーブルから id (スラグ) で検索
	const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(params.slug) as any;
	
	if (!page) {
		// 互換性のために一応 post テーブルも探す（以前の仕様の場合）
		const post = db.prepare("SELECT * FROM post WHERE id = ? AND visibility = 'public'").get(params.slug) as any;
		if (!post) throw error(404, 'Page not found');
		
		return {
			post,
			pageTitle: post.title
		};
	}

	return {
		post: {
			title: page.title,
			content: page.content,
			raw_json: page.raw_json,
			updated_at: page.updated_at
		},
		pageTitle: page.title
	};
};
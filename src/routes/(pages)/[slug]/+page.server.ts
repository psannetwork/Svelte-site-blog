import db from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { getSetting } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { slug } = params;

	// 静的アセットへのリクエストを除外
	if (slug.includes('.') || slug.includes('_') || slug === 'favicon.svg' || slug === 'robots.txt') {
		throw error(404, 'Not Found');
	}

	// 1. pagesテーブルから検索 (優先)
	const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(slug) as any;
	
	if (page) {
		return {
			post: {
				title: page.title,
				content: page.content,
				raw_json: page.raw_json,
				updated_at: page.updated_at
			},
			pageTitle: page.title,
			comments: [], // 固定ページにはコメント機能なし（必要なら後で実装）
			user: locals.user,
			settings: {
				allow_comments: false,
				enable_turnstile: 'false',
				turnstile_site_key: ''
			}
		};
	}

	// 2. postテーブルから検索 (下位互換性)
	const post = db.prepare("SELECT * FROM post WHERE id = ? AND visibility = 'public'").get(slug) as any;
	
	if (post) {
		const anonymousName = getSetting('anonymous_name', 'Anonymous');
		const comments = db.prepare(`
			SELECT 
				comment.*, 
				COALESCE(user.nickname, user.username, ?) as author_name, 
				user.role as author_role,
				user.avatar_url
			FROM comment
			LEFT JOIN user ON comment.author_id = user.id
			WHERE post_id = ?
			ORDER BY created_at ASC
		`).all(anonymousName, slug) as any[];

		return {
			post,
			pageTitle: post.title,
			comments,
			user: locals.user,
			settings: {
				allow_comments: getSetting('allow_comments', 'true') === 'true',
				allow_anonymous_comments: getSetting('allow_anonymous_comments', 'false') === 'true',
				enable_turnstile: getSetting('enable_turnstile', 'false'),
				turnstile_site_key: getSetting('turnstile_site_key', '')
			}
		};
	}

	// どちらにも見つからない場合は404
	throw error(404, 'Page Not Found');
};

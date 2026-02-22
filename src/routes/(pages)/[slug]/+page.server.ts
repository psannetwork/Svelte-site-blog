import db from '$lib/server/db';
import { error, redirect, fail } from '@sveltejs/kit';
import { getSetting } from '$lib/server/settings';
import type { PageServerLoad, Actions } from './$types';

// HTML エスケープ関数
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { slug } = params;

	// homeへの直接アクセスはルートへリダイレクト
	if (slug === 'home') {
		throw redirect(301, '/');
	}

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
			comments: [], // 固定ページにはコメント機能なし
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

	

export const actions: Actions = {
	addComment: async ({ request, params, locals }) => {
		const allowComments = getSetting('allow_comments', 'true') === 'true';

		if (!allowComments) return fail(403, { message: 'コメントは許可されていません。' });

		const formData = await request.formData();
		let content = formData.get('content') as string;
		const parent_id = (formData.get('parentId') || formData.get('parent_id')) as string | null;
		const { slug } = params;

		if (!content || content.trim().length === 0) {
			return fail(400, { message: 'コメント内容を入力してください。' });
		}

		// 長さ制限（1000 文字）
		if (content.length > 1000) {
			return fail(400, { message: 'コメントは 1000 文字以内で入力してください。' });
		}

		// XSS 対策：危険なプロトコルのブロック
		const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
		const contentLower = content.toLowerCase();
		for (const protocol of dangerousProtocols) {
			if (contentLower.includes(protocol)) {
				return fail(400, { message: '無効なコンテンツが含まれています。' });
			}
		}

		// XSS 対策：HTML エスケープ
		content = escapeHtml(content);

		const userId = locals.user?.id || null;
		const allowAnonymous = getSetting('allow_anonymous_comments', 'false') === 'true';

		if (!userId && !allowAnonymous) {
			return fail(403, { message: 'コメントを投稿するにはログインが必要です。' });
		}

		try {
			const id = crypto.randomUUID();
			db.prepare(
				'INSERT INTO comment (id, post_id, parent_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
			).run(id, slug, parent_id, userId, content, Date.now());

			return { success: true };
		} catch (err) {
			console.error('[COMMENT ERROR]', err);
			return fail(500, { message: 'エラーが発生しました。' });
		}
	},

	

		deleteComment: async ({ request, locals }) => {

	

			if (!locals.user || !['admin', 'editor'].includes(locals.user.role)) {

	

				return fail(403, { message: '権限がありません。' });

	

			}

	

	

	

			const formData = await request.formData();

	

			const id = formData.get('id') as string;

	

	

	

			if (!id) return fail(400);

	

	

	

			try {

	

				db.prepare('DELETE FROM comment WHERE id = ?').run(id);

	

				return { success: true };

	

			} catch (err) {

	

				return fail(500);

	

			}

	

		}

	

	};

	

	

	
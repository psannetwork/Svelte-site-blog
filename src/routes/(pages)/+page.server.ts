import db from '$lib/server/db';
import { editorJsToHtml } from '$lib/server/editor';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	const searchQuery = url.searchParams.get('search');
	let posts;

	// pages テーブルから Home ページを取得（完全に DB 優先）
	const homePage = db.prepare("SELECT content, raw_json FROM pages WHERE id = 'home'").get() as any;

	let homeHtml = '';
	if (homePage) {
		// content (HTML) があればそれを優先、なければ raw_json から変換
		if (homePage.content) {
			homeHtml = homePage.content;
		} else if (homePage.raw_json) {
			try {
				const parsed = JSON.parse(homePage.raw_json);
				if (parsed && parsed.blocks) {
					homeHtml = editorJsToHtml(parsed.blocks);
				}
			} catch (e) {
				console.error('[HOME LOAD ERROR] JSON parse failed:', e);
			}
		}
	}

	// 検索クエリがある場合は検索結果を返す
	if (searchQuery) {
		const searchTerm = `%${searchQuery}%`;
		if (user?.role === 'admin' || user?.role === 'editor') {
			posts = db
				.prepare(
					`
				SELECT post.*, COALESCE(user.nickname, user.username) as author_name
				FROM post
				JOIN user ON post.author_id = user.id
				WHERE post.visibility != 'draft'
				AND (post.title LIKE ? OR post.summary LIKE ?)
				ORDER BY is_pinned DESC, created_at DESC
			`
				)
				.all(searchTerm, searchTerm) as any[];
		} else if (user?.role === 'vip') {
			posts = db
				.prepare(
					`
				SELECT post.*, COALESCE(user.nickname, user.username) as author_name
				FROM post
				JOIN user ON post.author_id = user.id
				WHERE post.visibility IN ('public', 'vip')
				AND (post.title LIKE ? OR post.summary LIKE ?)
				ORDER BY is_pinned DESC, created_at DESC
			`
				)
				.all(searchTerm, searchTerm) as any[];
		} else {
			posts = db
				.prepare(
					`
				SELECT post.*, COALESCE(user.nickname, user.username) as author_name
				FROM post
				JOIN user ON post.author_id = user.id
				WHERE post.visibility = 'public'
				AND (post.title LIKE ? OR post.summary LIKE ?)
				ORDER BY is_pinned DESC, created_at DESC
			`
				)
				.all(searchTerm, searchTerm) as any[];
		}
	} else {
		// 通常の記事一覧
		if (user?.role === 'admin' || user?.role === 'editor') {
			posts = db
				.prepare(
					`
				SELECT post.*, COALESCE(user.nickname, user.username) as author_name
				FROM post
				JOIN user ON post.author_id = user.id
				WHERE post.visibility != 'draft'
				ORDER BY is_pinned DESC, created_at DESC
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
				ORDER BY is_pinned DESC, created_at DESC
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
				ORDER BY is_pinned DESC, created_at DESC
			`
				)
				.all() as any[];
		}
	}

	return {
		posts,
		homeHtml,
		searchQuery
	};
};

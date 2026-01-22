import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import db from '$lib/server/db';
import { getSettings } from '$lib/server/settings';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	if (
		locals.user.role !== 'admin' &&
		locals.user.role !== 'editor' &&
		locals.user.role !== 'author'
	) {
		throw redirect(302, '/');
	}

	const settings = getSettings();
	
	// 最新のコメントを3件取得（サイドバーのプレビュー用）
	const latestComments = db.prepare(`
		SELECT 
			c.content, 
			COALESCE(u.nickname, u.username, 'Anonymous') as author_name, 
			c.created_at
		FROM comment c
		LEFT JOIN user u ON c.author_id = u.id
		ORDER BY c.created_at DESC
		LIMIT 3
	`).all() as any[];

	return {
		user: locals.user,
		settings,
		latestComments
	};
};
import db from '$lib/server/db';
import { editorJsToHtml } from '$lib/server/editor';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// About ページは pages テーブルから取得（DB 優先）
	const page = db.prepare("SELECT content, raw_json FROM pages WHERE id = 'about'").get() as any;

	let aboutHtml = '';
	if (page) {
		// content (HTML) があればそれを優先、なければ raw_json から変換
		if (page.content) {
			aboutHtml = page.content;
		} else if (page.raw_json) {
			try {
				const parsed = JSON.parse(page.raw_json);
				if (parsed && parsed.blocks) {
					aboutHtml = editorJsToHtml(parsed.blocks);
				}
			} catch (e) {
				console.error('[ABOUT LOAD ERROR] JSON parse failed:', e);
			}
		}
	}

	return {
		aboutHtml,
		user: locals.user
	};
};

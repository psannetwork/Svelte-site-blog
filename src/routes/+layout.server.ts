import { getSettings } from '$lib/server/settings';
import { editorJsToHtml } from '$lib/server/editor';
import db from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const prerender = false;

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:settings');

	const settings = getSettings();

	// pages テーブルからエラーページを取得（DB 優先）
	const error404Page = db.prepare("SELECT content, raw_json FROM pages WHERE id = 'error404'").get() as any;
	const error500Page = db.prepare("SELECT content, raw_json FROM pages WHERE id = 'error500'").get() as any;

	// content (HTML) があれば優先、なければ raw_json から変換
	const getHtmlFromPage = (page: any, pageName: string): string => {
		if (!page) return '';
		if (page.content) return page.content;
		if (page.raw_json) {
			try {
				const parsed = JSON.parse(page.raw_json);
				if (parsed && parsed.blocks) {
					return editorJsToHtml(parsed.blocks);
				}
			} catch (e) {
				console.error(`[${pageName} LOAD ERROR] JSON parse failed:`, e);
			}
		}
		return '';
	};

	const error404Html = getHtmlFromPage(error404Page, 'ERROR404');
	const error500Html = getHtmlFromPage(error500Page, 'ERROR500');

	return {
		user: locals.user,
		settings,
		error404Html,
		error500Html
	};
};

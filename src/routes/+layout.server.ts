import { getSettings } from "$lib/server/settings";
import { editorJsToHtml } from "$lib/server/editor";
import type { LayoutServerLoad } from "./$types";

export const prerender = false;

export const load: LayoutServerLoad = async ({ locals, depends, setHeaders }) => {
	// キャッシュを無効化
	setHeaders({
		'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
		'Pragma': 'no-cache',
		'Expires': '0'
	});

	// 設定変更時に再取得できるように依存関係を登録
	depends('app:settings');
	
	const settings = getSettings();
	
	// エラーコンテンツをHTML化（初期表示用）
	const error404Html = editorJsToHtml(JSON.parse(settings.error_404_content || '{"blocks":[]}').blocks);
	const error500Html = editorJsToHtml(JSON.parse(settings.error_500_content || '{"blocks":[]}').blocks);

	return {
		user: locals.user,
		settings,
		error404Html,
		error500Html
	};
};

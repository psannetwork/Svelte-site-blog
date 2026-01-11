import { getSettings } from "$lib/server/settings";
import { editorJsToHtml } from "$lib/server/editor";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
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

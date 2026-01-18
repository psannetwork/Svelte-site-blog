import { getSettings } from "$lib/server/settings";
import { editorJsToHtml } from "$lib/server/editor";
import type { LayoutServerLoad } from "./$types";

export const prerender = false;

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	
	depends('app:settings');
	
	const settings = getSettings();
	
	
	const error404Html = editorJsToHtml(JSON.parse(settings.error_404_content || '{"blocks":[]}').blocks);
	const error500Html = editorJsToHtml(JSON.parse(settings.error_500_content || '{"blocks":[]}').blocks);

	return {
		user: locals.user,
		settings,
		error404Html,
		error500Html
	};
};

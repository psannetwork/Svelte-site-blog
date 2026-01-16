import db from "$lib/server/db";
import { editorJsToHtml } from "$lib/server/editor";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const page = db.prepare("SELECT content, raw_json FROM pages WHERE id = 'about'").get() as any;
	const aboutHtml = page?.raw_json ? editorJsToHtml(JSON.parse(page.raw_json).blocks) : (page?.content || '');
	
	return {
		aboutHtml
	};
};

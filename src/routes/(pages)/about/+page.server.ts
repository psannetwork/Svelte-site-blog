import db from "$lib/server/db";
import { editorJsToHtml } from "$lib/server/editor";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const page = db.prepare("SELECT content, raw_json FROM pages WHERE id = 'about'").get() as any;
	
	let aboutHtml = page?.content || '';
	if (page?.raw_json) {
		try {
			const parsed = JSON.parse(page.raw_json);
			if (parsed && parsed.blocks) aboutHtml = editorJsToHtml(parsed.blocks);
		} catch (e) {}
	}
	
	return {
		aboutHtml
	};
};

import db from "$lib/server/db";
import { editorJsToHtml } from "$lib/server/editor";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const aboutPage = db.prepare("SELECT * FROM pages WHERE id = 'about'").get() as any;
	const aboutHtml = aboutPage ? editorJsToHtml(JSON.parse(aboutPage.content).blocks) : '';
	
	return {
		aboutHtml
	};
};

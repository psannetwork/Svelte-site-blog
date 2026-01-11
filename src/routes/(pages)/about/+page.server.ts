import { getSetting } from "$lib/server/settings";
import { editorJsToHtml } from "$lib/server/editor";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const aboutJson = getSetting("about_page_content", '{"blocks":[]}');
	const aboutHtml = editorJsToHtml(JSON.parse(aboutJson).blocks);
	
	return {
		aboutHtml
	};
};

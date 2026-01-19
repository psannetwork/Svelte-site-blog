import { getSettings } from '$lib/server/settings';
import { editorJsToHtml } from '$lib/server/editor';
import db from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const prerender = false;

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:settings');

	const settings = getSettings();

	const error404 = db.prepare("SELECT raw_json FROM pages WHERE id = 'error404'").get() as any;
	const error500 = db.prepare("SELECT raw_json FROM pages WHERE id = 'error500'").get() as any;

	const error404Html = editorJsToHtml(JSON.parse(error404?.raw_json || '{"blocks":[]}').blocks);
	const error500Html = editorJsToHtml(JSON.parse(error500?.raw_json || '{"blocks":[]}').blocks);

	return {
		user: locals.user,
		settings,
		error404Html,
		error500Html
	};
};

import db from "$lib/server/db";
import { getSetting } from "$lib/server/settings";
import { editorJsToHtml } from "$lib/server/editor";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	let posts;

	const homeHeroJson = getSetting("home_hero_content", '{"blocks":[]}');
	const homeHtml = editorJsToHtml(JSON.parse(homeHeroJson).blocks);

	if (user?.role === 'admin' || user?.role === 'editor') {
		posts = db.prepare(`
			SELECT post.*, COALESCE(user.nickname, user.username) as author_name 
			FROM post 
			JOIN user ON post.author_id = user.id 
			WHERE post.visibility IN ('public', 'vip') OR post.author_id = ?
			ORDER BY created_at DESC
		`).all(user.id) as any[];
	} else if (user) {
		posts = db.prepare(`
			SELECT post.*, COALESCE(user.nickname, user.username) as author_name 
			FROM post 
			JOIN user ON post.author_id = user.id 
			WHERE post.visibility IN ('public', 'vip')
			ORDER BY created_at DESC
		`).all() as any[];
	} else {
		posts = db.prepare(`
			SELECT post.*, COALESCE(user.nickname, user.username) as author_name 
			FROM post 
			JOIN user ON post.author_id = user.id 
			WHERE post.visibility = 'public'
			ORDER BY created_at DESC
		`).all() as any[];
	}

	return {
		posts,
		homeHtml
	};
};
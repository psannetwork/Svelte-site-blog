import db from "$lib/server/db";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, "/auth/login");

	const posts = db.prepare(`
		SELECT post.*, user.username as author_name 
		FROM post 
		JOIN user ON post.author_id = user.id 
		ORDER BY created_at DESC
	`).all() as any[];

	return {
		posts
	};
};

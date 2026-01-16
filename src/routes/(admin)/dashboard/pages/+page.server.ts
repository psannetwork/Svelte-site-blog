import db from "$lib/server/db";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw redirect(302, "/dashboard");
	}

	
	const ensurePage = (id: string, title: string) => {
		const exists = db.prepare("SELECT 1 FROM pages WHERE id = ?").get(id);
		if (!exists) {
			db.prepare("INSERT INTO pages (id, title, content, updated_at) VALUES (?, ?, ?, ?)")
				.run(id, title, JSON.stringify({ blocks: [] }), Date.now());
		}
	};

	ensurePage('home', 'Home Page');
	ensurePage('about', 'About Page');

	const pages = db.prepare("SELECT * FROM pages ORDER BY updated_at DESC").all();
	return { pages };
};

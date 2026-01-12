import db from "$lib/server/db";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw redirect(302, "/dashboard");
	}

	const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(params.id) as any;
	if (!page) throw error(404, "Page not found");

	return { page };
};

export const actions: Actions = {
	savePage: async ({ request, params }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;

		db.prepare("UPDATE pages SET title = ?, content = ?, updated_at = ? WHERE id = ?")
			.run(title, content, Date.now(), params.id);

		return { success: true };
	}
};

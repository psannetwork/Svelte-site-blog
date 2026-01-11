import db from "$lib/server/db";
import { error, redirect, fail } from "@sveltejs/kit";
import { editorJsToHtml } from "$lib/server/editor";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
		throw redirect(302, "/auth/login");
	}

	const post = db.prepare("SELECT * FROM post WHERE id = ?").get(params.id) as any;

	if (!post) throw error(404, "Post not found");

	// 権限チェック: 編集者ロールの場合、自分の記事以外は編集不可（管理者はOK）
	if (locals.user.role === 'editor' && post.author_id !== locals.user.id) {
		throw error(403, "You do not have permission to edit this post");
	}

	return {
		post
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'editor')) {
			return fail(403);
		}

		const formData = await request.formData();
		const title = formData.get("title") as string;
		const summary = formData.get("summary") as string;
		const visibility = formData.get("visibility") as string;
		const editorDataRaw = formData.get("editorData") as string;

		if (!title || !editorDataRaw) {
			return fail(400, { message: "Title and content are required" });
		}

		const editorData = JSON.parse(editorDataRaw);
		const htmlContent = editorJsToHtml(editorData.blocks);

		db.prepare(`
			UPDATE post 
			SET title = ?, summary = ?, content = ?, raw_json = ?, visibility = ?, updated_at = ? 
			WHERE id = ?
		`).run(title, summary, htmlContent, editorDataRaw, visibility, Date.now(), params.id);

		throw redirect(302, "/dashboard/posts");
	}
};

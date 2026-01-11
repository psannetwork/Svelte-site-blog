import db from "$lib/server/db";
import { error, fail } from "@sveltejs/kit";
import { getSetting, verifyTurnstile } from "$lib/server/settings";
import { generateIdFromEntropySize } from "lucia";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const post = db.prepare("SELECT * FROM post WHERE id = ?").get(params.slug) as any;
	if (!post) throw error(404, "Post not found");

	const user = locals.user;
	if (post.visibility === 'draft' && user?.id !== post.author_id && user?.role !== 'admin') throw error(403, "Forbidden");
	if (post.visibility === 'vip' && (!user || !['vip', 'editor', 'admin'].includes(user.role))) throw error(403, "VIP required");

	const anonymousName = getSetting("anonymous_name", "Anonymous");

	// 全コメントを取得 (リプライ含む)
	const comments = db.prepare(`
		SELECT 
			comment.*, 
			COALESCE(user.nickname, user.username, ?) as author_name, 
			user.role as author_role,
			user.avatar_url
		FROM comment
		LEFT JOIN user ON comment.author_id = user.id
		WHERE post_id = ?
		ORDER BY created_at ASC
	`).all(anonymousName, params.slug) as any[];

	return {
		post,
		comments,
		user: locals.user,
		settings: {
			allow_comments: getSetting("allow_comments", "true") === "true",
			allow_anonymous_comments: getSetting("allow_anonymous_comments", "false") === "true"
		}
	};
};

export const actions: Actions = {
	addComment: async ({ request, params, locals }) => {
		const isAnonymousAllowed = getSetting("allow_anonymous_comments", "false") === "true";
		if (!locals.user && !isAnonymousAllowed) return fail(401);
		
		const formData = await request.formData();
		const content = formData.get("content") as string;
		const parentId = formData.get("parentId") as string | null;

		if (!content || content.length < 1) return fail(400);

		const commentId = generateIdFromEntropySize(10);
		db.prepare("INSERT INTO comment (id, post_id, author_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)")
			.run(commentId, params.slug, locals.user?.id || null, parentId || null, content, Date.now());

		// リプライ通知の作成
		if (parentId) {
			const parentComment = db.prepare("SELECT author_id FROM comment WHERE id = ?").get(parentId) as any;
			if (parentComment?.author_id && parentComment.author_id !== locals.user?.id) {
				const user = db.prepare("SELECT notification_enabled FROM user WHERE id = ?").get(parentComment.author_id) as any;
				if (user?.notification_enabled) {
					db.prepare("INSERT INTO notification (id, user_id, type, content, link, created_at) VALUES (?, ?, ?, ?, ?, ?)")
						.run(generateIdFromEntropySize(10), parentComment.author_id, 'reply', 'あなたのコメントにリプライが届きました。', `/pages/${params.slug}#comments`, Date.now());
				}
			}
		}

		return { success: true };
	},
	deleteComment: async ({ request, locals }) => {
		if (!locals.user || !['admin', 'editor'].includes(locals.user.role)) return fail(403);
		const formData = await request.formData();
		const id = formData.get("id") as string;
		db.prepare("DELETE FROM comment WHERE id = ?").run(id);
		return { success: true };
	}
};
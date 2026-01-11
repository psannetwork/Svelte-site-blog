import db from "$lib/server/db";
import { error, fail } from "@sveltejs/kit";
import { getSetting, verifyTurnstile } from "$lib/server/settings";
import { generateIdFromEntropySize } from "lucia";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const post = db.prepare("SELECT * FROM post WHERE id = ?").get(params.slug) as any;

	if (!post) throw error(404, "Post not found");

	const user = locals.user;
	if (post.visibility === 'draft' && user?.id !== post.author_id && user?.role !== 'admin') {
		throw error(403, "この投稿は下書き状態です。");
	}
	if (post.visibility === 'private' && user?.id !== post.author_id && user?.role !== 'admin') {
		throw error(403, "この投稿は非公開です。");
	}
	if (post.visibility === 'vip' && (!user || (user.role !== 'vip' && user.role !== 'editor' && user.role !== 'admin'))) {
		throw error(403, "この投稿はVIPメンバー限定です。");
	}

	const anonymousName = getSetting("anonymous_name", "Anonymous");

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
			allow_anonymous_comments: getSetting("allow_anonymous_comments", "false") === "true",
			anonymous_name: anonymousName,
			enable_turnstile: getSetting("enable_turnstile") === "true",
			turnstile_site_key: getSetting("turnstile_site_key")
		}
	};
};

export const actions: Actions = {
	addComment: async ({ request, params, locals }) => {
		const isAnonymousAllowed = getSetting("allow_anonymous_comments", "false") === "true";
		if (!locals.user && !isAnonymousAllowed) return fail(401, { message: "ログインが必要です。" });
		if (getSetting("allow_comments", "true") !== "true") return fail(403, { message: "コメントは現在無効です。" });

		const formData = await request.formData();
		const content = formData.get("content") as string;
		const turnstileToken = formData.get("cf-turnstile-response") as string;

		if (getSetting("enable_turnstile") === "true") {
			const valid = await verifyTurnstile(turnstileToken);
			if (!valid) return fail(400, { message: "認証に失敗しました。" });
		}

		if (!content || content.length < 1) return fail(400, { message: "内容を入力してください。" });

		const commentId = generateIdFromEntropySize(10);
		
		// 明示的に null を渡す
		const authorId = locals.user?.id || null;

		db.prepare("INSERT INTO comment (id, post_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)")
			.run(commentId, params.slug, authorId, content, Date.now());

		return { success: true };
	},
	deleteComment: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== "admin" && locals.user.role !== "editor")) return fail(403, { message: "権限がありません。" });
		const formData = await request.formData();
		const id = formData.get("id") as string;
		db.prepare("DELETE FROM comment WHERE id = ?").run(id);
		return { success: true };
	}
};

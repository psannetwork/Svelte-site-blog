import db from "$lib/server/db";
import { getSetting } from "$lib/server/settings";
import { cleanupUserFiles } from "$lib/server/files";
import { hash, verify } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, "/auth/login");
	return {
		allow_deletion: getSetting("allow_account_deletion", "true") === "true"
	};
};

export const actions: Actions = {
	updateNickname: async ({ request, locals }) => {
		const formData = await request.formData();
		const nickname = formData.get("nickname") as string;
		const avatar_url = formData.get("avatar_url") as string;
		const valueToSave = nickname && nickname.trim().length > 0 ? nickname : null;
		db.prepare("UPDATE user SET nickname = ?, avatar_url = ? WHERE id = ?").run(valueToSave, avatar_url, locals.user!.id);
		return { success: true };
	},
	updatePassword: async ({ request, locals }) => {
		const formData = await request.formData();
		const currentPassword = formData.get("current_password") as string;
		const newPassword = formData.get("new_password") as string;
		const user = db.prepare("SELECT password_hash FROM user WHERE id = ?").get(locals.user!.id) as any;
		const valid = await verify(user.password_hash, currentPassword);
		if (!valid) return fail(400, { message: "現在のパスワードが違います。" });
		const newHash = await hash(newPassword);
		db.prepare("UPDATE user SET password_hash = ? WHERE id = ?").run(newHash, locals.user!.id);
		return { success: true };
	},
	deleteAccount: async ({ locals, cookies }) => {
		if (!locals.user || !locals.session) throw redirect(302, "/auth/login");
		if (getSetting("allow_account_deletion", "true") !== "true") return fail(403);
		
		// システム保護されているアカウント（最初のAdmin）は削除不可
		const user = db.prepare("SELECT is_protected FROM user WHERE id = ?").get(locals.user.id) as any;
		if (user?.is_protected) return fail(400, { message: "このアカウントはシステムによって保護されており、削除できません。" });

		// ファイルクリーンアップ
		cleanupUserFiles(locals.user.id);

		// セッション無効化
		await lucia.invalidateSession(locals.session.id);
		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, { path: ".", ...sessionCookie.attributes });

		// DBから削除
		db.prepare("DELETE FROM user WHERE id = ?").run(locals.user.id);

		throw redirect(302, "/");
	}
};
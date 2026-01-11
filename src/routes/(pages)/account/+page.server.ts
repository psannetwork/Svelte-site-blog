import db from "$lib/server/db";
import { hash, verify } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, "/auth/login");
};

export const actions: Actions = {
	updateNickname: async ({ request, locals }) => {
		const formData = await request.formData();
		const nickname = formData.get("nickname") as string;
		
		// 空文字の場合はNULLとして保存
		const valueToSave = nickname && nickname.trim().length > 0 ? nickname : null;

		db.prepare("UPDATE user SET nickname = ? WHERE id = ?").run(valueToSave, locals.user!.id);
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
	}
};
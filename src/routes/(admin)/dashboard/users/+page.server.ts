import db from "$lib/server/db";
import { error, redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== "admin") throw redirect(302, "/dashboard");
	const users = db.prepare("SELECT id, username, role, is_protected FROM user").all() as any[];
	return { users };
};

export const actions: Actions = {
	updateRole: async ({ request, locals }) => {
		if (locals.user?.role !== "admin") return fail(403);
		const formData = await request.formData();
		const userId = formData.get("userId") as string;
		const newRole = formData.get("role") as string;

		const target = db.prepare("SELECT is_protected FROM user WHERE id = ?").get(userId) as any;
		if (target?.is_protected) return fail(400, { message: "このユーザーの権限は変更できません。" });

		db.prepare("UPDATE user SET role = ? WHERE id = ?").run(newRole, userId);
		return { success: true };
	},
	deleteUser: async ({ request, locals }) => {
		if (locals.user?.role !== "admin") return fail(403);
		const formData = await request.formData();
		const userId = formData.get("userId") as string;

		const target = db.prepare("SELECT is_protected FROM user WHERE id = ?").get(userId) as any;
		if (target?.is_protected) return fail(400, { message: "このユーザーは削除できません。" });

		db.prepare("DELETE FROM user WHERE id = ?").run(userId);
		return { success: true };
	}
};

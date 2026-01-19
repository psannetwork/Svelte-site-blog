import db from "$lib/server/db";
import { cleanupUserFiles } from "$lib/server/files";
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

		cleanupUserFiles(userId);

		db.prepare("DELETE FROM user WHERE id = ?").run(userId);
		return { success: true };
	},
	createUser: async ({ request, locals }) => {
		if (locals.user?.role !== "admin") return fail(403);
		const formData = await request.formData();
		const username = formData.get("username") as string;
		const password = formData.get("password") as string;
		const role = formData.get("role") as string || "user";

		if (!username || !password) return fail(400, { message: "ユーザー名とパスワードは必須です。" });

		const existing = db.prepare("SELECT id FROM user WHERE username = ?").get(username);
		if (existing) return fail(400, { message: "このユーザー名は既に使用されています。" });

		const { hash } = await import('@node-rs/argon2');
		const passwordHash = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		const { generateIdFromEntropySize } = await import('lucia');
		const userId = generateIdFromEntropySize(10);

		db.prepare("INSERT INTO user (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, username, passwordHash, role, Date.now());
		return { success: true };
	}
};

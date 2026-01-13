import { getSettings, setSetting } from "$lib/server/settings";
import { listBackups, performBackup, restoreBackup, isValidSqlite } from "$lib/server/backup";
import { getDbStatus } from "$lib/server/db";
import { fail, redirect } from "@sveltejs/kit";
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== "admin") throw redirect(302, "/dashboard");
	return { 
		settings: getSettings(), 
		backups: listBackups(),
		dbStatus: getDbStatus()
	};
};

export const actions: Actions = {
	saveSettings: async ({ request }) => {
		const formData = await request.formData();
		const allKeys = [
			"site_title", "site_description", "accent_color", "is_site_public", "custom_css", "site_icon_url", "storage_type", "site_language",
			"allow_signup", "allow_comments", "allow_anonymous_comments", "allow_account_deletion", "anonymous_name", "show_footer_auth", "require_email_verification",
			"home_hero_content", "about_page_content", "error_404_content", "error_500_content",
			"enable_turnstile", "turnstile_site_key", "turnstile_secret_key",
			"enable_backup", "backup_interval", "backup_keep_count",
			"allowed_extensions" // ← 追加
		];
		const checkboxKeys = [
			"allow_signup", "allow_comments", "allow_anonymous_comments", "allow_account_deletion",
			"show_footer_auth", "enable_turnstile", "require_email_verification", "enable_backup"
		];
		for (const key of allKeys) {
			const val = formData.get(key);
			if (key === "is_site_public") { setSetting(key, val === "on" ? "false" : "true"); }
			else if (checkboxKeys.includes(key)) { setSetting(key, val === "on" ? "true" : "false"); }
			else if (val !== null) { setSetting(key, val.toString()); }
		}
		return { success: true };
	},
	createBackup: async () => {
		performBackup();
		return { success: true };
	},
	uploadBackup: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		if (!file || file.size === 0) return fail(400, { message: "ファイルを選択してください。" });

		const buffer = Buffer.from(await file.arrayBuffer());
		
		// セキュリティチェック: SQLiteシグネチャの確認
		if (!isValidSqlite(buffer)) {
			return fail(400, { message: "無効なデータベースファイルです。" });
		}

		const filename = `uploaded-${Date.now()}.db`;
		const filePath = join(process.cwd(), 'backups', filename);
		writeFileSync(filePath, buffer);

		return { success: true, message: "アップロード完了。履歴から復元できます。" };
	},
	downloadBackup: async ({ url }) => {
		const filename = url.searchParams.get('filename');
		if (!filename) return fail(400);
		const filePath = join(process.cwd(), 'backups', filename);
		const file = readFileSync(filePath);
		return new Response(file, {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	},
	restoreBackup: async ({ request }) => {
		const formData = await request.formData();
		const filename = formData.get('filename') as string;
		const res = await restoreBackup(filename);
		if (res.success) return { success: true, message: "データベースの復元が完了しました。ページをリロードして反映を確認してください。" };
		return fail(500, { message: "リストアに失敗しました。" });
	}
};
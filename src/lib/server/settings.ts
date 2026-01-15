import db from "./db";

export const getSetting = (key: string, defaultValue: string = ""): string => {
	try {
		const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key) as { value: string } | undefined;
		return row ? row.value : defaultValue;
	} catch (e) {
		console.error(`[SETTINGS] Error getting setting ${key}:`, e);
		return defaultValue;
	}
};

export const setSettings = (settings: Record<string, string>) => {
	console.log(`[SETTINGS] Updating ${Object.keys(settings).length} settings...`);

	try {
		// ★修正ポイント: トランザクションを使って一括保存する
		// これにより、Tursoへの通信回数が 20回 -> 1回 になり、高速化＆ロック回避できます
		const updateTransaction = db.transaction((data: Record<string, string>) => {
			const stmt = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
			for (const [key, value] of Object.entries(data)) {
				stmt.run(key, value);
			}
		});

		updateTransaction(settings);
		console.log("[SETTINGS] Transaction committed successfully.");

	} catch (e) {
		// トランザクションがサポートされていない場合などのフォールバック
		console.error("[SETTINGS] Transaction failed, falling back to sequential updates:", e);
		for (const [key, value] of Object.entries(settings)) {
			try {
				db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(key, value);
			} catch (err) {
				console.error(`Failed to update ${key}:`, err);
			}
		}
	}
};

export const getSettings = () => {
	try {
		const rows = db.prepare("SELECT key, value FROM site_settings").all() as { key: string; value: string }[];
		if (!rows || rows.length === 0) {
			// ここでWarnが出ている可能性がありますが、初回以外は通常データがあるはず
			return {};
		}
		const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {} as Record<string, string>);
		settings._updated = Date.now().toString();
		return settings;
	} catch (e) {
		// ★ここが原因で画面が真っ白になっていました
		console.error("[SETTINGS] Fatal error in getSettings:", e);
		return {};
	}
};

export async function verifyTurnstile(token: string) {
	const enabled = getSetting("enable_turnstile", "false") === "true";
	const secret = getSetting("turnstile_secret_key");
	if (!enabled || !secret || !token) return !enabled;
	const formData = new FormData();
	formData.append("secret", secret);
	formData.append("response", token);
	try {
		const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { body: formData, method: "POST" });
		const outcome = await res.json();
		return outcome.success;
	} catch {
		return false;
	}
}
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

export const setSetting = (key: string, value: string) => {
	try {
		// INSERT OR REPLACE を確実に実行
		db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(key, value);
	} catch (e) {
		console.error(`[SETTINGS] Error setting ${key}:`, e);
		throw e;
	}
};

export const setSettings = (settings: Record<string, string>) => {
	console.log(`[SETTINGS] Updating ${Object.keys(settings).length} settings...`);

	try {
		// トランザクションを作成（これにより全ての更新が1回の処理として扱われます）
		const updateTransaction = db.transaction((data: Record<string, string>) => {
			const stmt = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
			for (const [key, value] of Object.entries(data)) {
				stmt.run(key, value);
			}
		});

		// トランザクション実行
		updateTransaction(settings);

	} catch (e) {
		console.error("[SETTINGS] Transaction failed, falling back to sequential updates:", e);
		// 万が一トランザクションが動かない環境のためのフォールバック
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
			console.warn("[SETTINGS] No settings found in database.");
			return {};
		}
		const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {} as Record<string, string>);
		// キャッシュを破壊するためのユニークIDを付与
		settings._updated = Date.now().toString();
		return settings;
	} catch (e) {
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
	} catch (e) {
		return false;
	}
}

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
		db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(key, value);
	} catch (e) {
		console.error(`[SETTINGS] Error setting ${key}:`, e);
		throw e;
	}
};

export const setSettings = (settings: Record<string, string>) => {
	console.log(`[SETTINGS] Updating ${Object.keys(settings).length} settings...`);

	try {
		// トランザクションを試行
		const updateTransaction = db.transaction((data: Record<string, string>) => {
			const stmt = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
			for (const [key, value] of Object.entries(data)) {
				stmt.run(key, value);
			}
		});

		updateTransaction(settings);
		console.log("[SETTINGS] Transaction committed successfully.");

	} catch (e) {
		console.warn("[SETTINGS] Transaction failed (likely Turso/HTTP mode), falling back to sequential updates. Error:", e);
		
		// フォールバック: 個別実行
		const stmt = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
		for (const [key, value] of Object.entries(settings)) {
			try {
				stmt.run(key, value);
			} catch (err) {
				console.error(`[SETTINGS] Failed to update ${key} in fallback mode:`, err);
			}
		}
	}
};

export const getSettings = () => {
	let retries = 3;
	while (retries > 0) {
		try {
			const rows = db.prepare("SELECT key, value FROM site_settings").all() as { key: string; value: string }[];
			if (!rows) return {};
			
			const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {} as Record<string, string>);
			settings._updated = Date.now().toString();
			return settings;
		} catch (e) {
			console.error(`[SETTINGS] Error in getSettings (retries left: ${retries - 1}):`, e);
			retries--;
			if (retries === 0) {
				console.error("[SETTINGS] Fatal error in getSettings: All retries failed.");
				return {};
			}
			// 短い待機を入れてリトライ（Tursoの一時的なエラー対策）
			// Note: 同期関数のため sleep はブロッキングになるが、サーバー起動時や設定ロード時のみなので許容
			const start = Date.now();
			while (Date.now() - start < 100) {} 
		}
	}
	return {};
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
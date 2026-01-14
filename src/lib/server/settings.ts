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
	for (const [key, value] of Object.entries(settings)) {
		setSetting(key, value);
	}
};

export const getSettings = () => {
	try {
		const rows = db.prepare("SELECT key, value FROM site_settings").all() as { key: string; value: string }[];
		if (!rows || rows.length === 0) {
			console.warn("[SETTINGS] No settings found in database.");
		}
		const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {} as Record<string, string>);
		settings._updated = Date.now().toString();
		return settings;
	} catch (e) {
		console.error("[SETTINGS] Fatal error in getSettings:", e);
		// エラー時は null を返して、UI側で「データ欠落」として扱えるようにする
		return null;
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
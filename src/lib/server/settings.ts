import db from "./db";

export const getSetting = (key: string, defaultValue: string = ""): string => {
	try {
		const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key) as { value: string } | undefined;
		return row ? row.value : defaultValue;
	} catch (e) {
		return defaultValue;
	}
};

export const setSetting = (key: string, value: string) => {
	db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(key, value);
};

export const setSettings = (settings: Record<string, string>) => {
	const insert = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
	const transaction = db.transaction((data: Record<string, string>) => {
		for (const [key, value] of Object.entries(data)) {
			insert.run(key, value);
		}
	});
	transaction(settings);
};

export const getSettings = () => {
	try {
		const rows = db.prepare("SELECT key, value FROM site_settings").all() as { key: string; value: string }[];
		return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {} as Record<string, string>);
	} catch (e) {
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
		const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
		const res = await fetch(url, { body: formData, method: "POST" });
		const outcome = await res.json();
		return outcome.success;
	} catch (e) {
		return false;
	}
}
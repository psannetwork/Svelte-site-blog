import db, { getDbStatus } from "./db";

export const DEFAULT_SETTINGS: Record<string, string> = {
	"site_title": "PSANBLOG",
	"site_description": "",
	"is_site_public": "true",
	"allow_signup": "true",
	"allow_comments": "true",
	"allow_anonymous_comments": "false",
	"anonymous_name": "Anonymous",
	"allow_account_deletion": "true",
	"require_email_verification": "false",
	"enable_turnstile": "false",
	"turnstile_site_key": "",
	"turnstile_secret_key": "",
	"accent_color": "#00CC99",
	"enable_backup": "false",
	"backup_interval": "24",
	"backup_keep_count": "5",
	"last_backup_at": "0",
	"is_setup_completed": "false",
	"allowed_extensions": '["jpg","jpeg","png","gif","webp","svg","ico"]',
	"storage_type": "local",
	"site_language": "ja",
	"home_hero_content": JSON.stringify({ blocks: [{ type: "header", data: { text: "CREATE BETTER CONTENT.", level: 1 } }] }),
	"about_page_content": JSON.stringify({ blocks: [] }),
	"error_404_content": JSON.stringify({ blocks: [{ type: "header", data: { text: "404 Not Found", level: 2 } }] }),
	"error_500_content": JSON.stringify({ blocks: [{ type: "header", data: { text: "500 Server Error", level: 2 } }] }),
	"custom_css": ""
};

export const getSetting = (key: string, defaultValue: string = ""): string => {
	try {
		const result = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
		const row = (result && typeof result === 'object') ? result : null;
		
		const val = row ? (row.value ?? row.VALUE ?? row[0]) : null;
		return val !== null ? String(val) : (DEFAULT_SETTINGS[key] ?? defaultValue);
	} catch (e) {
		return DEFAULT_SETTINGS[key] ?? defaultValue;
	}
};

export const setSetting = (key: string, value: string) => {
	try {
		db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(key, value);
	} catch (e) {
		throw e;
	}
};

export const setSettings = (settings: Record<string, string>) => {
	const updatedSettings = { 
		...settings, 
		"settings_updated_at": Date.now().toString() 
	};

	try {
		const updateTransaction = db.transaction((data: Record<string, string>) => {
			const stmt = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
			for (const [key, value] of Object.entries(data)) {
				stmt.run(key, value);
			}
		});
		updateTransaction(updatedSettings);
	} catch (e) {
		const stmt = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
		for (const [key, value] of Object.entries(updatedSettings)) {
			try { stmt.run(key, value); } catch (err) {}
		}
	}
};

export const getSettings = () => {
	let settings = { ...DEFAULT_SETTINGS };
	const dbStatus = getDbStatus();
	
	try {
		const result = db.prepare("SELECT key, value FROM site_settings").all();
		const rows = Array.isArray(result) ? result : (result && typeof result === 'object' && 'rows' in result ? (result as any).rows : []);
		
		if (rows && rows.length > 0) {
			const dbSettings: Record<string, string> = {};
			rows.forEach((row: any) => {
				if (row && typeof row === 'object') {
					const k = row.key ?? row.KEY ?? row[0];
					const v = row.value ?? row.VALUE ?? row[1];
					if (k !== undefined) dbSettings[String(k)] = v !== null ? String(v) : "";
				}
			});
			settings = { ...settings, ...dbSettings };
		}
	} catch (e) {
		console.error(`[SETTINGS ERROR] ${dbStatus.type}:`, e);
	}
	
	settings._updated = settings.settings_updated_at || "0";
	return settings;
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
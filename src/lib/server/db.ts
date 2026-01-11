import Database from 'better-sqlite3';
import { DB_PATH } from '$env/static/private';

const db = new Database(DB_PATH || 'blog.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    email TEXT,
    is_email_verified INTEGER DEFAULT 0,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_protected INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS post (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    author_id TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES user(id)
  );

  CREATE TABLE IF NOT EXISTS comment (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_verification_token (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  );
`);

// Editor.js用の初期空データ
const emptyEditorData = JSON.stringify({ blocks: [{ type: "paragraph", data: { text: "コンテンツをここに記入してください。" } }] });

const initialSettings = [
	["site_title", "PSANBLOG"],
	["is_site_public", "true"],
	["allow_signup", "true"],
	["allow_comments", "true"],
	["require_email_verification", "false"],
	["enable_turnstile", "false"],
	["home_hero_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "CREATE BETTER CONTENT.", level: 1 } }, { type: "paragraph", data: { text: "あなたの考えを世界に届けましょう。" } }] })],
	["about_page_content", emptyEditorData],
	["error_404_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "404 - Page Not Found", level: 2 } }, { type: "paragraph", data: { text: "お探しのページは見つかりませんでした。" } }] })],
	["error_500_content", JSON.stringify({ blocks: [{ type: "header", data: { text: "500 - Internal Server Error", level: 2 } }, { type: "paragraph", data: { text: "サーバーエラーが発生しました。" } }] })],
	["accent_color", "#00CC99"],
	["is_setup_completed", "false"]
];

const insertSetting = db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)");
initialSettings.forEach(([k, v]) => insertSetting.run(k, v));

export default db;
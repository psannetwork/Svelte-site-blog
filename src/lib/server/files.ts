import db from './db';
import { getSetting } from './settings';
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { generateIdFromEntropySize } from 'lucia';

export interface FileInfo {
	id: string;
	filename: string;
	mime_type: string;
	size: number;
	url: string;
}

/**
 * ファイルを保存する
 */
export async function saveFile(file: File, type: 'avatar' | 'post' | 'icon' | 'misc', userId: string): Promise<FileInfo> {
	const storageType = getSetting('storage_type', 'local');
	const id = generateIdFromEntropySize(15);
	const ext = file.name.split('.').pop()?.toLowerCase();
	const filename = `${Date.now()}-${generateIdFromEntropySize(5)}.${ext}`;
	const mimeType = file.type;
	const size = file.size;
	const buffer = Buffer.from(await file.arrayBuffer());

	if (storageType === 'database') {
		db.prepare(`
			INSERT INTO file_storage (id, filename, mime_type, size, data, storage_type, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`).run(id, filename, mimeType, size, buffer, 'database', Date.now());

		return {
			id,
			filename,
			mime_type: mimeType,
			size,
			url: `/api/files/${id}`
		};
	} else {
		// ローカル保存
		const subDir = type === 'avatar' ? `avatars/${userId}` : type === 'icon' ? 'site' : `posts/${userId}`;
		const relativeDir = join('uploads', subDir);
		const uploadDir = join(process.cwd(), 'static', relativeDir);

		if (!existsSync(uploadDir)) {
			mkdirSync(uploadDir, { recursive: true });
		}

		const filePath = join(uploadDir, filename);
		const relativePath = join(relativeDir, filename);
		
		writeFileSync(filePath, buffer);

		db.prepare(`
			INSERT INTO file_storage (id, filename, mime_type, size, path, storage_type, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`).run(id, filename, mimeType, size, relativePath, 'local', Date.now());

		return {
			id,
			filename,
			mime_type: mimeType,
			size,
			url: `/${relativePath}`
		};
	}
}

/**
 * ファイルを取得する (DB保存用)
 */
export function getFile(id: string) {
	return db.prepare("SELECT * FROM file_storage WHERE id = ?").get(id) as {
		id: string;
		filename: string;
		mime_type: string;
		size: number;
		data: Buffer;
		path: string;
		storage_type: string;
	} | undefined;
}

/**
 * ファイルを削除する
 */
export function deleteFile(id: string) {
	const file = getFile(id);
	if (!file) return;

	if (file.storage_type === 'local' && file.path) {
		const filePath = join(process.cwd(), 'static', file.path);
		if (existsSync(filePath)) {
			unlinkSync(filePath);
		}
	}

	db.prepare("DELETE FROM file_storage WHERE id = ?").run(id);
}

/**
 * 投稿に紐づく画像を削除する (現在は簡略化のため、ユーザー単位のフォルダごと削除するロジックなどは慎重に行う必要がありますが、
 * ここではDBベースの削除を優先的に実装します)
 */
export function cleanupPostImages(postId: string) {
	// 投稿IDに紐づくファイルの追跡が必要な場合は、file_storage に post_id を持たせる必要がありますが、
	// 現在のスキーマでは難しいため、スタブとして残すか、将来的な拡張に備えます。
	console.log(`Cleanup for post ${postId} requested.`);
}

/**
 * ユーザーに紐づく全ファイルを削除する
 */
export function cleanupUserFiles(userId: string) {
	const files = db.prepare("SELECT id FROM file_storage WHERE path LIKE ?").all(`%/${userId}/%`) as { id: string }[];
	for (const file of files) {
		deleteFile(file.id);
	}
}
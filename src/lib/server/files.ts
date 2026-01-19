import db from './db';
import { getSetting } from './settings';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { generateIdFromEntropySize } from 'lucia';

export interface FileInfo {
	id: string;
	filename: string;
	mime_type: string;
	size: number;
	url: string;
}

// ファイル保存
export async function saveFile(
	file: File,
	type: 'avatar' | 'post' | 'icon' | 'misc',
	userId: string
): Promise<FileInfo> {
	const storageType = getSetting('storage_type', 'local');
	const id = generateIdFromEntropySize(15);
	const ext = file.name.split('.').pop()?.toLowerCase();
	const filename = `${Date.now()}-${generateIdFromEntropySize(5)}.${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	const subDir =
		type === 'avatar' ? `avatars/${userId}` : type === 'icon' ? 'site' : `posts/${userId}`;
	const relativeDir = join('uploads', subDir);
	const relativePath = join(relativeDir, filename).replace(/\\/g, '/');

	if (storageType === 'database') {
		db.prepare(
			`INSERT INTO file_storage (id, filename, mime_type, size, data, path, storage_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		).run(id, filename, file.type, file.size, buffer, relativePath, 'database', Date.now());
		return { id, filename, mime_type: file.type, size: file.size, url: `/api/files/${id}` };
	} else {
		const uploadDir = join(process.cwd(), 'static', relativeDir);
		if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
		writeFileSync(join(uploadDir, filename), buffer);
		db.prepare(
			`INSERT INTO file_storage (id, filename, mime_type, size, path, storage_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
		).run(id, filename, file.type, file.size, relativePath, 'local', Date.now());
		return { id, filename, mime_type: file.type, size: file.size, url: `/api/files/${id}` };
	}
}

// ファイル取得
export function getFile(id: string) {
	return db.prepare('SELECT * FROM file_storage WHERE id = ?').get(id) as
		| {
				id: string;
				filename: string;
				mime_type: string;
				size: number;
				data: Buffer;
				path: string;
				storage_type: string;
		  }
		| undefined;
}

// ファイル削除
export function deleteFile(id: string) {
	const file = getFile(id);
	if (!file) return;
	if (file.storage_type === 'local' && file.path) {
		const filePath = join(process.cwd(), 'static', file.path);
		if (existsSync(filePath)) unlinkSync(filePath);
	}
	db.prepare('DELETE FROM file_storage WHERE id = ?').run(id);
}

export function cleanupPostImages(postId: string) {}

// ユーザーの全ファイル削除
export function cleanupUserFiles(userId: string) {
	const files = db
		.prepare('SELECT id FROM file_storage WHERE path LIKE ?')
		.all(`%/${userId}/%`) as { id: string }[];
	for (const file of files) deleteFile(file.id);
}

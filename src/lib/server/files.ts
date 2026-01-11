import { unlinkSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * HTMLコンテンツから /uploads/ 以下のパスをすべて抽出し、ファイルを削除します
 */
export function cleanupPostImages(content: string) {
	const regex = /\/uploads\/posts\/[a-z0-9_-]+\/[a-z0-9._-]+/gi;
	const matches = content.match(regex);
	
	if (matches) {
		matches.forEach(path => {
			const fullPath = join(process.cwd(), 'static', path);
			if (existsSync(fullPath)) {
				try { unlinkSync(fullPath); } catch (e) { console.error('Failed to delete file:', fullPath); }
			}
		});
	}
}

/**
 * ユーザーに関連するすべてのファイルを削除します (アバターと投稿画像)
 */
export function cleanupUserFiles(userId: string) {
	const avatarDir = join(process.cwd(), 'static', 'uploads', 'avatars', userId);
	const postsDir = join(process.cwd(), 'static', 'uploads', 'posts', userId);

	[avatarDir, postsDir].forEach(dir => {
		if (existsSync(dir)) {
			try { rmSync(dir, { recursive: true, force: true }); } catch (e) { console.error('Failed to delete directory:', dir); }
		}
	});
}

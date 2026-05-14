import { getSettings } from '$lib/server/settings';
import { editorJsToHtml } from '$lib/server/editor';
import db from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const prerender = false;

interface PageContent {
    content: string | null;
    raw_json: string | null;
}

export const load: LayoutServerLoad = async ({ locals, depends }) => {
    depends('app:settings');

    const settings = getSettings();

    // データベースからエラーページを一括取得（SQLの最適化）
    const pages = db.prepare("SELECT id, content, raw_json FROM pages WHERE id IN ('error404', 'error500')").all() as { id: string } & PageContent[];
    
    const pageMap = new Map(pages.map(p => [p.id, p]));

    const getHtmlFromPage = (id: string): string => {
        const page = pageMap.get(id);
        if (!page) return '';
        
        // 1. content があればそのまま返す
        if (page.content) return page.content;
        
        // 2. raw_json があれば変換
        if (page.raw_json) {
            try {
                const parsed = JSON.parse(page.raw_json);
                return parsed?.blocks ? editorJsToHtml(parsed.blocks) : '';
            } catch (e) {
                console.error(`[${id} LOAD ERROR] JSON parse failed:`, e);
            }
        }
        return '';
    };

    return {
        user: locals.user,
        settings,
        error404Html: getHtmlFromPage('error404'),
        error500Html: getHtmlFromPage('error500')
    };
};
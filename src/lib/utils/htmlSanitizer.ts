import DOMPurify from 'isomorphic-dompurify';

/**
 * Robust HTML sanitization using DOMPurify
 * Works on both client and server side
 */
export function sanitizeHtml(dirtyHtml: string): string {
	if (!dirtyHtml) return '';

	// style 属性から危険なパターンを削除するカスタムフック
	DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
		if (data.attrName === 'style' && data.attrValue) {
			// XSS 対策：expression, behavior, javascript などをブロック
			if (/expression|behavior|javascript|vbscript|livescript|binding\s*\(/i.test(data.attrValue)) {
				data.attrValue = '';
				data.forceKeepAttr = false;
			}
		}
	});

	return DOMPurify.sanitize(dirtyHtml, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			'strike',
			'del',
			'ins',
			'sup',
			'sub',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'ul',
			'ol',
			'li',
			'a',
			'img',
			'blockquote',
			'pre',
			'code',
			'figure',
			'figcaption',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'div',
			'span',
			'hr',
			'video',
			'audio',
			'iframe'
		],
		ALLOWED_ATTR: [
			'href',
			'src',
			'alt',
			'title',
			'width',
			'height',
			'class',
			'id',
			'style',
			'target',
			'rel',
			'colspan',
			'rowspan',
			'controls',
			'allow',
			'allowfullscreen',
			'frameborder',
			'scrolling',
			'data-element-id'
		],
		// https, mailto, tel, ftp のみ許可。XSS 対策のため javascript: をブロック
		ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
		ADD_ATTR: ['target', 'rel'],
		FORCE_BODY: true
	});
}

/**
 * コメント用の厳格なサニタイズ
 */
export function sanitizeComment(dirtyHtml: string): string {
	if (!dirtyHtml) return '';

	return DOMPurify.sanitize(dirtyHtml, {
		ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
		ALLOWED_ATTR: ['href', 'title', 'target'],
		ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
		ADD_ATTR: ['target'],
		FORCE_BODY: true
	});
}

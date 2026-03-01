import DOMPurify from 'isomorphic-dompurify';

/**
 * Robust HTML sanitization using DOMPurify
 * Works on both client and server side
 */
export function sanitizeHtml(dirtyHtml: string): string {
	if (!dirtyHtml) return '';

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
			'hr'
		],
		ALLOWED_ATTR: [
			'href',
			'src',
			'alt',
			'title',
			'width',
			'height',
			'class',
			'id'
		],
		// https, mailto, tel, ftp のみ許可
		ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
		ADD_ATTR: ['target'],
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

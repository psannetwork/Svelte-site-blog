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
			'hr',
			'iframe' // Allowed for YouTube/Embeds, but should be restricted by CSP
		],
		ALLOWED_ATTR: [
			'href',
			'src',
			'alt',
			'title',
			'target',
			'width',
			'height',
			'style',
			'class',
			'id',
			'colspan',
			'rowspan',
			'controls',
			'poster',
			'frameborder',
			'allowfullscreen',
			'loading',
			'decoding'
		],
		ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
		ADD_ATTR: ['target'],
		FORCE_BODY: true
	});
}

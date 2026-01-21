/**
 * シンプルなHTMLクリーニング関数
 * 安全なHTML要素のみを許可し、危険なスクリプトなどを削除する
 */
export function sanitizeHtml(dirtyHtml: string): string {
	if (typeof DOMPurify !== 'undefined') {
		// DOMPurifyが利用可能な場合、それを使用
		return DOMPurify.sanitize(dirtyHtml, {
			ALLOWED_TAGS: [
				'p', 'br', 'strong', 'em', 'u', 'strike', 'del', 'ins', 'sup', 'sub',
				'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
				'ul', 'ol', 'li',
				'a', 'img',
				'blockquote', 'pre', 'code',
				'figure', 'figcaption',
				'table', 'thead', 'tbody', 'tr', 'th', 'td',
				'div', 'span', 'hr'
			],
			ALLOWED_ATTR: [
				'href', 'src', 'alt', 'title', 'target',
				'width', 'height', 'style', 'class', 'id',
				'colspan', 'rowspan',
				'controls', 'poster'
			],
			FORCE_BODY: true
		});
	} else {
		// DOMPurifyが利用できない場合、基本的な正規表現によるクリーニング
		// 注意：これは完全なセキュリティ対策ではないため、本番環境ではDOMPurifyの使用を推奨
		return dirtyHtml
			.replace(/<(script|link|meta|object|embed|form|input|button|select|textarea)[^>]*>.*?<\/\1>/gi, '')
			.replace(/on\w+="[^"]*"/gi, '')
			.replace(/javascript:/gi, '');
	}
}
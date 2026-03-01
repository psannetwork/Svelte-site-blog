/**
 * Simple HTML to Markdown converter.
 */
export function htmlToMarkdown(html: string): string {
	const div = document.createElement('div');
	div.innerHTML = html;

	function processNode(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent || '';
		}

		if (node.nodeType !== Node.ELEMENT_NODE) {
			return '';
		}

		const element = node as HTMLElement;
		const tagName = element.tagName.toLowerCase();
		let content = '';

		for (const child of Array.from(element.childNodes)) {
			content += processNode(child);
		}

		switch (tagName) {
			case 'h1': return `\n# ${content.trim()}\n`;
			case 'h2': return `\n## ${content.trim()}\n`;
			case 'h3': return `\n### ${content.trim()}\n`;
			case 'b':
			case 'strong': return `**${content}**`;
			case 'i':
			case 'em': return `*${content}*`;
			case 'blockquote': return `\n> ${content.trim().replace(/\n/g, '\n> ')}\n`;
			case 'ul': return `\n${content}\n`;
			case 'ol': {
				let index = 1;
				const items = Array.from(element.children).map(li => {
					const liContent = processNode(li).replace(/^- /, '').trim();
					return `${index++}. ${liContent}`;
				});
				return `\n${items.join('\n')}\n`;
			}
			case 'li': return `- ${content.trim()}\n`;
			case 'hr': return '\n---\n';
			case 'pre': {
				const innerCode = element.querySelector('code');
				const finalContent = innerCode ? innerCode.textContent : content;
				return `\n\`\`\`\n${finalContent}\n\`\`\`\n`;
			}
			case 'code': return `\`${content}\``;
			case 'a': return `[${content}](${element.getAttribute('href')})`;
			case 'img': {
				const src = element.getAttribute('src');
				const alt = element.getAttribute('alt') || '';
				const width = element.style.width || element.getAttribute('width');
				const height = element.style.height || element.getAttribute('height');
				
				if (width || height) {
					const wAttr = width ? ` width="${width.replace('px', '')}"` : '';
					const hAttr = height ? ` height="${height.replace('px', '')}"` : '';
					return `\n<img src="${src}" alt="${alt}"${wAttr}${hAttr}>\n`;
				}
				return `![${alt}](${src})`;
			}
			case 'div':
			case 'p': {
				const trimmed = content.trim();
				return trimmed ? `\n${trimmed}\n` : '';
			}
			case 'br': return '\n';
			default: return content;
		}
	}

	return processNode(div)
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Basic Markdown to HTML converter.
 */
export async function markdownToHtml(md: string): Promise<string> {
	return md
		.replace(/^# (.*$)/gm, '<h1>$1</h1>')
		.replace(/^## (.*$)/gm, '<h2>$1</h2>')
		.replace(/^### (.*$)/gm, '<h3>$1</h3>')
		.replace(/\*\*(.*)\*\*/g, '<b>$1</b>')
		.replace(/\*(.*)\*/g, '<i>$1</i>')
		.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>')
		.replace(/\n/g, '<br>');
}

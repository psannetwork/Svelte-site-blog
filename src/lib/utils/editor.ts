import { sanitizeHtml } from './htmlSanitizer';

export function editorJsToHtml(blocks: any[]) {
	if (!blocks || !Array.isArray(blocks)) return '';
	let html = '';
	let lastBlockJson = '';

	blocks.forEach((block) => {
		try {
			const currentBlockJson = JSON.stringify(block.data);
			if (currentBlockJson === lastBlockJson) return;
			lastBlockJson = currentBlockJson;

			let text = sanitizeHtml(block.data?.text || '');
			const alignment = block.tunes?.anyTuneName?.alignment || 'left';
			const alignClass =
				alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left';

			switch (block.type) {
				case 'header':
					const level = block.data.level || 2;
					const sizes = ['', 'text-5xl', 'text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg'];
					html += `<h${level} class="${sizes[level]} ${alignClass} font-black mt-16 mb-8 tracking-tighter">${text}</h${level}>`;
					break;
				case 'paragraph':
					html += `<p class="leading-relaxed mb-8 opacity-80 font-medium text-lg ${alignClass}">${text}</p>`;
					break;
				case 'list':
					const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
					const listClass = block.data.style === 'ordered' ? 'list-decimal' : 'list-disc';
					const listItems = (block.data.items || [])
						.map((item: any) => {
							const itemText = typeof item === 'string' ? item : item.content || '';
							return `<li>${sanitizeHtml(itemText)}</li>`;
						})
						.join('');
					html += `<${tag} class="${listClass} ml-8 mb-8 space-y-4 font-medium opacity-80 text-lg">${listItems}</${tag}>`;
					break;
				case 'quote':
					html += `<blockquote class="border-l-[12px] border-psan-green pl-10 py-6 italic font-bold my-12 bg-slate-100 dark:bg-slate-800/50 rounded-r-[40px] text-2xl tracking-tight">${text}</blockquote>`;
					break;
				case 'image':
					const widthStyle = block.data.stretched
						? 'width: 100%;'
						: 'width: 70%; max-width: 800px;';
					const imgAlignment = block.tunes?.textAlignment?.alignment || 'center';
					const imageAlignClass =
						imgAlignment === 'left' ? 'image-align-left' : imgAlignment === 'right' ? 'image-align-right' : 'image-align-center';
					const classes = [
						'rounded-[40px] transition-all duration-700 shadow-2xl',
						block.data.withBorder ? 'border-8 border-slate-100 dark:border-slate-800' : '',
						block.data.withBackground ? 'bg-slate-100 dark:bg-slate-800 p-6 md:p-16' : ''
					].join(' ');
					const caption = block.data.caption
						? `<figcaption class="text-center text-xs mt-6 font-black opacity-60 uppercase tracking-widest">${sanitizeHtml(block.data.caption)}</figcaption>`
						: '';
					html += `<figure class="image-wrapper ${imageAlignClass} my-20"><img src="${block.data.file.url}" alt="${sanitizeHtml(block.data.caption || '')}" class="${classes}" style="${widthStyle} height: auto; aspect-ratio: auto;" loading="lazy" decoding="async">${caption}</figure>`;
					break;
				case 'code':
					const escapedCode = (block.data.code || '')
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
						.replace(/"/g, '&quot;')
						.replace(/'/g, '&#039;');
					html += `<div class="code-block-container relative group my-10">
						<div class="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
							<button class="copy-code-btn text-[10px] font-black px-3 py-1.5 rounded-lg backdrop-blur-md uppercase tracking-widest transition-all">Copy</button>
						</div>
						<pre class="overflow-x-auto leading-relaxed"><code>${escapedCode}</code></pre>
					</div>`;
					break;
				case 'warning':
					html += `<div class="bg-amber-50 dark:bg-amber-900/20 border-l-8 border-amber-400 p-8 my-10 rounded-r-3xl"><div class="flex gap-4"><div class="text-amber-400 shrink-0"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div><div class="font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1 text-sm">${sanitizeHtml(block.data.title || 'Attention')}</div><div class="font-medium opacity-80">${sanitizeHtml(block.data.message)}</div></div></div></div>`;
					break;
				case 'embed':
					html += `<figure class="my-20 flex flex-col items-center"><div class="w-full max-w-5xl aspect-video rounded-[40px] overflow-hidden shadow-2xl bg-black border border-white/10"><iframe class="w-full h-full" src="${block.data.embed}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>${block.data.caption ? `<figcaption class="text-center text-xs mt-6 font-black opacity-60 uppercase tracking-widest">${sanitizeHtml(block.data.caption)}</figcaption>` : ''}</figure>`;
					break;
				case 'delimiter':
					html += `<div class="flex justify-center my-16 gap-4"><span class="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="w-2 h-2 rounded-full bg-psan-green"></span><span class="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></span></div>`;
					break;
				case 'raw':
					html += `<div class="raw-html-container my-10">${sanitizeHtml(block.data.html)}</div>`;
					break;
				case 'checklist':
					const checklistItems = (block.data.items || [])
						.map((item: any) => {
							const itemText = typeof item === 'string' ? item : item.text || item.content || '';
							const checked = item.checked ? 'checked' : '';
							return `<div class="flex items-center gap-3 mb-2 font-medium opacity-80 text-lg">
							<input type="checkbox" disabled ${checked} class="w-5 h-5 accent-psan-green">
							<span>${sanitizeHtml(itemText)}</span>
						</div>`;
						})
						.join('');
					html += `<div class="mb-8 ml-2">${checklistItems}</div>`;
					break;
				case 'table':
					const rows = (block.data.content || [])
						.map((row: any[]) => {
							const cells = row
								.map(
									(cell: string) =>
										`<td class="border border-slate-200 dark:border-slate-700 p-4">${sanitizeHtml(cell)}</td>`
								)
								.join('');
							return `<tr>${cells}</tr>`;
						})
						.join('');
					html += `<div class="overflow-x-auto my-10 shadow-xl rounded-2xl border border-slate-100 dark:border-slate-800">
						<table class="w-full text-left border-collapse bg-white dark:bg-slate-900/50">
							${block.data.withHeadings ? `<thead class="bg-slate-50 dark:bg-slate-800 font-black">` : ''}
							${rows}
							${block.data.withHeadings ? `</thead>` : ''}
						</table>
					</div>`;
					break;
				default:
					console.warn(`[RENDER] Unknown block type: ${block.type}`, block);
					break;
			}
		} catch (err) {
			console.error('[RENDER ERROR]', err);
		}
	});
	return html;
}

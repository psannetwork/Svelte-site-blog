export function editorJsToHtml(blocks: any[]) {
	let html = '';
	let lastBlockJson = '';

	blocks.forEach((block) => {
		// 重複防止: 直前のブロックと全く同じ内容ならスキップ
		const currentBlockJson = JSON.stringify(block.data);
		if (currentBlockJson === lastBlockJson) return;
		lastBlockJson = currentBlockJson;

		// インラインタグの許可（脆弱性対策として本来はサニタイズが必要ですが、一旦機能優先で構成します）
		let text = block.data.text || '';
		
		switch (block.type) {
			case 'header':
				const level = block.data.level || 2;
				const sizes = ['', 'text-5xl', 'text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg'];
				html += `<h${level} class="${sizes[level]} font-black mt-16 mb-8 tracking-tighter">${text}</h${level}>`;
				break;
			case 'paragraph':
				// textが未定義またはnullの場合に空文字を保証
				const pText = block.data?.text ?? '';
				html += `<p class="leading-relaxed mb-8 opacity-80 font-medium text-lg">${pText}</p>`;
				break;
			case 'list':
				const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
				const listClass = block.data.style === 'ordered' ? 'list-decimal' : 'list-disc';
				html += `<${tag} class="${listClass} ml-8 mb-8 space-y-4 font-medium opacity-80 text-lg">${block.data.items.map((item: string) => `<li>${item}</li>`).join('')}</${tag}>`;
				break;
			case 'quote':
				html += `<blockquote class="border-l-[12px] border-psan-green pl-10 py-6 italic font-bold my-12 bg-slate-100 dark:bg-slate-800/50 rounded-r-[40px] text-2xl tracking-tight">${text}</blockquote>`;
				break;
			case 'code':
				html += `<pre class="bg-slate-900 text-psan-green p-10 rounded-[32px] overflow-x-auto my-10 font-mono text-sm shadow-2xl border border-white/5"><code>${block.data.code}</code></pre>`;
				break;
			case 'image':
				const classes = [
					'mx-auto rounded-[40px] transition-all duration-700 shadow-2xl',
					block.data.stretched ? 'w-full' : 'max-w-[90%] md:max-w-[70%]',
					block.data.withBorder ? 'border-8 border-slate-100 dark:border-slate-800' : '',
					block.data.withBackground ? 'bg-slate-100 dark:bg-slate-800 p-6 md:p-16' : ''
				].join(' ');
				const caption = block.data.caption ? `<figcaption class="text-center text-xs mt-6 font-black opacity-30 uppercase tracking-widest">${block.data.caption}</figcaption>` : '';
				html += `<figure class="my-20 overflow-hidden"><img src="${block.data.file.url}" alt="${block.data.caption || ''}" class="${classes}">${caption}</figure>`;
				break;
			case 'table':
				let tableHtml = '<div class="overflow-x-auto my-10"><table class="w-full border-collapse border border-slate-200 dark:border-slate-700">';
				block.data.content.forEach((row: string[], i: number) => {
					tableHtml += `<tr class="${i === 0 && block.data.withHeadings ? 'bg-slate-50 dark:bg-slate-800/50' : ''}">`;
					row.forEach((cell) => {
						const tag = i === 0 && block.data.withHeadings ? 'th' : 'td';
						tableHtml += `<${tag} class="border border-slate-200 dark:border-slate-700 p-4 text-left">${cell}</${tag}>`;
					});
					tableHtml += '</tr>';
				});
				tableHtml += '</table></div>';
				html += tableHtml;
				break;
			case 'checklist':
				let checklistHtml = '<ul class="space-y-3 my-8">';
				block.data.items.forEach((item: any) => {
					checklistHtml += `
						<li class="flex items-start gap-3">
							<div class="mt-1 w-5 h-5 rounded border-2 ${item.checked ? 'bg-psan-green border-psan-green' : 'border-slate-300 dark:border-slate-600'} flex items-center justify-center shrink-0">
								${item.checked ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"/></svg>' : ''}
							</div>
							<span class="${item.checked ? 'opacity-50 line-through' : ''}">${item.text}</span>
						</li>`;
				});
				checklistHtml += '</ul>';
				html += checklistHtml;
				break;
			case 'delimiter':
				html += '<div class="flex justify-center my-16 gap-4"><span class="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="w-2 h-2 rounded-full bg-psan-green"></span><span class="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></span></div>';
				break;
			case 'warning':
				html += `
					<div class="bg-amber-50 dark:bg-amber-900/20 border-l-8 border-amber-400 p-8 my-10 rounded-r-3xl">
						<div class="flex gap-4">
							<div class="text-amber-400 shrink-0">
								<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
							</div>
							<div>
								<div class="font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1 text-sm">${block.data.title || 'Attention'}</div>
								<div class="font-medium opacity-80">${block.data.message}</div>
							</div>
						</div>
					</div>`;
				break;
			case 'embed':
				html += `
					<figure class="my-20 flex flex-col items-center">
						<div class="w-full max-w-5xl aspect-video rounded-[40px] overflow-hidden shadow-2xl bg-black border border-white/10">
							<iframe class="w-full h-full" src="${block.data.embed}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen sandbox="allow-scripts allow-same-origin"></iframe>
						</div>
						${block.data.caption ? `<figcaption class="text-center text-xs mt-6 font-black opacity-30 uppercase tracking-widest">${block.data.caption}</figcaption>` : ''}
					</figure>`;
				break;
		}
	});
	return html;
}
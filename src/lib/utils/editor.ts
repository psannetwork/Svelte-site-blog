export function editorJsToHtml(blocks: any[]) {
	if (!blocks || !Array.isArray(blocks)) return '';
	let html = '';
	let lastBlockJson = '';

	blocks.forEach((block) => {
		try {
			const currentBlockJson = JSON.stringify(block.data);
			if (currentBlockJson === lastBlockJson) return;
			lastBlockJson = currentBlockJson;

			let text = block.data?.text || '';
			
			switch (block.type) {
				case 'header':
					const level = block.data.level || 2;
					const sizes = ['', 'text-5xl', 'text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg'];
					html += `<h${level} class="${sizes[level]} font-black mt-16 mb-8 tracking-tighter">${text}</h${level}>`;
					break;
				case 'paragraph':
					html += `<p class="leading-relaxed mb-8 opacity-80 font-medium text-lg">${text}</p>`;
					break;
				case 'list':
					const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
					const listClass = block.data.style === 'ordered' ? 'list-decimal' : 'list-disc';
					html += `<${tag} class="${listClass} ml-8 mb-8 space-y-4 font-medium opacity-80 text-lg">${block.data.items.map((item: string) => `<li>${item}</li>`).join('')}</${tag}>`;
					break;
				case 'quote':
					html += `<blockquote class="border-l-[12px] border-psan-green pl-10 py-6 italic font-bold my-12 bg-slate-100 dark:bg-slate-800/50 rounded-r-[40px] text-2xl tracking-tight">${text}</blockquote>`;
					break;
				case 'image':
					// 視覚的リサイズ: stretched (全幅), withBorder (枠線), withBackground (背景) を組み合わせて表現
					// stretched が true の場合は 100%, false の場合は 70% (中央寄せ)
					const widthStyle = block.data.stretched ? 'width: 100%;' : 'width: 70%; max-width: 800px;';
					const classes = [
						'mx-auto rounded-[40px] transition-all duration-700 shadow-2xl',
						block.data.withBorder ? 'border-8 border-slate-100 dark:border-slate-800' : '',
						block.data.withBackground ? 'bg-slate-100 dark:bg-slate-800 p-6 md:p-16' : ''
					].join(' ');
					const caption = block.data.caption ? `<figcaption class="text-center text-xs mt-6 font-black opacity-30 uppercase tracking-widest">${block.data.caption}</figcaption>` : '';
					html += `<figure class="my-20 overflow-hidden flex flex-col items-center"><img src="${block.data.file.url}" alt="${block.data.caption || ''}" class="${classes}" style="${widthStyle} height: auto; aspect-ratio: auto;">${caption}</figure>`;
					break;
				case 'code':
					html += `<pre class="bg-slate-900 text-psan-green p-10 rounded-[32px] overflow-x-auto my-10 font-mono text-sm shadow-2xl border border-white/5"><code>${block.data.code}</code></pre>`;
					break;
				case 'warning':
					html += `<div class="bg-amber-50 dark:bg-amber-900/20 border-l-8 border-amber-400 p-8 my-10 rounded-r-3xl"><div class="flex gap-4"><div class="text-amber-400 shrink-0"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div><div class="font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1 text-sm">${block.data.title || 'Attention'}</div><div class="font-medium opacity-80">${block.data.message}</div></div></div></div>`;
					break;
				case 'embed':
					html += `<figure class="my-20 flex flex-col items-center"><div class="w-full max-w-5xl aspect-video rounded-[40px] overflow-hidden shadow-2xl bg-black border border-white/10"><iframe class="w-full h-full" src="${block.data.embed}" frameborder="0" allowfullscreen></iframe></div>${block.data.caption ? `<figcaption class="text-center text-xs mt-6 font-black opacity-30 uppercase tracking-widest">${block.data.caption}</figcaption>` : ''}</figure>`;
					break;
				case 'delimiter':
					html += `<div class="flex justify-center my-16 gap-4"><span class="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="w-2 h-2 rounded-full bg-psan-green"></span><span class="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></span></div>`;
					break;
			}
		} catch (err) {
			console.error('[RENDER ERROR]', err);
		}
	});
	return html;
}
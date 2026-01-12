export function editorJsToHtml(blocks: any[]) {
	let html = '';
	blocks.forEach((block) => {
		// インラインタグの許可（脆弱性対策として本来はサニタイズが必要ですが、一旦機能優先で構成します）
		let text = block.data.text || '';
		
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
			case 'embed':
				html += `
					<figure class="my-20 flex flex-col items-center">
						<div class="w-full max-w-5xl aspect-video rounded-[40px] overflow-hidden shadow-2xl bg-black border border-white/10">
							<iframe class="w-full h-full" src="${block.data.embed}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen sandbox="allow-scripts allow-same-origin"></iframe>
						</div>
						${block.data.caption ? `<figcaption class="text-center text-xs mt-6 font-black opacity-30 uppercase tracking-widest">${block.data.caption}</figcaption>` : ''}
					</figure>`;
				break;
			case 'widget':
				// 特別なマーカーを出力。Svelte側でコンポーネントに置換される
				html += `[[WIDGET:${block.data.name}]]`;
				break;
		}
	});
	return html;
}
<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { editorI18n } from '$lib/utils/editor_i18n';
	import { theme } from '$lib/theme.svelte';
	
	let { data, form } = $props();
	
	let formElement: HTMLFormElement;
	let isSaving = $state(false);
	let isRefreshing = $state(false);
	let showSuccess = $state(false);
	let isUploadingIcon = $state(false);

	// 初期値を保持（ユーザーの変更検知用）
	const baseSettings = { ...data.settings };

	let siteTitle = $state(data.settings?.site_title || '');
	let siteDescription = $state(data.settings?.site_description || '');
	let accentColor = $state(data.settings?.accent_color || '#00CC99');
	let siteLanguage = $state(data.settings?.site_language || 'ja');
	let allowedExtensions = $state(data.settings?.allowed_extensions || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico');
	let siteIconUrl = $state(data.settings?.site_icon_url || '');

	let userEdited = $state<Record<string, boolean>>({});
	let lastSyncTime = $state(parseInt(data.settings?._updated || '0'));

	function markEdited(key: string) {
		userEdited[key] = true;
	}

	async function refreshSettings() {
		if (isRefreshing || isSaving) return;
		isRefreshing = true;
		try {
			const res = await fetch('/api/settings');
			const result = await res.json();
			if (result.success && result.settings) {
				const s = result.settings;
				const newTime = parseInt(s._updated || '0');
				
				if (newTime > lastSyncTime) {
					let changed = false;
					
					const sync = (key: string, current: any, remote: any, setter: (v: any) => void) => {
						// ユーザーが一度も触っておらず、かつ現在の値が初期ロード時と同じなら更新
						if (!userEdited[key] && current === (baseSettings[key] || '')) {
							setter(remote);
							changed = true;
						}
					};

					sync('site_title', siteTitle, s.site_title, v => siteTitle = v);
					sync('site_description', siteDescription, s.site_description, v => siteDescription = v);
					sync('accent_color', accentColor, s.accent_color, v => accentColor = v);
					sync('site_language', siteLanguage, s.site_language, v => siteLanguage = v);
					sync('site_icon_url', siteIconUrl, s.site_icon_url, v => siteIconUrl = v);

					Object.entries(editors).forEach(([id, e]) => {
						const key = id === 'home' ? 'home_hero_content' : id === 'about' ? 'about_page_content' : id === 'error404' ? 'error_404_content' : 'error_500_content';
						const content = s[key];
						
						if (e.instance && content && !e.instance.isFocused && !isSaving) {
							try {
								const parsed = JSON.parse(content);
								e.instance.isReady.then(async () => {
									const cur = await e.instance.save();
									if (JSON.stringify(cur.blocks) !== JSON.stringify(parsed.blocks)) {
										await e.instance.render(parsed);
										changed = true;
									}
								});
							} catch (err) {}
						}
					});
					
					lastSyncTime = newTime;
					if (changed) console.log('[SETTINGS] Data synced.');
				}
			}
		} catch (err) {
		} finally {
			isRefreshing = false;
		}
	}

	let editors = $state({
		home: { data: '', instance: null as any, holder: 'editor-home' },
		about: { data: '', instance: null as any, holder: 'editor-about' },
		error404: { data: '', instance: null as any, holder: 'editor-404' },
		error500: { data: '', instance: null as any, holder: 'editor-500' }
	});

	const isRendering = new Set<string>();

	$effect(() => {
		const s = data.settings;
		if (s && Object.keys(s).length > 1) {
			const newTime = parseInt(s._updated || '0');
			if (newTime > lastSyncTime) {
				siteTitle = s.site_title || '';
				siteDescription = s.site_description || '';
				accentColor = s.accent_color || '#00CC99';
				siteLanguage = s.site_language || 'ja';
				allowedExtensions = s.allowed_extensions || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico';
				siteIconUrl = s.site_icon_url || '';

				Object.entries(editors).forEach(([id, e]) => {
					const key = id === 'home' ? 'home_hero_content' : id === 'about' ? 'about_page_content' : id === 'error404' ? 'error_404_content' : 'error_500_content';
					const content = s[key];
					if (e.instance && content && !isRendering.has(id)) {
						try {
							const parsed = JSON.parse(content);
							if (!parsed.blocks || parsed.blocks.length === 0) return;
							isRendering.add(id);
							e.instance.isReady.then(async () => {
								const cur = await e.instance.save();
								if (JSON.stringify(cur.blocks) !== JSON.stringify(parsed.blocks)) {
									await e.instance.render(parsed);
								}
							}).finally(() => isRendering.delete(id));
						} catch (err) { isRendering.delete(id); }
					}
				});
				lastSyncTime = newTime;
			}
		}
	});

	async function handleIconUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		isUploadingIcon = true;
		const formData = new FormData();
		formData.append('image', file);
		try {
			const res = await fetch('/api/upload?type=icon', { method: 'POST', body: formData });
			const result = await res.json();
			if (result.success) siteIconUrl = result.file.url;
		} catch (err) {
		} finally { isUploadingIcon = false; }
	}

	async function initEditor(id: keyof typeof editors, initialData: string) {
		const e = editors[id];
		if (!document.getElementById(e.holder) || e.instance) return;

		const EditorJS = (await import('@editorjs/editorjs')).default;
		const Header = (await import('@editorjs/header')).default;
		const List = (await import('@editorjs/list')).default;
		const Image = (await import('@editorjs/image')).default;
		const Marker = (await import('@editorjs/marker')).default;
		const Quote = (await import('@editorjs/quote')).default;
		const Code = (await import('@editorjs/code')).default;
		const Table = (await import('@editorjs/table')).default;
		const Checklist = (await import('@editorjs/checklist')).default;
		const Warning = (await import('@editorjs/warning')).default;
		const Delimiter = (await import('@editorjs/delimiter')).default;
		const InlineCode = (await import('@editorjs/inline-code')).default;
		const Underline = (await import('@editorjs/underline')).default;
		const ColorPlugin = (await import('editorjs-text-color-plugin')).default;
		const Undo = (await import('editorjs-undo')).default;

		let parsedData: { blocks: any[] } = { blocks: [] };
		try {
			if (initialData) {
				const data = JSON.parse(initialData);
				if (data && data.blocks) parsedData = data;
			}
		} catch (err) {}

		if (parsedData.blocks.length === 0) {
			parsedData.blocks.push({ type: 'paragraph', data: { text: '' } });
		}

		e.instance = new EditorJS({
			holder: e.holder,
			i18n: siteLanguage === 'ja' ? editorI18n : undefined,
			tools: {
				header: Header, list: List, marker: Marker, quote: Quote, code: Code,
				table: Table, checklist: Checklist, warning: Warning, delimiter: Delimiter,
				inlineCode: InlineCode, underline: Underline,
				color: { class: ColorPlugin, config: { colorCollections: ['#00CC99', '#EB2D8C', '#1A1A1A', '#FF1313', '#2388FF', '#FFD300'], type: 'text', customPicker: true } },
				image: { class: Image, config: { endpoints: { byFile: '/api/upload' } } }
			},
			onReady: () => { new Undo({ editor: e.instance }); },
			data: parsedData,
			placeholder: '構成中...',
			defaultBlock: 'paragraph'
		});
	}

	async function saveAll() {
		if (isSaving) return;
		isSaving = true;
		try {
			const updates: Record<string, string> = {
				site_title: siteTitle,
				site_description: siteDescription,
				accent_color: accentColor,
				site_language: siteLanguage,
				allowed_extensions: allowedExtensions,
				site_icon_url: siteIconUrl,
				custom_css: (document.getElementById('custom_css') as HTMLTextAreaElement)?.value || '',
				is_site_public: (formElement.querySelector('[name="is_site_public"]') as HTMLInputElement)?.checked ? 'false' : 'true',
				allow_signup: (formElement.querySelector('[name="allow_signup"]') as HTMLInputElement)?.checked ? 'true' : 'false',
				allow_comments: (formElement.querySelector('[name="allow_comments"]') as HTMLInputElement)?.checked ? 'true' : 'false',
				allow_anonymous_comments: (formElement.querySelector('[name="allow_anonymous_comments"]') as HTMLInputElement)?.checked ? 'true' : 'false',
				allow_account_deletion: (formElement.querySelector('[name="allow_account_deletion"]') as HTMLInputElement)?.checked ? 'true' : 'false',
				show_footer_auth: (formElement.querySelector('[name="show_footer_auth"]') as HTMLInputElement)?.checked ? 'true' : 'false',
				anonymous_name: (document.getElementById('anonymous_name') as HTMLInputElement)?.value || 'Anonymous',
				enable_turnstile: (formElement.querySelector('[name="enable_turnstile"]') as HTMLInputElement)?.checked ? 'true' : 'false',
				turnstile_site_key: (document.getElementById('turnstile_site_key') as HTMLInputElement)?.value || '',
				turnstile_secret_key: (document.getElementById('turnstile_secret_key') as HTMLInputElement)?.value || ''
			};

			const savePromises = Object.entries(editors).map(async ([id, e]) => {
				if (e.instance) {
					const saved = await e.instance.save();
					const key = id === 'home' ? 'home_hero_content' : id === 'about' ? 'about_page_content' : id === 'error404' ? 'error_404_content' : 'error_500_content';
					updates[key] = JSON.stringify(saved);
				}
			});
			await Promise.all(savePromises);

			const res = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});
			
			const result = await res.json();
			if (result.success && result.settings) {
				const s = result.settings;
				lastSyncTime = parseInt(s._updated || '0');
				userEdited = {};
				showSuccess = true;
				setTimeout(() => showSuccess = false, 3000);
				await invalidateAll();
			}
		} catch (e) {
		} finally { isSaving = false; }
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			saveAll();
		}
	}

	onMount(() => {
		setTimeout(() => {
			initEditor('home', data.settings?.home_hero_content || '');
			initEditor('about', data.settings?.about_page_content || '');
			initEditor('error404', data.settings?.error_404_content || '');
			initEditor('error500', data.settings?.error_500_content || '');
			setTimeout(refreshSettings, 1000);
		}, 200);
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			Object.values(editors).forEach(e => {
				if (e.instance) {
					const inst = e.instance;
					if (typeof inst.destroy === 'function') {
						inst.isReady.then(() => inst.destroy()).catch(() => {});
					}
				}
			});
		};
	});
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div>
			<h2 class="text-3xl md:text-4xl font-black tracking-tighter uppercase text-main">System Settings</h2>
			<p class="text-sm text-muted font-bold">全機能を管理します。</p>
		</div>
		<div class="flex gap-3">
			<a href="/dashboard" class="btn-psan-ghost text-xs px-6 py-2">Cancel</a>
			<button onclick={saveAll} class="btn-psan-primary text-xs px-8 py-2" disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save All Changes'}
			</button>
		</div>
	</header>

	<div class="space-y-12 pb-32">
		<section class="card-psan p-8 space-y-4 border-2 {dbStatus.type === 'turso' ? 'border-psan-green/30' : 'border-slate-200'} shadow-sm">
			<div class="flex items-center justify-between">
				<h3 class="text-xl font-black text-main uppercase tracking-tighter italic">Database Status</h3>
				<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest 
					{dbStatus.type === 'turso' ? 'bg-psan-green text-white' : 'bg-slate-100 dark:bg-slate-800 text-muted'}">
					{dbStatus.type}
				</span>
			</div>
			<div class="flex flex-col md:flex-row md:items-center gap-4 text-xs font-bold">
				<div class="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
					<span class="text-[10px] text-muted uppercase block mb-1">Connection Details</span>
					<code class="text-psan-green break-all">{dbStatus.type === 'turso' ? dbStatus.url : dbStatus.path}</code>
				</div>
				<div class="flex-none text-muted leading-relaxed">
					{#if dbStatus.type === 'turso'}
						<p>✅ リモートデータベース (Turso) 接続中。</p>
					{:else}
						<p>🏠 ローカルデータベース使用中。</p>
					{/if}
				</div>
			</div>
		</section>

		{#if form?.success && form?.message}
			<div class="bg-psan-green/10 border-2 border-psan-green text-psan-green p-6 rounded-[32px] animate-in zoom-in duration-300">
				<div class="flex items-center gap-4">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
					<div>
						<p class="font-black uppercase tracking-widest text-sm">Action Successful</p>
						<p class="font-bold text-xs opacity-80">{form.message}</p>
					</div>
				</div>
			</div>
		{/if}

		<form bind:this={formElement} onsubmit={(e) => e.preventDefault()} class="space-y-12">
			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Identity</h3>
				<div class="grid md:grid-cols-2 gap-6">
					<div class="space-y-2">
						<label for="accent_color" class="text-[10px] font-black text-muted uppercase">Accent Color</label>
						<input id="accent_color" name="accent_color" type="color" bind:value={accentColor} oninput={() => markEdited('accent_color')} class="w-full h-14" />
					</div>
					<div class="space-y-2">
						<label for="site_language" class="text-[10px] font-black text-muted uppercase">Site Language</label>
						<select name="site_language" bind:value={siteLanguage} onchange={() => markEdited('site_language')} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main">
							<option value="ja">日本語 (Japanese)</option>
							<option value="en">English</option>
						</select>
					</div>
					<div class="space-y-2">
						<label for="site_description" class="text-[10px] font-black text-muted uppercase">Site Description (SEO)</label>
						<input id="site_description" name="site_description" bind:value={siteDescription} oninput={() => markEdited('site_description')} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" />
					</div>
				</div>
				<div class="space-y-2">
					<label for="allowed_extensions" class="text-[10px] font-black text-muted uppercase">許可するファイル拡張子</label>
					<input id="allowed_extensions" name="allowed_extensions" bind:value={allowedExtensions} oninput={() => markEdited('allowed_extensions')} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main" />
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Tab & Appearance</h3>
				<div class="grid md:grid-cols-2 gap-8">
					<div class="space-y-6">
						<div class="space-y-2">
							<label for="site_title" class="text-[10px] font-black text-muted uppercase">Tab Title (Site Title)</label>
							<input id="site_title" name="site_title" bind:value={siteTitle} oninput={() => markEdited('site_title')} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" />
						</div>
						<div class="space-y-4">
							<span class="text-[10px] font-black text-muted uppercase">Tab Icon (Favicon)</span>
							<div class="flex items-center gap-6">
								<div class="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-none flex items-center justify-center overflow-hidden shadow-sm">
									{#if siteIconUrl}
										<img src={siteIconUrl} alt="Site Icon" class="w-full h-full object-contain p-2" />
									{:else}
										<span class="text-xs font-bold text-muted opacity-50">No Icon</span>
									{/if}
								</div>
								<div class="flex-1">
									<label class="btn-psan-ghost py-2 text-xs w-full cursor-pointer dark:bg-slate-700 dark:text-white dark:border-slate-500">
										{isUploadingIcon ? 'Uploading...' : 'Upload Icon'}
										<input type="file" accept="image/*" class="hidden" onchange={handleIconUpload} disabled={isUploadingIcon} />
									</label>
									<input type="hidden" name="site_icon_url" value={siteIconUrl} />
								</div>
							</div>
						</div>
					</div>
					<div class="space-y-2">
						<label for="custom_css" class="text-[10px] font-black text-muted uppercase">Custom CSS</label>
						<textarea id="custom_css" name="custom_css" rows="8" oninput={() => markEdited('custom_css')} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main resize-y" value={data.settings?.custom_css || ''}></textarea>
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Security & Spam Protection</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<label class="flex items-center justify-between p-6 bg-psan-green/5 border border-psan-green/20 rounded-3xl cursor-pointer">
						<div class="space-y-1">
							<span class="text-sm font-black text-main uppercase">Cloudflare Turnstile</span>
							<p class="text-[10px] text-muted font-bold">ボット防止。</p>
						</div>
						<input type="checkbox" name="enable_turnstile" checked={data.settings?.enable_turnstile === 'true'} onchange={() => markEdited('enable_turnstile')} class="w-6 h-6 accent-psan-green" />
					</label>
					<div class="space-y-4">
						<input id="turnstile_site_key" name="turnstile_site_key" oninput={() => markEdited('turnstile_site_key')} value={data.settings?.turnstile_site_key || ''} class="w-full bg-secondary dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-main" placeholder="Site Key" />
						<input id="turnstile_secret_key" name="turnstile_secret_key" type="password" oninput={() => markEdited('turnstile_secret_key')} value={data.settings?.turnstile_secret_key || ''} class="w-full bg-secondary dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-main" placeholder="Secret Key" />
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-pink italic uppercase">Access Control</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-2xl cursor-pointer text-main">
						<span class="text-xs font-bold">ログイン強制</span>
						<input type="checkbox" name="is_site_public" checked={data.settings?.is_site_public === 'false'} onchange={() => markEdited('is_site_public')} class="w-6 h-6 accent-psan-pink" />
					</label>
					{#each [
						{ id: 'allow_signup', label: '新規登録許可' },
						{ id: 'allow_comments', label: 'コメント許可' },
						{ id: 'allow_anonymous_comments', label: '匿名コメント許可' },
						{ id: 'allow_account_deletion', label: '退会許可' },
						{ id: 'show_footer_auth', label: 'フッターログイン表示' }
					] as item}
						<label class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-2xl cursor-pointer text-main">
							<span class="text-xs font-bold">{item.label}</span>
							<input type="checkbox" name={item.id} checked={data.settings?.[item.id] === 'true'} onchange={() => markEdited(item.id)} class="w-5 h-5 accent-psan-green" />
						</label>
					{/each}
					<input id="anonymous_name" name="anonymous_name" value={data.settings?.anonymous_name || 'Anonymous'} oninput={() => markEdited('anonymous_name')} class="w-full bg-white dark:bg-slate-900 border-none rounded-lg p-2 text-sm font-bold text-main" />
				</div>
			</section>

			<div class="space-y-8">
				<div class="card-psan p-8 space-y-6"><h3 class="text-xl font-black italic uppercase">Home Page</h3><div id="editor-home" class="text-main bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-200 dark:border-slate-800"></div></div>
				<div class="card-psan p-8 space-y-6"><h3 class="text-xl font-black italic uppercase">About Page</h3><div id="editor-about" class="text-main bg-white dark:bg-slate-900 rounded-[32px] p-4 border border-slate-200 dark:border-slate-800"></div></div>
			</div>
		</form>
	</div>
</div>

<style>
	:global(.ce-block__content) { max-width: 100%; }
	:global(.ce-toolbar__content) { max-width: 100%; }
</style>

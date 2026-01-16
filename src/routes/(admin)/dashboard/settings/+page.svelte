<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidateAll, invalidate } from '$app/navigation';
	import { editorI18n } from '$lib/utils/editor_i18n';
	
	let { data, form } = $props();
	const { settings: initialSettings, dbStatus } = data;
	
	let formElement: HTMLFormElement;
	let isSaving = $state(false);
	let isRefreshing = $state(false); // 保険の取得中フラグ
	let showSuccess = $state(false);
	let isUploadingIcon = $state(false);

	// 設定項目のローカルステート
	let siteTitle = $state(initialSettings?.site_title || '');
	let siteDescription = $state(initialSettings?.site_description || '');
	let accentColor = $state(initialSettings?.accent_color || '#00CC99');
	let siteLanguage = $state(initialSettings?.site_language || 'ja');
	let allowedExtensions = $state(initialSettings?.allowed_extensions || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico');
	let siteIconUrl = $state(initialSettings?.site_icon_url || '');

	// 最後に反映したデータのタイムスタンプを保持
	let lastSyncTime = $state(parseInt(initialSettings?._updated || '0'));

	// 【保険】API経由で最新の設定を取得して反映する関数
	async function refreshSettings() {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			const res = await fetch('/api/settings');
			const result = await res.json();
			if (result.success && result.settings) {
				const s = result.settings;
				const newTime = parseInt(s._updated || '0');
				
				// サーバー側のデータが現在の手元データより新しい場合のみ反映
				if (newTime > lastSyncTime) {
					siteTitle = s.site_title || '';
					siteDescription = s.site_description || '';
					accentColor = s.accent_color || '#00CC99';
					siteLanguage = s.site_language || 'ja';
					allowedExtensions = s.allowed_extensions || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico';
					siteIconUrl = s.site_icon_url || '';
					
					// エディタの内容も更新
					Object.entries(editors).forEach(([id, e]) => {
						const key = id === 'home' ? 'home_hero_content' : 
						            id === 'about' ? 'about_page_content' : 
						            id === 'error404' ? 'error_404_content' : 'error_500_content';
						const content = s[key];
						if (e.instance && content) {
							try {
								const parsed = JSON.parse(content);
								e.instance.isReady.then(() => e.instance.render(parsed));
							} catch (err) {}
						}
					});
					lastSyncTime = newTime;
					console.log('[SETTINGS] Insurance: Data refreshed from API.');
				}
			}
		} catch (err) {
			console.error('[SETTINGS] Refresh failed', err);
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

	// レンダリング中の排他制御用フラグ
	const isRendering = new Set<string>();

	// サーバーからのデータ（data.settings）が更新されたら、ローカルステートとエディタを更新
	$effect(() => {
		const s = data.settings;
		if (s && Object.keys(s).length > 1) {
			const newTime = parseInt(s._updated || '0');
			
			// サーバー側のデータが現在の手元データより新しい場合のみ反映
			if (newTime > lastSyncTime) {
				siteTitle = s.site_title || '';
				siteDescription = s.site_description || '';
				accentColor = s.accent_color || '#00CC99';
				siteLanguage = s.site_language || 'ja';
				allowedExtensions = s.allowed_extensions || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico';
				siteIconUrl = s.site_icon_url || '';

				// 各エディタに最新データを再描画
				Object.entries(editors).forEach(([id, e]) => {
					const key = id === 'home' ? 'home_hero_content' : 
					            id === 'about' ? 'about_page_content' : 
					            id === 'error404' ? 'error_404_content' : 'error_500_content';
					const content = s[key];
					
					if (e.instance && content && !isRendering.has(id)) {
						try {
							const parsed = JSON.parse(content);
							if (!parsed.blocks || parsed.blocks.length === 0) return;

							isRendering.add(id);
							e.instance.isReady.then(async () => {
								const currentData = await e.instance.save();
								if (JSON.stringify(currentData.blocks) !== JSON.stringify(parsed.blocks)) {
									await e.instance.render(parsed);
								}
							}).catch((err: any) => {}).finally(() => {
								isRendering.delete(id);
							});
						} catch (err) {
							isRendering.delete(id);
						}
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
			if (result.success) {
				siteIconUrl = result.file.url;
			}
		} catch (err) {
			console.error('Upload failed', err);
		} finally {
			isUploadingIcon = false;
		}
	}

	async function initEditor(id: keyof typeof editors, initialData: string) {
		const e = editors[id];
		const el = document.getElementById(e.holder);
		if (!el || e.instance) return;

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

		const editor = new EditorJS({
			holder: e.holder,
			i18n: siteLanguage === 'ja' ? editorI18n : undefined,
			tools: {
				header: Header, list: List, marker: Marker, quote: Quote, code: Code,
				table: Table, checklist: Checklist, warning: Warning, delimiter: Delimiter,
				inlineCode: InlineCode, underline: Underline,
				color: { class: ColorPlugin, config: { colorCollections: ['#00CC99', '#EB2D8C', '#1A1A1A', '#FF1313', '#2388FF', '#FFD300'], type: 'text', customPicker: true } },
				image: { class: Image, config: { endpoints: { byFile: '/api/upload' } } }
			},
			onReady: () => { new Undo({ editor }); },
			data: parsedData,
			placeholder: 'Start building...',
			defaultBlock: 'paragraph'
		});
		editors[id].instance = editor;
	}

	async function saveAll() {
		if (isSaving) return;
		isSaving = true;
		try {
			const savePromises = Object.entries(editors).map(async ([id, e]) => {
				if (e.instance) {
					const saved = await e.instance.save();
					editors[id as keyof typeof editors].data = JSON.stringify(saved);
				}
			});
			await Promise.all(savePromises);
			setTimeout(() => { formElement?.requestSubmit(); }, 100);
		} catch (e) {
			console.error('Failed to save settings:', e);
			isSaving = false;
		}
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
			
			// 初回読み込み時の保険: 1秒後に最新設定を再取得
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

<svelte:head>
	<title>System Settings | {siteTitle || 'Admin'}</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div>
			<h2 class="text-3xl md:text-4xl font-black tracking-tighter uppercase text-main">System Settings</h2>
			<p class="text-sm text-muted font-bold">すべての機能をここから管理します。</p>
		</div>
		<div class="flex gap-3">
			<a href="/dashboard" class="btn-psan-ghost text-xs px-6 py-2">Cancel</a>
			<button onclick={saveAll} class="btn-psan-primary text-xs px-8 py-2" disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save All Changes'}
			</button>
		</div>
	</header>

	<div class="space-y-12 pb-32">
		<!-- Database Status -->
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
						<p>✅ リモートデータベース (Turso) に正常に接続されています。</p>
					{:else}
						<p>🏠 ローカルの SQLite データベースを使用中です。</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- メッセージ表示エリア -->
		{#if form?.success && form?.message}
			<div class="bg-psan-green/10 border-2 border-psan-green text-psan-green p-6 rounded-[32px] animate-in zoom-in duration-300">
				<div class="flex items-center gap-4">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
					<div>
						<p class="font-black uppercase tracking-widest text-sm">Action Successful</p>
						<p class="font-bold text-xs opacity-80">{form.message}</p>
					</div>
				</div>
			</div>
		{/if}

		<form bind:this={formElement} method="POST" action="?/saveSettings" use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					isSaving = false;
					showSuccess = true;
					await invalidate('app:settings');
					await invalidateAll();
					// 保存から少し遅らせて最新データを再取得（保険）
					setTimeout(refreshSettings, 2000);
					setTimeout(() => showSuccess = false, 3000);
					await update({ reset: false });
				} else {
					await update();
					isSaving = false;
				}
			};
		}} class="space-y-12">
			
			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Identity</h3>
				<div class="grid md:grid-cols-2 gap-6">
					<div class="space-y-2">
						<label for="accent_color" class="text-[10px] font-black text-muted uppercase">Accent Color</label>
						<input id="accent_color" name="accent_color" type="color" bind:value={accentColor} class="w-full h-14" />
					</div>
					<div class="space-y-2">
						<label for="site_language" class="text-[10px] font-black text-muted uppercase">Site Language</label>
						<select name="site_language" bind:value={siteLanguage} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main">
							<option value="ja">日本語 (Japanese)</option>
							<option value="en">English</option>
						</select>
					</div>
					<div class="space-y-2">
						<label for="site_description" class="text-[10px] font-black text-muted uppercase">Site Description (SEO)</label>
						<input id="site_description" name="site_description" bind:value={siteDescription} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" />
					</div>
				</div>

				<div class="space-y-2">
					<label for="allowed_extensions" class="text-[10px] font-black text-muted uppercase">許可するファイル拡張子</label>
					<input id="allowed_extensions" name="allowed_extensions" bind:value={allowedExtensions} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main" />
					<p class="text-[10px] text-muted">カンマ区切りで入力（例：.jpg,.png）</p>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Tab & Appearance</h3>
				<div class="grid md:grid-cols-2 gap-8">
					<div class="space-y-6">
						<div class="space-y-2">
							<label for="site_title" class="text-[10px] font-black text-muted uppercase">Tab Title (Site Title)</label>
							<input id="site_title" name="site_title" bind:value={siteTitle} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" placeholder="My Awesome Blog" />
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
						<textarea id="custom_css" name="custom_css" rows="8" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main resize-y" value={data.settings?.custom_css || ''}></textarea>
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Storage Strategy</h3>
				<div class="p-6 bg-psan-green/5 border border-psan-green/20 rounded-[32px] space-y-6">
					{#if dbStatus.type === 'turso'}
						<div class="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs font-bold mb-4">
							<p>💡 **Turso を使用中の方へ**: 保存先を **"SQLite Database"** に設定することを強くおすすめします。</p>
						</div>
					{/if}
					<select name="storage_type" class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl text-xs font-black p-3 text-main dark:text-white">
						<option value="local" selected={data.settings?.storage_type === 'local'}>Local Filesystem</option>
						<option value="database" selected={data.settings?.storage_type === 'database'}>SQLite Database</option>
					</select>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6 border-psan-pink/20 border-2">
				<h3 class="text-xl font-black text-psan-pink italic uppercase">Access Control</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-2xl cursor-pointer text-main">
						<span class="text-xs font-bold">ログインを強制する (非公開サイト)</span>
						<input type="checkbox" name="is_site_public" checked={data.settings?.is_site_public === 'false'} class="w-6 h-6 accent-psan-pink" />
					</label>
					{#each [
						{ id: 'allow_signup', label: '新規登録を許可' },
						{ id: 'allow_comments', label: 'コメントを許可' },
						{ id: 'allow_anonymous_comments', label: '匿名コメントを許可' },
						{ id: 'allow_account_deletion', label: 'ユーザーによる退会を許可' },
						{ id: 'show_footer_auth', label: 'フッターにログイン表示' }
					] as item}
						<label class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-2xl cursor-pointer text-main">
							<span class="text-xs font-bold">{item.label}</span>
							<input type="checkbox" name={item.id} checked={data.settings?.[item.id] === 'true'} class="w-5 h-5 accent-psan-green" />
						</label>
					{/each}
					<div class="p-4 bg-secondary dark:bg-slate-800 rounded-2xl space-y-2 text-main">
						<label for="anonymous_name" class="text-[10px] font-black text-muted uppercase">匿名ユーザーの表示名</label>
						<input id="anonymous_name" name="anonymous_name" value={data.settings?.anonymous_name || 'Anonymous'} class="w-full bg-white dark:bg-slate-900 border-none rounded-lg p-2 text-sm font-bold text-main" />
					</div>
				</div>
			</section>

			<div class="space-y-8">
				<div class="flex items-center gap-4 mb-4">
					<h3 class="text-2xl font-black text-main uppercase tracking-tighter italic">Page Contents</h3>
					<div class="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
				</div>
				<div class="card-psan p-8 space-y-6">
					<h3 class="text-xl font-black text-psan-green italic uppercase">Home Page Hero</h3>
					<div class="bg-white dark:bg-slate-900 rounded-[32px] p-4 md:p-8 border border-slate-200 dark:border-slate-800 shadow-inner">
						<div id="editor-home" class="text-main"></div>
					</div>
					<input type="hidden" name="home_hero_content" value={editors.home.data} />
				</div>
				<div class="card-psan p-8 space-y-6">
					<h3 class="text-xl font-black text-psan-pink italic uppercase">About Page</h3>
					<div class="bg-white dark:bg-slate-900 rounded-[32px] p-4 md:p-8 border border-slate-200 dark:border-slate-800 shadow-inner">
						<div id="editor-about" class="text-main"></div>
					</div>
					<input type="hidden" name="about_page_content" value={editors.about.data} />
				</div>
				<div class="grid md:grid-cols-2 gap-8">
					<div class="card-psan p-6 space-y-4">
						<h3 class="text-[10px] font-black text-muted uppercase tracking-widest">404 Error Content</h3>
						<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800"><div id="editor-404" class="text-main"></div></div>
						<input type="hidden" name="error_404_content" value={editors.error404.data} />
					</div>
					<div class="card-psan p-6 space-y-4">
						<h3 class="text-[10px] font-black text-muted uppercase tracking-widest">500 Error Content</h3>
						<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800"><div id="editor-500" class="text-main"></div></div>
						<input type="hidden" name="error_500_content" value={editors.error500.data} />
					</div>
				</div>
			</div>

			<section class="card-psan p-8 space-y-6 border-psan-green/20 border-2">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Backup Settings</h3>
				{#if dbStatus.type === 'turso'}
					<div class="p-4 bg-psan-green/10 text-psan-green rounded-2xl border border-psan-green/20 text-xs font-bold">
						<p>ℹ️ 現在 Turso (リモートDB) を使用中のため、バックアップは Turso のダッシュボード側で管理されます。</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
						<label class="flex items-center justify-between p-4 bg-psan-green/5 rounded-xl cursor-pointer">
							<span class="text-sm font-bold text-psan-green uppercase">Auto Backup</span>
							<input type="checkbox" name="enable_backup" checked={data.settings?.enable_backup === 'true'} class="w-6 h-6 accent-psan-green" />
						</label>
						<div class="space-y-2">
							<label for="backup_interval" class="text-[10px] font-black text-muted uppercase">Interval (Hours)</label>
							<input id="backup_interval" type="number" name="backup_interval" value={data.settings?.backup_interval} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" />
						</div>
						<div class="space-y-2">
							<label for="backup_keep_count" class="text-[10px] font-black text-muted uppercase">Keep Count</label>
							<input id="backup_keep_count" type="number" name="backup_keep_count" value={data.settings?.backup_keep_count} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" />
						</div>
					</div>
				{/if}
			</section>
		</form>

		<section class="card-psan p-8 space-y-8">
			<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<h3 class="text-xl font-black text-muted uppercase tracking-tighter italic">Backup History</h3>
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/uploadBackup" enctype="multipart/form-data" use:enhance class="flex items-center gap-2">
						<input type="file" name="file" aria-label="バックアップファイルを選択" accept=".db" class="text-[10px] font-bold text-muted bg-secondary p-1 rounded border border-dashed border-border-color" />
						<button type="submit" class="text-[10px] font-black px-4 py-2 bg-psan-pink text-white rounded-xl hover:scale-105 transition-all uppercase">Upload & Add</button>
					</form>
					<form method="POST" action="?/createBackup" use:enhance>
						<button type="submit" class="text-[10px] font-black px-6 py-2 bg-psan-green text-white rounded-xl hover:scale-105 transition-all">CREATE NOW</button>
					</form>
				</div>
			</div>
			<div class="space-y-3">
				{#each data.backups as backup}
					<div class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-none rounded-2xl group/item transition-all hover:ring-2 ring-psan-green/20 shadow-sm">
						<div>
							<div class="text-xs font-black text-main">{backup.name}</div>
							<div class="text-[10px] font-bold text-muted uppercase">{(backup.size / 1024 / 1024).toFixed(2)} MB • {new Date(backup.time).toLocaleString()}</div>
						</div>
						<div class="flex gap-2">
							<a href="?/downloadBackup&filename={backup.name}" aria-label="バックアップをダウンロード" class="p-2 text-psan-green hover:bg-psan-green/10 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></a>
							<form method="POST" action="?/restoreBackup" use:enhance>
								<input type="hidden" name="filename" value={backup.name} />
								<button type="submit" aria-label="このバックアップを復元" class="p-2 text-psan-pink hover:bg-psan-pink/10 rounded-lg" onclick={(e) => !confirm("本当に復元しますか？ 復元後は自動的に再起動します。") && e.preventDefault()}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15"/></svg></button>
							</form>
						</div>
					</div>
				{:else}
					<p class="text-center py-10 text-[10px] font-black text-muted uppercase tracking-[0.2em]">No backups found.</p>
				{/each}
			</div>
		</section>
	</div>

	{#if showSuccess}
		<div class="fixed top-24 left-1/2 -translate-x-1/2 bg-psan-green text-white px-10 py-4 rounded-full font-black shadow-2xl z-[101] animate-in fade-in slide-in-from-top-4">
			SETTINGS SAVED!
		</div>
	{/if}
</div>

<style>
	:global(.ce-block__content) { max-width: 100%; }
	:global(.ce-toolbar__content) { max-width: 100%; }
</style>
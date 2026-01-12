<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { WidgetTool } from '$lib/editor/WidgetTool';
	
	let { data, form } = $props();
	let formElement: HTMLFormElement;
	let isSaving = $state(false);
	let showSuccess = $state(false);
	let isUploadingIcon = $state(false);
	let siteIconUrl = $state(data.settings.site_icon_url || '');

	let editors = $state({
		home: { data: '', instance: null as any },
		about: { data: '', instance: null as any },
		error404: { data: '', instance: null as any },
		error500: { data: '', instance: null as any }
	});

	$effect(() => {
		editors.home.data = data.settings.home_hero_content;
		editors.about.data = data.settings.about_page_content;
		editors.error404.data = data.settings.error_404_content;
		editors.error500.data = data.settings.error_500_content;
		siteIconUrl = data.settings.site_icon_url || '';
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
			console.error('Upload failed', err);
		} finally {
			isUploadingIcon = false;
		}
	}

	async function initEditor(id: keyof typeof editors, holder: string, initialData: string) {
		const el = document.getElementById(holder);
		if (!el || editors[id].instance) return;

		const EditorJS = (await import('@editorjs/editorjs')).default;
		const Header = (await import('@editorjs/header')).default;
		const List = (await import('@editorjs/list')).default;
		const Image = (await import('@editorjs/image')).default;
		const Marker = (await import('@editorjs/marker')).default;
		const Quote = (await import('@editorjs/quote')).default;
		const Code = (await import('@editorjs/code')).default;
		const ColorPlugin = (await import('editorjs-text-color-plugin')).default;

		let parsedData = { blocks: [] };
		try {
			if (initialData) {
				const data = JSON.parse(initialData);
				if (data && data.blocks) parsedData = data;
			}
		} catch (e) {
			console.error(`Invalid editor data for ${id}`, e);
		}

		if (parsedData.blocks.length === 0) {
			parsedData.blocks.push({ type: 'paragraph', data: { text: '' } });
		}

		const editor = new EditorJS({
			holder,
			tools: {
				header: Header, 
				list: List, 
				marker: Marker,
				quote: Quote,
				code: Code,
				color: { 
					class: ColorPlugin, 
					config: { 
						colorCollections: ['#00CC99', '#EB2D8C', '#1A1A1A', '#FF1313', '#2388FF', '#FFD300'], 
						type: 'text',
						customPicker: true 
					} 
				},
				image: { 
					class: Image, 
					config: { 
						endpoints: { byFile: '/api/upload' } 
					} 
				}
			},
			data: parsedData,
			placeholder: 'Start building your page...',
			defaultBlock: 'paragraph'
		});
		editors[id].instance = editor;
	}

	async function saveAll() {
		if (isSaving) return;
		isSaving = true;
		try {
			// すべてのエディタのインスタンスから最新データを取得
			const savePromises = Object.entries(editors).map(async ([id, e]) => {
				if (e.instance) {
					const saved = await e.instance.save();
					editors[id as keyof typeof editors].data = JSON.stringify(saved);
				}
			});
			await Promise.all(savePromises);
			
			// ステートの反映を待つ
			setTimeout(() => {
				formElement?.requestSubmit();
			}, 100);
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
			initEditor('home', 'editor-home', data.settings.home_hero_content);
			initEditor('about', 'editor-about', data.settings.about_page_content);
			initEditor('error404', 'editor-404', data.settings.error_404_content);
			initEditor('error500', 'editor-500', data.settings.error_500_content);
		}, 100);
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			Object.values(editors).forEach(e => e.instance?.destroy?.());
		};
	});
</script>

<svelte:head>
	<title>System Settings | {data.settings?.site_title || 'Admin'}</title>
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

		{#if form?.message && !form?.success}
			<div class="bg-psan-pink/10 border-2 border-psan-pink text-psan-pink p-6 rounded-[32px] animate-in shake duration-300">
				<div class="flex items-center gap-4">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
					<div>
						<p class="font-black uppercase tracking-widest text-sm">Error Occurred</p>
						<p class="font-bold text-xs opacity-80">{form.message}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- 設定フォーム -->
		<form bind:this={formElement} method="POST" action="?/saveSettings" use:enhance={() => {
			return async ({ result, update }) => {
				isSaving = false;
				if (result.type === 'success') {
					showSuccess = true;
					setTimeout(() => showSuccess = false, 3000);
					await update({ reset: false });
				} else {
					await update();
				}
			};
		}} class="space-y-12">
			
			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Identity</h3>
				<div class="grid md:grid-cols-2 gap-6">
					<div class="space-y-2">
						<label for="accent_color" class="text-[10px] font-black text-muted uppercase">Accent Color</label>
						<input id="accent_color" name="accent_color" type="color" value={data.settings.accent_color} class="w-full h-14" />
					</div>
					<div class="space-y-2">
						<label for="site_description" class="text-[10px] font-black text-muted uppercase">Site Description (SEO)</label>
						<input id="site_description" name="site_description" value={data.settings.site_description} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" />
					</div>
				</div>

				<div class="space-y-2">
					<label for="allowed_extensions" class="text-[10px] font-black text-muted uppercase">許可するファイル拡張子</label>
					<input
						id="allowed_extensions"
						name="allowed_extensions"
						value={data.settings.allowed_extensions || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico'}
						placeholder=".jpg,.jpeg,.png..."
						class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main"
					/>
					<p class="text-[10px] text-muted">カンマ区切りで入力（例：.jpg,.png）</p>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Tab & Appearance</h3>
				
				<div class="grid md:grid-cols-2 gap-8">
					<!-- ブラウザタブの設定 -->
					<div class="space-y-6">
						<h4 class="text-xs font-black text-main uppercase tracking-widest border-l-4 border-psan-green pl-3">Browser Tab Settings</h4>
						
						<div class="space-y-2">
							<label for="site_title" class="text-[10px] font-black text-muted uppercase">Tab Title (Site Title)</label>
							<input id="site_title" name="site_title" value={data.settings.site_title} class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main" placeholder="My Awesome Blog" />
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
									<p class="text-[10px] text-muted mt-2">Recommended: 512x512 PNG/SVG</p>
									<input type="hidden" name="site_icon_url" value={siteIconUrl} />
								</div>
							</div>
						</div>
					</div>

					<!-- カスタムスタイル -->
					<div class="space-y-6">
						<h4 class="text-xs font-black text-main uppercase tracking-widest border-l-4 border-psan-pink pl-3">Custom Styles</h4>
						<div class="space-y-2">
							<label for="custom_css" class="text-[10px] font-black text-muted uppercase">Custom CSS</label>
							<textarea 
								id="custom_css" 
								name="custom_css" 
								rows="8" 
								class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main resize-y"
								placeholder="body &#123; background: #f0f0f0; &#125;"
							>{data.settings.custom_css || ''}</textarea>
							<p class="text-[10px] text-muted">サイト全体のスタイルを上書きできます。</p>
						</div>
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-pink italic uppercase">Access Control</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-2xl cursor-pointer text-main">
						<span class="text-xs font-bold">ログインを強制する (非公開サイト)</span>
						<input type="checkbox" name="is_site_public" checked={data.settings.is_site_public === 'false'} class="w-6 h-6 accent-psan-pink" />
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
							<input type="checkbox" name={item.id} checked={data.settings[item.id] === 'true'} class="w-5 h-5 accent-psan-green" />
						</label>
					{/each}
					<div class="p-4 bg-secondary dark:bg-slate-800 rounded-2xl space-y-2 text-main">
						<label for="anonymous_name" class="text-[10px] font-black text-muted uppercase">匿名ユーザーの表示名</label>
						<input id="anonymous_name" name="anonymous_name" value={data.settings.anonymous_name || 'Anonymous'} class="w-full bg-white dark:bg-slate-900 border-none rounded-lg p-2 text-sm font-bold text-main" />
					</div>
				</div>
			</section>

			<div class="space-y-8">
				<div class="flex items-center gap-4 mb-4">
					<h3 class="text-2xl font-black text-main uppercase tracking-tighter italic">Page Contents</h3>
					<div class="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
				</div>

				<div class="card-psan p-8 space-y-6">
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-black text-psan-green italic uppercase">Home Page Hero</h3>
						<span class="text-[10px] font-bold text-muted uppercase">Top of the homepage</span>
					</div>
					<div class="bg-white dark:bg-slate-900 rounded-[32px] p-4 md:p-8 border border-slate-200 dark:border-slate-800 shadow-inner">
						<div id="editor-home" class="text-main"></div>
					</div>
					<input type="hidden" name="home_hero_content" value={editors.home.data} />
				</div>

				<div class="card-psan p-8 space-y-6">
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-black text-psan-pink italic uppercase">About Page</h3>
						<span class="text-[10px] font-bold text-muted uppercase">Introduce yourself</span>
					</div>
					<div class="bg-white dark:bg-slate-900 rounded-[32px] p-4 md:p-8 border border-slate-200 dark:border-slate-800 shadow-inner">
						<div id="editor-about" class="text-main"></div>
					</div>
					<input type="hidden" name="about_page_content" value={editors.about.data} />
				</div>

				<div class="grid md:grid-cols-2 gap-8">
					<div class="card-psan p-6 space-y-4">
						<h3 class="text-[10px] font-black text-muted uppercase tracking-widest">404 Error Content</h3>
						<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
							<div id="editor-404" class="text-main"></div>
						</div>
						<input type="hidden" name="error_404_content" value={editors.error404.data} />
					</div>
					<div class="card-psan p-6 space-y-4">
						<h3 class="text-[10px] font-black text-muted uppercase tracking-widest">500 Error Content</h3>
						<div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
							<div id="editor-500" class="text-main"></div>
						</div>
						<input type="hidden" name="error_500_content" value={editors.error500.data} />
					</div>
				</div>
			</div>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Storage Strategy</h3>
				<div class="p-6 bg-psan-green/5 border border-psan-green/20 rounded-[32px] space-y-6">
					<div class="flex items-center justify-between gap-8">
						<div class="flex-1">
							<h4 class="font-black text-sm text-main uppercase">File Storage Method</h4>
							<p class="text-[10px] font-medium text-muted mt-1 leading-relaxed">
								アップロードされた画像や動画の保存先を選択します。<br>
								<span class="text-psan-pink font-bold">Local:</span> static/uploads フォルダに保存します（PaaSでは消える可能性があります）。<br>
								<span class="text-psan-green font-bold">Database:</span> SQLite DB内に保存します（バックアップに含まれますが、DBサイズが大きくなります）。
							</p>
						</div>
						<select 
							name="storage_type" 
							class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl text-xs font-black p-3 focus:ring-2 focus:ring-psan-green text-main dark:text-white"
						>
							<option value="local" selected={data.settings.storage_type === 'local'}>Local Filesystem</option>
							<option value="database" selected={data.settings.storage_type === 'database'}>SQLite Database</option>
						</select>
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6 border-psan-pink/20 border-2">
				<h3 class="text-xl font-black text-psan-pink italic uppercase">Security (Turnstile)</h3>
				<label class="flex items-center justify-between p-4 bg-psan-pink/5 rounded-xl cursor-pointer">
					<span class="text-sm font-bold text-psan-pink">Turnstileを有効化</span>
					<input type="checkbox" name="enable_turnstile" checked={data.settings.enable_turnstile === 'true'} class="w-5 h-5 accent-psan-pink" />
				</label>
				<div class="grid md:grid-cols-2 gap-6">
					<div class="space-y-2">
						<label for="turnstile_site_key" class="text-[10px] font-black text-muted uppercase">Site Key</label>
						<input id="turnstile_site_key" name="turnstile_site_key" placeholder="Site Key" value={data.settings.turnstile_site_key} class="w-full bg-secondary dark:bg-slate-800 rounded-xl p-4 font-mono text-xs text-main" />
					</div>
					<div class="space-y-2">
						<label for="turnstile_secret_key" class="text-[10px] font-black text-muted uppercase">Secret Key</label>
						<input id="turnstile_secret_key" name="turnstile_secret_key" placeholder="Secret Key" type="password" value={data.settings.turnstile_secret_key} class="w-full bg-secondary dark:bg-slate-800 rounded-xl p-4 font-mono text-xs text-main" />
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6 border-psan-green/20 border-2">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Backup Settings</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
					<label class="flex items-center justify-between p-4 bg-psan-green/5 rounded-xl cursor-pointer">
						<span class="text-sm font-bold text-psan-green uppercase">Auto Backup</span>
						<input type="checkbox" name="enable_backup" checked={data.settings.enable_backup === 'true'} class="w-6 h-6 accent-psan-green" />
					</label>
					<div class="space-y-2">
						<label for="backup_interval" class="text-[10px] font-black text-muted uppercase">Interval (Hours)</label>
						<input id="backup_interval" type="number" name="backup_interval" value={data.settings.backup_interval} class="w-full bg-secondary dark:bg-slate-800 rounded-xl p-4 font-bold text-main" />
					</div>
					<div class="space-y-2">
						<label for="backup_keep_count" class="text-[10px] font-black text-muted uppercase">Keep Count</label>
						<input id="backup_keep_count" type="number" name="backup_keep_count" value={data.settings.backup_keep_count} class="w-full bg-secondary dark:bg-slate-800 rounded-xl p-4 font-bold text-main" />
					</div>
				</div>
			</section>
		</form>

		<!-- BACKUP HISTORY -->
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
							<a href="?/downloadBackup&filename={backup.name}" aria-label="バックアップをダウンロード" class="p-2 text-psan-green hover:bg-psan-green/10 rounded-lg">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
							</a>
							<form method="POST" action="?/restoreBackup" use:enhance>
								<input type="hidden" name="filename" value={backup.name} />
								<button type="submit" aria-label="このバックアップを復元" class="p-2 text-psan-pink hover:bg-psan-pink/10 rounded-lg" onclick={() => !confirm("本当に復元しますか？ 復元後は自動的に再起動します。") && event.preventDefault()}>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15"/></svg>
								</button>
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

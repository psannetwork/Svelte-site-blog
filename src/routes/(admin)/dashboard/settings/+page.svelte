<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { editorI18n } from '$lib/utils/editor_i18n';

	let { data, form } = $props();
	let dbStatus = $derived(data.dbStatus);
	
	let formElement = $state<HTMLFormElement>();
	let isSaving = $state(false);
	let isRefreshing = $state(false);
	let showSuccess = $state(false);
	let isUploadingIcon = $state(false);

	let storageStats = $state({ local: 0, database: 0 });
	let migrationStatus = $state({ active: false, progress: 0, message: '' });

	// 最新のサーバー状態を保持
	let baseSettings = $state($state.snapshot(data.settings) || {});

	let siteTitle = $state($state.snapshot(data.settings?.site_title) || '');
	let siteDescription = $state($state.snapshot(data.settings?.site_description) || '');
	let accentColor = $state($state.snapshot(data.settings?.accent_color) || '#00CC99');
	let siteLanguage = $state($state.snapshot(data.settings?.site_language) || 'ja');
	let allowedExtensions = $state($state.snapshot(data.settings?.allowed_extensions) || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico');
	let siteIconUrl = $state($state.snapshot(data.settings?.site_icon_url) || '');
	let storageType = $state($state.snapshot(data.settings?.storage_type) || 'local');

	let userEdited = $state<Record<string, boolean>>({});
	let lastSyncTime = $state(0);

	onMount(() => {
		if (data.settings) {
			lastSyncTime = parseInt(data.settings._updated || '0');
		}
		refreshSettings();
	});
	
		function markEdited(key: string) {
			userEdited[key] = true;
		}
	
		async function refreshSettings() {
			if (isRefreshing || isSaving) return;
			isRefreshing = true;
			try {
				const res = await fetch('/api/settings');
				const result = await res.json();
				if (result.success) {
					if (result.stats) storageStats = result.stats;
					const s = result.settings;
					const newTime = parseInt(s._updated || '0');
					
					if (newTime > lastSyncTime) {
						let changed = false;
						const sync = (key: string, current: any, remote: any, setter: (v: any) => void) => {
							if (!userEdited[key] && current !== remote) {
								setter(remote);
								changed = true;
							}
						};
	
						sync('site_title', siteTitle, s.site_title, v => siteTitle = v);
						sync('site_description', siteDescription, s.site_description, v => siteDescription = v);
						sync('accent_color', accentColor, s.accent_color, v => accentColor = v);
						sync('site_language', siteLanguage, s.site_language, v => siteLanguage = v);
						sync('site_icon_url', siteIconUrl, s.site_icon_url, v => siteIconUrl = v);
	
						lastSyncTime = newTime;
						if (changed) console.log('[SETTINGS] Data synced.');
					}
				}
			} catch (e) {
			} finally {
				isRefreshing = false;
			}
		}
	

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
		} finally {
			isUploadingIcon = false;
		}
	}

	async function runMigration(target: 'local' | 'database') {
		if (
			!confirm(
				`全ての画像を ${target === 'local' ? 'ローカル' : 'データベース'} へ移動しますか？この操作には時間がかかる場合があります。`
			)
		)
			return;

		migrationStatus.active = true;
		migrationStatus.progress = 10;
		migrationStatus.message = '設定を保存中...';

		try {
			const fd = new FormData(formElement);
			fd.set('storage_type', target);
			await saveAll();

			migrationStatus.progress = 30;
			migrationStatus.message = 'ファイル移動を開始...';

			const res = await fetch('/api/settings/migrate-storage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ target })
			});
			const result = await res.json();
			if (result.success) {
				migrationStatus.progress = 100;
				migrationStatus.message = `移行完了: ${result.migrated}/${result.total} 個のファイルを移動しました。`;
				await invalidateAll();
				setTimeout(() => {
					migrationStatus.active = false;
				}, 5000);
			}
		} catch (e) {
			migrationStatus.message = 'エラーが発生しました。';
			console.error(e);
		}
	}

	async function saveAll() {
		if (isSaving) return;
		isSaving = true;
		try {
			const fd = new FormData(formElement);
			const updates: Record<string, string> = {};

			const allKeys = [
				'site_title',
				'site_description',
				'accent_color',
				'is_site_public',
				'custom_css',
				'site_icon_url',
				'storage_type',
				'site_language',
				'allowed_extensions',
				'allow_signup',
				'allow_comments',
				'allow_anonymous_comments',
				'allow_account_deletion',
				'anonymous_name',
				'show_footer_auth',
				'require_email_verification',
				'enable_turnstile',
				'turnstile_site_key',
				'turnstile_secret_key',
				'enable_backup',
				'backup_interval',
				'backup_keep_count'
			];

			const checkboxKeys = [
				'allow_signup',
				'allow_comments',
				'allow_anonymous_comments',
				'allow_account_deletion',
				'show_footer_auth',
				'enable_turnstile',
				'require_email_verification',
				'enable_backup'
			];

			for (const key of allKeys) {
				const val = fd.get(key);
				if (key === 'is_site_public') {
					updates[key] = val === 'on' ? 'false' : 'true';
				} else if (checkboxKeys.includes(key)) {
					updates[key] = val === 'on' ? 'true' : 'false';
				} else if (val !== null) {
					updates[key] = val.toString();
				}
			}

			const res = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			const result = await res.json();
			if (result.success && result.settings) {
				baseSettings = { ...result.settings }; // 最新状態で更新
				lastSyncTime = parseInt(result.settings._updated || '0');
				userEdited = {};
				showSuccess = true;
				setTimeout(() => (showSuccess = false), 3000);
				await invalidateAll();
			}
		} catch (e) {
		} finally {
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
			setTimeout(refreshSettings, 1000);
		}, 200);
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div>
			<h2 class="text-3xl md:text-4xl font-black tracking-tighter uppercase text-main">
				System Settings
			</h2>
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
		<section
			class="card-psan p-8 space-y-4 border-2 {dbStatus.type === 'turso'
				? 'border-psan-green/30'
				: 'border-slate-200'} shadow-sm"
		>
			<div class="flex items-center justify-between">
				<h3 class="text-xl font-black text-main uppercase tracking-tighter italic">
					Database Status
				</h3>
				<span
					class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
					{dbStatus.type === 'turso'
						? 'bg-psan-green text-white'
						: 'bg-slate-100 dark:bg-slate-800 text-muted'}"
				>
					{dbStatus.type}
				</span>
			</div>
			<div class="flex flex-col md:flex-row md:items-center gap-4 text-xs font-bold">
				<div
					class="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800"
				>
					<span class="text-[10px] text-muted uppercase block mb-1">Connection Details</span>
					<code class="text-psan-green break-all"
						>{dbStatus.type === 'turso' ? dbStatus.url : dbStatus.path}</code
					>
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

		{#if form?.message}
			<div class="bg-psan-pink/10 border-2 border-psan-pink text-psan-pink p-6 rounded-[32px]">
				<p class="font-bold text-xs">{form.message}</p>
			</div>
		{/if}

		<form
			bind:this={formElement}
			onsubmit={(e) => e.preventDefault()}
			class="space-y-12"
			autocomplete="off"
		>
			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Identity</h3>
				<div class="grid md:grid-cols-2 gap-6">
					<div class="space-y-2">
						<label for="accent_color" class="text-[10px] font-black text-muted uppercase"
							>Accent Color</label
						>
						<input
							id="accent_color"
							name="accent_color"
							type="color"
							bind:value={accentColor}
							oninput={() => markEdited('accent_color')}
							class="w-full h-14"
						/>
					</div>
					<div class="space-y-2">
						<label for="site_language" class="text-[10px] font-black text-muted uppercase"
							>Site Language</label
						>
						<select
							name="site_language"
							bind:value={siteLanguage}
							onchange={() => markEdited('site_language')}
							class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
						>
							<option value="ja">日本語 (Japanese)</option>
							<option value="en">English</option>
						</select>
					</div>
					<div class="space-y-2">
						<label for="site_description" class="text-[10px] font-black text-muted uppercase"
							>Site Description (SEO)</label
						>
						<input
							id="site_description"
							name="site_description"
							bind:value={siteDescription}
							oninput={() => markEdited('site_description')}
							class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
							autocomplete="off"
						/>
					</div>
				</div>
				<div class="space-y-2">
					<label for="allowed_extensions" class="text-[10px] font-black text-muted uppercase"
						>許可するファイル拡張子</label
					>
					<input
						id="allowed_extensions"
						name="allowed_extensions"
						bind:value={allowedExtensions}
						oninput={() => markEdited('allowed_extensions')}
						class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main"
						autocomplete="off"
					/>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Tab & Appearance</h3>
				<div class="grid md:grid-cols-2 gap-8">
					<div class="space-y-6">
						<div class="space-y-2">
							<label for="site_title" class="text-[10px] font-black text-muted uppercase"
								>Tab Title (Site Title)</label
							>
							<input
								id="site_title"
								name="site_title"
								bind:value={siteTitle}
								oninput={() => markEdited('site_title')}
								class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
								autocomplete="off"
							/>
						</div>
						<div class="space-y-4">
							<span class="text-[10px] font-black text-muted uppercase">Tab Icon (Favicon)</span>
							<div class="flex items-center gap-6">
								<div
									class="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-none flex items-center justify-center overflow-hidden shadow-sm"
								>
									{#if siteIconUrl}
										<img
											src={siteIconUrl}
											alt="Site Icon"
											class="w-full h-full object-contain p-2"
										/>
									{:else}
										<span class="text-xs font-bold text-muted opacity-50">No Icon</span>
									{/if}
								</div>
								<div class="flex-1">
									<label
										class="btn-psan-ghost py-2 text-xs w-full cursor-pointer dark:bg-slate-700 dark:text-white dark:border-slate-500"
									>
										{isUploadingIcon ? 'Uploading...' : 'Upload Icon'}
										<input
											type="file"
											accept="image/*"
											class="hidden"
											onchange={handleIconUpload}
											disabled={isUploadingIcon}
										/>
									</label>
									<input type="hidden" name="site_icon_url" value={siteIconUrl} />
								</div>
							</div>
						</div>
					</div>
					<div class="space-y-2">
						<label for="custom_css" class="text-[10px] font-black text-muted uppercase"
							>Custom CSS</label
						>
						<textarea
							id="custom_css"
							name="custom_css"
							rows="8"
							oninput={() => markEdited('custom_css')}
							class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-mono text-xs text-main resize-y"
							value={data.settings?.custom_css || ''}
						></textarea>
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">
					Security & Spam Protection
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<label
						class="flex items-center justify-between p-6 bg-psan-green/5 border border-psan-green/20 rounded-3xl cursor-pointer"
					>
						<div class="space-y-1">
							<span class="text-sm font-black text-main uppercase">Cloudflare Turnstile</span>
							<p class="text-[10px] text-muted font-bold">ボット防止。</p>
						</div>
						<input
							type="checkbox"
							name="enable_turnstile"
							checked={data.settings?.enable_turnstile === 'true'}
							onchange={() => markEdited('enable_turnstile')}
							class="w-6 h-6 accent-psan-green"
						/>
					</label>
					<div class="space-y-4">
						<input
							id="turnstile_site_key"
							name="turnstile_site_key"
							oninput={() => markEdited('turnstile_site_key')}
							value={data.settings?.turnstile_site_key || ''}
							class="w-full bg-secondary dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-main"
							placeholder="Site Key"
							autocomplete="off"
						/>
						<input
							id="turnstile_secret_key"
							name="turnstile_secret_key"
							type="password"
							oninput={() => markEdited('turnstile_secret_key')}
							value={data.settings?.turnstile_secret_key || ''}
							class="w-full bg-secondary dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-main"
							placeholder="Secret Key"
							autocomplete="new-password"
						/>
					</div>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Storage Strategy</h3>
				<div class="p-6 bg-psan-green/5 border border-psan-green/20 rounded-[32px] space-y-6">
					{#if dbStatus.type === 'turso'}
						<div
							class="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs font-bold mb-4"
						>
							<p>
								💡 **Turso を使用中の方へ**: 保存先を **"SQLite Database"**
								に設定することを強くおすすめします。
							</p>
						</div>
					{/if}

										<div class="flex flex-col gap-4">

											<div class="flex flex-col md:flex-row md:items-center gap-6">

												<div class="space-y-1">

													<select name="storage_type" bind:value={storageType} class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl text-xs font-black p-3 text-main dark:text-white" onchange={() => markEdited('storage_type')}>

														<option value="local">Local Filesystem</option>

														<option value="database">SQLite Database</option>

													</select>

													<div class="flex gap-2 text-[9px] font-black uppercase opacity-50">

														<span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">Local: {storageStats.local}</span>

														<span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">DB: {storageStats.database}</span>

													</div>

												</div>

					

												{#if storageType === 'database'}
								<button
									type="button"
									onclick={() => runMigration('database')}
									class="text-[10px] font-black px-6 py-3 bg-psan-green text-white rounded-xl uppercase hover:scale-105 transition-all shadow-lg shadow-psan-green/20"
								>
									ローカルの画像をDBへ全て移動
								</button>
							{:else}
								<button
									type="button"
									onclick={() => runMigration('local')}
									class="text-[10px] font-black px-6 py-3 bg-psan-pink text-white rounded-xl uppercase hover:scale-105 transition-all shadow-lg shadow-psan-pink/20"
								>
									DBの画像をローカルへ全て移動
								</button>
							{/if}
						</div>
						<p class="text-[10px] text-muted font-bold italic">
							※
							保存先を切り替えただけでは画像は移動しません。ボタンを押してデータを同期してください。
						</p>
					</div>

					{#if migrationStatus.active}
						<div class="mt-4 space-y-2">
							<div
								class="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted"
							>
								<span>{migrationStatus.message}</span>
								<span>{migrationStatus.progress}%</span>
							</div>
							<div class="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
								<div
									class="h-full bg-psan-green transition-all duration-500"
									style="width: {migrationStatus.progress}%"
								></div>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<section class="card-psan p-8 space-y-6 border-psan-pink/20 border-2">
				<h3 class="text-xl font-black text-psan-pink italic uppercase">Access Control</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label
						class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-2xl cursor-pointer text-main"
					>
						<span class="text-xs font-bold">ログイン強制</span>
						<input
							type="checkbox"
							name="is_site_public"
							checked={data.settings?.is_site_public === 'false'}
							onchange={() => markEdited('is_site_public')}
							class="w-6 h-6 accent-psan-pink"
						/>
					</label>
					{#each [{ id: 'allow_signup', label: '新規登録許可' }, { id: 'allow_comments', label: 'コメント許可' }, { id: 'allow_anonymous_comments', label: '匿名コメント許可' }, { id: 'allow_account_deletion', label: '退会許可' }, { id: 'show_footer_auth', label: 'フッターログイン表示' }] as item}
						<label
							class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-2xl cursor-pointer text-main"
						>
							<span class="text-xs font-bold">{item.label}</span>
							<input
								type="checkbox"
								name={item.id}
								checked={data.settings?.[item.id] === 'true'}
								onchange={() => markEdited(item.id)}
								class="w-5 h-5 accent-psan-green"
							/>
						</label>
					{/each}
					<input
						id="anonymous_name"
						name="anonymous_name"
						value={data.settings?.anonymous_name || 'Anonymous'}
						oninput={() => markEdited('anonymous_name')}
						class="w-full bg-white dark:bg-slate-900 border-none rounded-lg p-2 text-sm font-bold text-main"
					/>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6 border-psan-green/20 border-2">
				<h3 class="text-xl font-black text-psan-green italic uppercase">Backup Settings</h3>
				{#if dbStatus.type === 'turso'}
					<div
						class="p-4 bg-psan-green/10 text-psan-green rounded-2xl border border-psan-green/20 text-xs font-bold"
					>
						<p>
							ℹ️ 現在 Turso (リモートDB) を使用中のため、バックアップは Turso
							のダッシュボード側で管理されます。
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
						<label
							class="flex items-center justify-between p-4 bg-psan-green/5 rounded-xl cursor-pointer"
						>
							<span class="text-sm font-bold text-psan-green uppercase">Auto Backup</span>
							<input
								type="checkbox"
								name="enable_backup"
								checked={data.settings?.enable_backup === 'true'}
								class="w-6 h-6 accent-psan-green"
							/>
						</label>
						<div class="space-y-2">
							<label for="backup_interval" class="text-[10px] font-black text-muted uppercase"
								>Interval (Hours)</label
							>
							<input
								id="backup_interval"
								type="number"
								name="backup_interval"
								value={data.settings?.backup_interval}
								class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
								autocomplete="off"
							/>
						</div>
						<div class="space-y-2">
							<label for="backup_keep_count" class="text-[10px] font-black text-muted uppercase"
								>Keep Count</label
							>
							<input
								id="backup_keep_count"
								type="number"
								name="backup_keep_count"
								value={data.settings?.backup_keep_count}
								class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
								autocomplete="off"
							/>
						</div>
					</div>
				{/if}
			</section>
		</form>

		<section class="card-psan p-8 space-y-8">
			<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<h3 class="text-xl font-black text-muted uppercase tracking-tighter italic">
					Backup History
				</h3>
				<div class="flex flex-wrap gap-2">
					<form
						method="POST"
						action="?/uploadBackup"
						enctype="multipart/form-data"
						use:enhance
						class="flex items-center gap-2"
					>
						<input
							type="file"
							name="file"
							accept=".db"
							class="text-[10px] font-bold text-muted bg-secondary p-1 rounded"
						/>
						<button
							type="submit"
							class="text-[10px] font-black px-4 py-2 bg-psan-pink text-white rounded-xl uppercase"
							>Upload</button
						>
					</form>
					<form method="POST" action="?/createBackup" use:enhance>
						<button
							type="submit"
							class="text-[10px] font-black px-6 py-2 bg-psan-green text-white rounded-xl"
							>CREATE NOW</button
						>
					</form>
				</div>
			</div>
			<div class="space-y-3">
				{#each data.backups as backup}
					<div
						class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-none rounded-2xl shadow-sm"
					>
						<div>
							<div class="text-xs font-black text-main">{backup.name}</div>
							<div class="text-[10px] font-bold text-muted uppercase">
								{(backup.size / 1024 / 1024).toFixed(2)} MB • {new Date(
									backup.time
								).toLocaleString()}
							</div>
						</div>
						<div class="flex gap-2">
							<a
								href="?/downloadBackup&filename={backup.name}"
								aria-label="Download Backup"
								class="p-2 text-psan-green hover:bg-psan-green/10 rounded-lg"
								><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg
								></a
							>
							<form method="POST" action="?/restoreBackup" use:enhance>
								<input type="hidden" name="filename" value={backup.name} />
								<button
									type="submit"
									aria-label="Restore Backup"
									class="p-2 text-psan-pink hover:bg-psan-pink/10 rounded-lg"
									onclick={(e) => !confirm('復元しますか？') && e.preventDefault()}
									><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15"
										/></svg
									></button
								>
							</form>
						</div>
					</div>
				{:else}
					<p class="text-center py-10 text-[10px] font-black text-muted uppercase tracking-[0.2em]">
						No backups found.
					</p>
				{/each}
			</div>
		</section>
	</div>

	{#if showSuccess}
		<div
			class="fixed top-24 left-1/2 -translate-x-1/2 bg-psan-green text-white px-10 py-4 rounded-full font-black shadow-2xl z-[101] animate-in fade-in slide-in-from-top-4"
		>
			SAVED!
		</div>
	{/if}
</div>

<style>
	:global(.ce-block__content) {
		max-width: 100%;
	}
	:global(.ce-toolbar__content) {
		max-width: 100%;
	}
</style>

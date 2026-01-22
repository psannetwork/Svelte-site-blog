<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { editorI18n } from '$lib/utils/editor_i18n';
	import { t, type Language } from '$lib/i18n';

	let { data, form } = $props();
	let dbStatus = $derived(data.dbStatus);
	const lang = $derived((data.settings?.site_language || 'ja') as Language);

	let formElement = $state<HTMLFormElement>();
	let isSaving = $state(false);
	let isRefreshing = $state(false);
	let showSuccess = $state(false);
	let isUploadingIcon = $state(false);

	let storageStats = $state({ local: 0, database: 0 });
	let migrationStatus = $state({ active: false, progress: 0, message: '' });

	let siteTitle = $state('');
	let siteDescription = $state('');
	let accentColor = $state('#00CC99');
	let siteLanguage = $state('ja');
	let allowedExtensions = $state('.jpg,.jpeg,.png,.gif,.webp,.svg,.ico');
	let siteIconUrl = $state('');
	let storageType = $state('local');

	let userEdited = $state<Record<string, boolean>>({});
	let lastSyncTime = $state(0);

	let showRestoreModal = $state(false);
	let selectedBackup = $state<any>(null);
	let isVerifying = $state(false);
	let verificationResult = $state<{ success: boolean; error?: string; details?: string[] } | null>(null);

	$effect(() => {
		if (data.settings && lastSyncTime === 0) {
			const s = data.settings;
			siteTitle = s.site_title || '';
			siteDescription = s.site_description || '';
			accentColor = s.accent_color || '#00CC99';
			siteLanguage = s.site_language || 'ja';
			allowedExtensions = s.allowed_extensions || '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico';
			siteIconUrl = s.site_icon_url || '';
			storageType = s.storage_type || 'local';
			lastSyncTime = parseInt(s._updated || '0');
		}
	});

	onMount(() => {
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
					siteTitle = s.site_title || '';
					siteDescription = s.site_description || '';
					accentColor = s.accent_color || '#00CC99';
					siteLanguage = s.site_language || 'ja';
					siteIconUrl = s.site_icon_url || '';
					lastSyncTime = newTime;
				}
			}
		} catch (e) {} finally {
			isRefreshing = false;
		}
	}

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
		if (!confirm(t(lang, 'migration_confirm'))) return;

		migrationStatus.active = true;
		migrationStatus.progress = 10;
		migrationStatus.message = t(lang, 'saving');

		try {
			await saveAll();
			migrationStatus.progress = 30;
			migrationStatus.message = 'Processing...';

			const res = await fetch('/api/settings/migrate-storage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ target })
			});
			const result = await res.json();
			if (result.success) {
				migrationStatus.progress = 100;
				migrationStatus.message = t(lang, 'success');
				await invalidateAll();
				setTimeout(() => migrationStatus.active = false, 5000);
			}
		} catch (e) {
			migrationStatus.message = t(lang, 'error');
		}
	}

	async function startRestoreFlow(backup: any) {
		selectedBackup = backup;
		showRestoreModal = true;
		isVerifying = true;
		verificationResult = null;
		try {
			const res = await fetch(`/api/settings?action=verify&filename=${backup.name}`);
			verificationResult = await res.json();
		} catch (e) {
			verificationResult = { success: false, error: 'Network Error' };
		} finally {
			isVerifying = false;
		}
	}

	async function saveAll() {
		if (isSaving) return;
		isSaving = true;
		try {
			const fd = new FormData(formElement);
			const updates: Record<string, string> = {};
			const allKeys = [
				'site_title', 'site_description', 'accent_color', 'is_site_public',
				'custom_css', 'site_icon_url', 'storage_type', 'site_language',
				'allowed_extensions', 'allow_signup', 'allow_comments',
				'allow_anonymous_comments', 'allow_account_deletion', 'anonymous_name',
				'show_footer_auth', 'require_email_verification', 'enable_turnstile',
				'turnstile_site_key', 'turnstile_secret_key', 'enable_backup',
				'backup_interval', 'backup_keep_count'
			];
			const checkboxKeys = [
				'allow_signup', 'allow_comments', 'allow_anonymous_comments',
				'allow_account_deletion', 'show_footer_auth', 'enable_turnstile',
				'require_email_verification', 'enable_backup'
			];

			for (const key of allKeys) {
				const val = fd.get(key);
				if (key === 'is_site_public') updates[key] = val === 'on' ? 'false' : 'true';
				else if (checkboxKeys.includes(key)) updates[key] = val === 'on' ? 'true' : 'false';
				else if (val !== null) updates[key] = val.toString();
			}

			const res = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});
			const result = await res.json();
			if (result.success && result.settings) {
				lastSyncTime = parseInt(result.settings._updated || '0');
				userEdited = {};
				showSuccess = true;
				setTimeout(() => showSuccess = false, 3000);
				await invalidateAll();
			}
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			saveAll();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div>
			<h2 class="text-3xl md:text-4xl font-black tracking-tighter uppercase text-main leading-none">{t(lang, 'settings')}</h2>
			<p class="text-sm text-muted font-bold mt-2">{t(lang, 'identity_desc')}</p>
		</div>
		<div class="flex gap-3">
			<a href="/dashboard" class="btn-psan-ghost text-xs px-6 py-2">{t(lang, 'cancel')}</a>
			<button onclick={saveAll} class="btn-psan-primary text-xs px-8 py-2" disabled={isSaving}>
				{isSaving ? t(lang, 'saving') : t(lang, 'save_changes')}
			</button>
		</div>
	</header>

	<div class="space-y-12 pb-32">
		<section class="card-dashboard p-8 space-y-4 border-2 {dbStatus.type === 'turso' ? 'border-psan-green/30' : 'border-slate-100'} shadow-sm">
			<div class="flex items-center justify-between">
				<h3 class="text-xl font-black text-main uppercase tracking-tighter italic">{t(lang, 'database_status')}</h3>
				<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest {dbStatus.type === 'turso' ? 'bg-psan-green text-white' : 'bg-slate-100 dark:bg-slate-800 text-muted'}">{dbStatus.type}</span>
			</div>
			<div class="flex flex-col md:flex-row md:items-center gap-4 text-xs font-bold text-muted">
				<span class="text-[10px] font-black uppercase">{t(lang, 'connection_details')}:</span>
				<code class="break-all">{dbStatus.type === 'turso' ? dbStatus.url : dbStatus.path}</code>
				<p class="md:ml-auto">{dbStatus.type === 'turso' ? t(lang, 'turso_connected') : t(lang, 'local_db_in_use')}</p>
			</div>
		</section>

		<form bind:this={formElement} onsubmit={(e) => e.preventDefault()} class="space-y-12" autocomplete="off">
			<section class="card-dashboard p-10 space-y-8">
				<div>
					<h3 class="text-2xl font-black text-psan-green italic uppercase tracking-tighter">{t(lang, 'identity')}</h3>
					<p class="text-xs text-muted font-bold mt-1">{t(lang, 'identity_desc')}</p>
				</div>
				<div class="grid md:grid-cols-2 gap-8">
					<div class="space-y-3">
						<label for="accent_color" class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'accent_color')}</label>
						<input id="accent_color" name="accent_color" type="color" bind:value={accentColor} oninput={() => markEdited('accent_color')} class="w-full h-14 rounded-2xl cursor-pointer bg-transparent" />
					</div>
					<div class="space-y-3">
						<label for="site_language" class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'site_language')}</label>
						<select name="site_language" bind:value={siteLanguage} onchange={() => markEdited('site_language')} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black text-sm text-main focus:ring-2 focus:ring-psan-green outline-none transition-all">
							<option value="ja">{t(lang, 'japanese')}</option>
							<option value="en">{t(lang, 'english')}</option>
						</select>
					</div>
				</div>
				<div class="space-y-3">
					<label for="site_description" class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'site_desc_seo')}</label>
					<input id="site_description" name="site_description" bind:value={siteDescription} oninput={() => markEdited('site_description')} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 font-bold text-main" />
				</div>
				<div class="space-y-3">
					<label for="allowed_extensions" class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'allowed_extensions')}</label>
					<input id="allowed_extensions" name="allowed_extensions" bind:value={allowedExtensions} oninput={() => markEdited('allowed_extensions')} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-mono text-xs text-main" />
				</div>
			</section>

			<section class="card-dashboard p-10 space-y-8">
				<div>
					<h3 class="text-2xl font-black text-psan-green italic uppercase tracking-tighter">{t(lang, 'appearance')}</h3>
					<p class="text-xs text-muted font-bold mt-1">{t(lang, 'tab_appearance')}</p>
				</div>
				<div class="grid md:grid-cols-2 gap-8">
					<div class="space-y-6">
						<div class="space-y-3">
							<label for="site_title" class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'site_title')}</label>
							<input id="site_title" name="site_title" bind:value={siteTitle} oninput={() => markEdited('site_title')} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 font-black text-main" />
						</div>
						<div class="space-y-4">
							<span class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'site_icon')}</span>
							<div class="flex items-center gap-6">
								<div class="w-20 h-20 rounded-[24px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
									{#if siteIconUrl}
										<img src={siteIconUrl} alt="Site Icon" class="w-full h-full object-contain p-2" />
									{:else}
										<span class="text-[8px] font-black text-muted uppercase">{t(lang, 'no_icon')}</span>
									{/if}
								</div>
								<div class="flex-1">
									<label class="btn-psan-ghost py-3 text-[10px] font-black w-full cursor-pointer uppercase tracking-widest">
										{isUploadingIcon ? '...' : t(lang, 'upload')}
										<input type="file" accept="image/*" class="hidden" onchange={handleIconUpload} disabled={isUploadingIcon} />
									</label>
									<input type="hidden" name="site_icon_url" value={siteIconUrl} />
								</div>
							</div>
						</div>
					</div>
					<div class="space-y-3">
						<label for="custom_css" class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'custom_css')}</label>
						<textarea id="custom_css" name="custom_css" rows="10" oninput={() => markEdited('custom_css')} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 font-mono text-xs text-main resize-none" placeholder="body &#123; ... &#125;">{data.settings?.custom_css || ''}</textarea>
					</div>
				</div>
			</section>

			<section class="card-dashboard p-10 space-y-8">
				<div>
					<h3 class="text-2xl font-black text-psan-green italic uppercase tracking-tighter">{t(lang, 'security')}</h3>
					<p class="text-xs text-muted font-bold mt-1">{t(lang, 'security_desc')}</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
					<label class="flex items-center justify-between p-8 bg-psan-green/5 border border-psan-green/10 rounded-[32px] cursor-pointer group hover:bg-psan-green/10 transition-all">
						<div class="space-y-1">
							<span class="text-sm font-black text-main uppercase tracking-tight">{t(lang, 'bot_protection')}</span>
							<p class="text-[9px] text-muted font-black uppercase tracking-widest">Cloudflare Turnstile</p>
						</div>
						<input type="checkbox" name="enable_turnstile" checked={data.settings?.enable_turnstile === 'true'} onchange={() => markEdited('enable_turnstile')} class="w-7 h-7 accent-psan-green" />
					</label>
					<div class="space-y-4">
						<input name="turnstile_site_key" oninput={() => markEdited('turnstile_site_key')} value={data.settings?.turnstile_site_key || ''} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-main" placeholder="Turnstile Site Key" />
						<input name="turnstile_secret_key" type="password" oninput={() => markEdited('turnstile_secret_key')} value={data.settings?.turnstile_secret_key || ''} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-main" placeholder="Turnstile Secret Key" />
					</div>
				</div>
			</section>

			<section class="card-dashboard p-10 space-y-8">
				<div>
					<h3 class="text-2xl font-black text-psan-green italic uppercase tracking-tighter">{t(lang, 'storage_strategy')}</h3>
					<p class="text-xs text-muted font-bold mt-1">Manage file storage and location.</p>
				</div>
				<div class="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] space-y-8">
					{#if dbStatus.type === 'turso'}
						<div class="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs font-bold">
							<p>{t(lang, 'turso_recommendation')}</p>
						</div>
					{/if}
					<div class="flex flex-col md:flex-row md:items-center gap-8">
						<div class="space-y-2">
							<select name="storage_type" bind:value={storageType} onchange={() => markEdited('storage_type')} class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl text-xs font-black p-3 pr-10 text-main uppercase tracking-widest shadow-sm outline-none">
								<option value="local">Local Filesystem</option>
								<option value="database">SQLite Database</option>
							</select>
							<div class="flex gap-2 text-[9px] font-black uppercase opacity-60 ml-1">
								<span>Local: {storageStats.local}</span>
								<span>DB: {storageStats.database}</span>
							</div>
						</div>
						<div class="flex-1 flex gap-3">
							{#if storageType === 'database'}
								<button type="button" onclick={() => runMigration('database')} class="flex-1 btn-psan-primary py-3 text-[10px] uppercase tracking-widest">{t(lang, 'move_to_db')}</button>
							{:else}
								<button type="button" onclick={() => runMigration('local')} class="flex-1 btn-psan bg-psan-pink text-white py-3 text-[10px] uppercase tracking-widest rounded-2xl">{t(lang, 'move_to_local')}</button>
							{/if}
						</div>
					</div>
					<p class="text-[10px] text-muted font-black italic px-2">{t(lang, 'storage_sync_note')}</p>
				</div>
			</section>

			<section class="card-dashboard p-10 space-y-8 border-psan-pink/20 border-2">
				<h3 class="text-2xl font-black text-psan-pink italic uppercase tracking-tighter">{t(lang, 'access_control')}</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<label class="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] cursor-pointer">
						<span class="text-xs font-black text-main uppercase tracking-widest">{t(lang, 'force_login')}</span>
						<input type="checkbox" name="is_site_public" checked={data.settings?.is_site_public === 'false'} onchange={() => markEdited('is_site_public')} class="w-6 h-6 accent-psan-pink" />
					</label>
					{#each [{ id: 'allow_signup', key: 'allow_signup' }, { id: 'allow_comments', key: 'allow_comments' }, { id: 'allow_anonymous_comments', key: 'allow_anonymous_comments' }, { id: 'allow_account_deletion', key: 'allow_account_deletion' }, { id: 'show_footer_auth', key: 'show_footer_auth' }] as item}
						<label class="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] cursor-pointer">
							<span class="text-xs font-black text-main uppercase tracking-widest">{t(lang, item.key as any)}</span>
							<input type="checkbox" name={item.id} checked={data.settings?.[item.id] === 'true'} onchange={() => markEdited(item.id)} class="w-6 h-6 accent-psan-green" />
						</label>
					{/each}
					<div class="space-y-2 md:col-span-2">
						<label class="text-[10px] font-black text-muted uppercase tracking-widest ml-2">{t(lang, 'anonymous_name')}</label>
						<input name="anonymous_name" value={data.settings?.anonymous_name || 'Anonymous'} oninput={() => markEdited('anonymous_name')} class="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 font-bold text-main" />
					</div>
				</div>
			</section>

			<section class="card-dashboard p-10 space-y-8 border-psan-green/20 border-2">
				<div>
					<h3 class="text-2xl font-black text-psan-green italic uppercase tracking-tighter">{t(lang, 'backup_settings')}</h3>
					<p class="text-xs text-muted font-bold mt-1">{t(lang, 'backup_desc')}</p>
				</div>
				{#if dbStatus.type === 'turso'}
					<div class="p-6 bg-psan-green/5 text-psan-green rounded-[32px] border border-psan-green/10 text-xs font-bold leading-relaxed italic">
						<p>ℹ️ Managed by Turso Dashboard.</p>
					</div>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
						<label class="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] cursor-pointer">
							<span class="text-xs font-black text-main uppercase tracking-widest">{t(lang, 'auto_backup')}</span>
							<input type="checkbox" name="enable_backup" checked={data.settings?.enable_backup === 'true'} class="w-6 h-6 accent-psan-green" />
						</label>
						<div class="space-y-3">
							<label class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'interval_hours')}</label>
							<input type="number" name="backup_interval" value={data.settings?.backup_interval} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black text-main" />
						</div>
						<div class="space-y-3">
							<label class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'keep_count')}</label>
							<input type="number" name="backup_keep_count" value={data.settings?.backup_keep_count} class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-black text-main" />
						</div>
					</div>
				{/if}
			</section>
		</form>

		<section class="card-dashboard p-10 space-y-10">
			<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
				<h3 class="text-2xl font-black text-main uppercase tracking-tighter italic">{t(lang, 'backup_history')}</h3>
				<div class="flex flex-wrap gap-3">
					<form method="POST" action="?/uploadBackup" enctype="multipart/form-data" use:enhance class="flex items-center gap-3">
						<label class="btn-psan-ghost py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer">
							{t(lang, 'upload')}
							<input type="file" name="file" accept=".db" class="hidden" onchange={(e) => e.currentTarget.form?.requestSubmit()} />
						</label>
					</form>
					<form method="POST" action="?/createBackup" use:enhance>
						<button type="submit" class="btn-psan-primary py-2.5 px-8 text-[10px] uppercase tracking-widest">{t(lang, 'create_now')}</button>
					</form>
				</div>
			</div>
			<div class="grid gap-4">
				{#each data.backups as backup}
					<div class="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/30 rounded-[32px] border border-slate-100 dark:border-slate-700 hover:border-psan-green transition-all group">
						<div>
							<div class="text-sm font-black text-main group-hover:text-psan-green transition-colors">{backup.name}</div>
							<div class="text-[10px] font-bold text-muted uppercase mt-1 tracking-widest">
								{(backup.size / 1024 / 1024).toFixed(2)} MB • {new Date(backup.time).toLocaleString()}
							</div>
						</div>
						<div class="flex gap-2">
							<a href="?/downloadBackup&filename={backup.name}" class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-psan-green/10 hover:text-psan-green transition-all">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
							</a>
							<button onclick={() => startRestoreFlow(backup)} class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-psan-pink/10 hover:text-psan-pink transition-all">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15"/></svg>
							</button>
						</div>
					</div>
				{:else}
					<div class="p-20 text-center bg-slate-50 dark:bg-slate-800/20 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-slate-800">
						<p class="font-black text-muted uppercase tracking-[0.3em] text-[10px]">{t(lang, 'no_data')}</p>
					</div>
				{/each}
			</div>
		</section>
	</div>

	{#if showSuccess}
		<div class="fixed top-24 left-1/2 -translate-x-1/2 bg-psan-green text-white px-10 py-4 rounded-full font-black shadow-2xl z-[101] animate-in fade-in slide-in-from-top-4 uppercase text-xs tracking-widest">
			{t(lang, 'success')}
		</div>
	{/if}

	{#if showRestoreModal}
		<div class="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12">
			<button class="absolute inset-0 bg-slate-950/60 backdrop-blur-xl animate-in fade-in" onclick={() => showRestoreModal = false}></button>
			<div class="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[48px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
				<div class="p-10 md:p-12 space-y-8">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-2xl bg-psan-pink flex items-center justify-center text-white">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
						</div>
						<h3 class="text-2xl font-black text-main uppercase tracking-tighter">{t(lang, 'ready_to_restore')}</h3>
					</div>
					<div class="space-y-6">
						<div class="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
							<div class="text-[10px] font-black text-muted uppercase tracking-widest mb-2">{t(lang, 'target_backup')}</div>
							<div class="font-black text-main truncate">{selectedBackup?.name}</div>
						</div>
						<div class="space-y-4">
							<div class="flex items-center justify-between px-2">
								<span class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'verification_status')}</span>
								{#if isVerifying}
									<span class="flex items-center gap-2">
										<span class="w-2 h-2 rounded-full bg-psan-green animate-ping"></span>
										<span class="text-[10px] font-black text-psan-green uppercase tracking-widest">{t(lang, 'verifying')}</span>
									</span>
								{:else if verificationResult?.success}
									<span class="text-[10px] font-black text-psan-green uppercase tracking-widest">{t(lang, 'verification_success')}</span>
								{:else}
									<span class="text-[10px] font-black text-psan-pink uppercase tracking-widest">{t(lang, 'verification_failed')}</span>
								{/if}
							</div>
							<div class="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl space-y-3">
								<div class="flex items-center gap-3">
									<svg class="w-4 h-4 {isVerifying ? 'text-slate-300' : 'text-psan-green'}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
									<span class="text-xs font-bold text-main">{t(lang, 'sqlite_valid')}</span>
								</div>
								{#if verificationResult?.details}
									<div class="flex items-start gap-3">
										<svg class="w-4 h-4 text-psan-green" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
										<div class="space-y-1">
											<span class="text-xs font-bold text-main">{t(lang, 'tables_found')}</span>
											<p class="text-[10px] text-muted font-bold leading-relaxed">{verificationResult.details.join(', ')}</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
						<p class="text-xs text-muted font-bold leading-relaxed px-2">{t(lang, 'restore_confirm_msg')}</p>
					</div>
					<div class="flex gap-4 pt-4">
						<button class="flex-1 btn-psan-ghost py-4 text-xs font-black uppercase tracking-widest" onclick={() => showRestoreModal = false}>{t(lang, 'cancel')}</button>
						<form method="POST" action="?/restoreBackup" use:enhance={() => {
							return async ({ result }) => {
								showRestoreModal = false;
								if (result.type === 'success') {
									await invalidateAll();
									alert(t(lang, 'success'));
									window.location.reload();
								}
							};
						}} class="flex-1">
							<input type="hidden" name="filename" value={selectedBackup?.name} />
							<button type="submit" class="w-full btn-psan-primary py-4 text-xs font-black uppercase tracking-widest" disabled={isVerifying || !verificationResult?.success}>{t(lang, 'create_now')}</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.ce-block__content) { max-width: 100%; }
	:global(.ce-toolbar__content) { max-width: 100%; }
</style>

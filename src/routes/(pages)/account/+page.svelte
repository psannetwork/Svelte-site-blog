<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { t, type Language } from '$lib/i18n';
	let { data, form } = $props();

	const lang = $derived((data.settings?.site_language || 'ja') as Language);

	let avatarUrl = $state('');
	let nickname = $state('');
	let notificationEnabled = $state(false);
	let isUploading = $state(false);

	let notifications = $state<any[]>([]);
	let isLoadingNotifications = $state(false);

	async function fetchNotifications() {
		try {
			isLoadingNotifications = true;
			const res = await fetch('/api/notifications');
			const result = await res.json();
			if (result.success) notifications = result.notifications;
		} finally {
			isLoadingNotifications = false;
		}
	}

	async function markAllAsRead() {
		await fetch('/api/notifications', { method: 'POST' });
		notifications = notifications.map((n) => ({ ...n, is_read: 1 }));
	}

	$effect(() => {
		if (data.user) {
			avatarUrl = data.user.avatar_url || '';
			nickname = data.user.nickname || '';
			notificationEnabled = data.notification_enabled;
			fetchNotifications();
		}
	});

	async function handleAvatarUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		isUploading = true;
		const formData = new FormData();
		formData.append('image', file);
		try {
			const res = await fetch('/api/upload?type=avatar', { method: 'POST', body: formData });
			const result = await res.json();
			if (result.success) avatarUrl = result.file.url;
		} catch (err) {
			console.error('Upload failed', err);
		} finally {
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>{t(lang, 'settings')} | {data.settings?.site_title || 'Blog'}</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-20">
	<h2 class="text-4xl font-black tracking-tighter mb-10 uppercase text-main">{t(lang, 'settings')}</h2>

	{#if form?.success}
		<div
			class="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4"
		>
			<p
				class="bg-psan-green text-psan-green-fg px-8 py-3 rounded-full font-black shadow-2xl uppercase tracking-widest text-xs"
			>
				{t(lang, 'success')}
			</p>
		</div>
	{/if}
	{#if form?.message}
		<div
			class="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4"
		>
			<p
				class="bg-psan-pink text-white px-8 py-3 rounded-full font-black shadow-2xl uppercase tracking-widest text-xs"
			>
				{form.message}
			</p>
		</div>
	{/if}

	{#if data.user}
		<div class="space-y-12 pb-20">
			<section class="card-psan p-8 space-y-8 border-psan-green/30 border-2 shadow-psan-green/5">
				<h3 class="font-black text-sm tracking-widest text-psan-green uppercase">{t(lang, 'identity')}</h3>
				<div class="flex flex-col items-center sm:flex-row gap-8">
					<div class="relative group">
						<div
							class="w-32 h-32 rounded-[40px] bg-secondary dark:bg-slate-800 overflow-hidden shadow-xl"
						>
							{#if avatarUrl}
								<img src={avatarUrl} alt="Avatar" class="w-full h-full object-cover" />
							{:else}
								<div
									class="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300 uppercase"
								>
									{(data.user.nickname || data.user.username).substring(0, 1)}
								</div>
							{/if}
						</div>
						<label
							class="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[10px] font-black opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-[40px] uppercase tracking-widest text-center px-4"
						>
							{isUploading ? 'Uploading...' : 'Change Icon'}
							<input
								type="file"
								accept="image/*"
								class="hidden"
								onchange={handleAvatarUpload}
								disabled={isUploading}
							/>
						</label>
					</div>
					<form
						method="POST"
						action="?/updateNickname"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update({ reset: false });
								if (result.type === 'success') {
									// 更新成功時の処理
									await invalidateAll();
								}
							};
						}}
						class="flex-1 space-y-4"
					>
						<input type="hidden" name="avatar_url" value={avatarUrl} />
						<div class="space-y-2">
							<label
								for="nickname"
								class="text-[10px] font-black text-muted uppercase tracking-widest">{t(lang, 'nickname')}</label
							>
							<input
								id="nickname"
								name="nickname"
								bind:value={nickname}
								placeholder={t(lang, 'nickname_placeholder')}
								class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
							/>
						</div>

						<label
							class="flex items-center justify-between p-4 bg-secondary dark:bg-slate-800 rounded-xl cursor-pointer text-main"
						>
							<span class="text-[10px] font-black uppercase tracking-widest text-muted"
								>{t(lang, 'notifications')}</span
							>
							<input
								type="checkbox"
								name="notification_enabled"
								bind:checked={notificationEnabled}
								class="w-5 h-5 accent-psan-green"
							/>
						</label>

						<button class="btn-psan-primary w-full" disabled={isUploading}>{t(lang, 'save_profile')}</button>
					</form>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<div class="flex items-center justify-between">
					<h3 class="font-black text-sm tracking-widest text-muted uppercase">{t(lang, 'notifications')}</h3>
					{#if notifications.some((n) => !n.is_read)}
						<button
							onclick={markAllAsRead}
							class="text-[10px] font-black text-psan-green uppercase hover:underline"
							>Mark all as read</button
						>
					{/if}
				</div>

				<div class="space-y-3">
					{#each notifications as n}
						<a
							href={n.link || '#'}
							class="block p-4 rounded-2xl border transition-all {n.is_read
								? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'
								: 'bg-psan-green/5 border-psan-green/20 ring-1 ring-psan-green/10'} hover:scale-[1.01]"
						>
							<div class="flex items-start gap-3">
								<div
									class="w-2 h-2 rounded-full mt-1.5 shrink-0 {n.is_read
										? 'bg-slate-300'
										: 'bg-psan-green animate-pulse'}"
								></div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-bold text-main leading-tight">{n.content}</p>
									<p class="text-[9px] font-black text-muted uppercase mt-1">
										{new Date(n.created_at).toLocaleString()}
									</p>
								</div>
							</div>
						</a>
					{:else}
						<p
							class="text-center py-10 text-[10px] font-black text-muted uppercase tracking-[0.2em]"
						>
							{t(lang, 'no_data')}
						</p>
					{/each}
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="font-black text-sm tracking-widest text-muted uppercase">{t(lang, 'identity')}</h3>
				<div>
					<div class="text-[10px] font-black text-muted uppercase tracking-widest mb-1">
						User ID
					</div>
					<p class="text-xl font-black text-main dark:text-white">{data.user.username}</p>
				</div>
			</section>

			<section class="card-psan p-8 space-y-6">
				<h3 class="font-black text-sm tracking-widest text-psan-pink uppercase text-main">
					{t(lang, 'security')}
				</h3>
				<form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
					<input
						name="current_password"
						type="password"
						placeholder={t(lang, 'current_password')}
						class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
					/>
					<input
						name="new_password"
						type="password"
						placeholder={t(lang, 'new_password')}
						class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl p-4 font-bold text-main"
					/>
					<div class="flex justify-end">
						<button
							class="btn-psan bg-psan-pink text-white py-4 px-8 rounded-2xl font-black hover:opacity-90 transition-all"
							>{t(lang, 'change_password')}</button
						>
					</div>
				</form>
			</section>

			{#if data.allow_deletion && !data.user.is_protected}
				<section class="pt-12 border-t border-slate-100 dark:border-slate-800">
					<div
						class="p-8 bg-red-50 dark:bg-red-950/20 rounded-[32px] border border-red-100 dark:border-red-900/30"
					>
						<h3 class="text-red-600 font-black tracking-tighter text-xl mb-2 uppercase">
							{t(lang, 'danger_zone')}
						</h3>
						<p class="text-red-500/70 text-sm font-medium mb-6">
							アカウントを削除すると、これまでの投稿やコメント、画像などはすべて完全に削除されます。
						</p>
						<form
							method="POST"
							action="?/deleteAccount"
							use:enhance={({ cancel }) => {
								if (!confirm('本当にアカウントを削除しますか？ この操作は取り消せません。'))
									return cancel();
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<button class="btn-psan-danger w-full sm:w-auto">{t(lang, 'delete_account')}</button>
						</form>
					</div>
				</section>
			{/if}
		</div>
	{:else}
		<div class="text-center py-20">
			<p class="text-muted font-bold">ログインが必要です。</p>
			<a href="/auth/login" class="btn-psan-primary mt-4 inline-block">Login</a>
		</div>
	{/if}
</div>
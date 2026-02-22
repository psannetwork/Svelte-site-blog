<script lang="ts">
	import { enhance } from '$app/forms';
	import { t, type Language } from '$lib/i18n';
	import { invalidateAll } from '$app/navigation';
	let { data } = $props();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);

	let showCreateModal = $state(false);
	let isCreating = $state(false);

	// デバッグ用
	$effect(() => {
		console.log('User list:', data.users);
	});
</script>

<svelte:head>
	<title>{t(lang, 'users')} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-12">
	<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
		<div class="space-y-2">
			<h2 class="text-4xl md:text-6xl font-black tracking-tighter text-main uppercase leading-none">
				{t(lang, 'users')}
			</h2>
			<div class="flex items-center gap-3">
				<span
					class="px-3 py-1 bg-psan-green/10 text-psan-green rounded-full text-[10px] font-black uppercase tracking-widest"
					>Management</span
				>
				<p class="text-xs text-muted font-bold">
					{t(lang, 'users_desc')}
				</p>
			</div>
		</div>
		<button
			onclick={() => (showCreateModal = true)}
			class="btn-psan-primary px-10 py-4 rounded-2xl shadow-xl shadow-psan-green/20 text-sm"
		>
			{t(lang, 'create_user')}
		</button>
	</header>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- ROLE DESCRIPTIONS (Left Column) -->
		<section class="lg:col-span-1 space-y-6">
			<h3 class="text-xs font-black text-muted uppercase tracking-[0.3em] px-2">
				{t(lang, 'role_descriptions')}
			</h3>
			<div class="card-dashboard p-8 space-y-8 bg-slate-50/50 dark:bg-slate-800/20">
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span
							class="px-2 py-0.5 bg-psan-green text-white text-[8px] font-black rounded-full uppercase"
							>Admin</span
						>
					</div>
					<p class="text-xs font-bold text-main leading-relaxed">{t(lang, 'admin_desc')}</p>
				</div>
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span
							class="px-2 py-0.5 bg-psan-pink text-white text-[8px] font-black rounded-full uppercase"
							>Editor</span
						>
					</div>
					<p class="text-xs font-bold text-main leading-relaxed">{t(lang, 'editor_desc')}</p>
				</div>
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span
							class="px-2 py-0.5 bg-psan-author text-white text-[8px] font-black rounded-full uppercase"
							>Author</span
						>
					</div>
					<p class="text-xs font-bold text-main leading-relaxed">{t(lang, 'author_desc')}</p>
				</div>
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<span
							class="px-2 py-0.5 bg-slate-400 text-white text-[8px] font-black rounded-full uppercase"
							>User</span
						>
					</div>
					<p class="text-xs font-bold text-main leading-relaxed">{t(lang, 'user_desc')}</p>
				</div>
			</div>
		</section>

		<!-- MEMBER LIST (Right Columns) -->
		<section class="lg:col-span-2 space-y-6">
			<h3 class="text-xs font-black text-muted uppercase tracking-[0.3em] px-2">
				{t(lang, 'member_list')}
			</h3>
			<div class="grid gap-4">
				{#if data.users && data.users.length > 0}
					{#each data.users as user}
						<div
							class="card-dashboard p-6 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:border-psan-green transition-all"
						>
							<div class="flex items-center gap-5 flex-1 min-w-0 w-full sm:w-auto">
								<div
									class="w-14 h-14 rounded-[20px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-muted group-hover:scale-110 transition-transform shrink-0 overflow-hidden shadow-sm"
								>
									{#if user.avatar_url}
										<img src={user.avatar_url} alt="" class="w-full h-full object-cover" />
									{:else}
										<span class="text-lg opacity-40"
											>{user.username.substring(0, 1).toUpperCase()}</span
										>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="font-black text-main uppercase text-base tracking-tight truncate">
										{user.nickname || user.username}
									</div>
									<div class="flex items-center gap-2 mt-1">
										<span
											class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full {user.role ===
											'admin'
												? 'bg-psan-green/10 text-psan-green'
												: user.role === 'editor'
													? 'bg-psan-pink/10 text-psan-pink'
													: user.role === 'author'
														? 'bg-psan-author/10 text-psan-author'
														: 'bg-slate-100 text-slate-500'}"
										>
											{user.role}
										</span>
										{#if user.is_protected}
											<span
												class="text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded"
												>Protected</span
											>
										{/if}
									</div>
								</div>
							</div>

							<div
								class="flex items-center gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100 dark:border-slate-800"
							>
								<form method="POST" action="?/updateRole" use:enhance class="flex items-center">
									<input type="hidden" name="userId" value={user.id} />
									<select
										name="role"
										disabled={user.is_protected}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										class="w-full sm:w-auto bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-xl text-[10px] font-black p-3 pr-10 focus:ring-2 focus:ring-psan-green text-main cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest shadow-sm outline-none transition-all"
									>
										<option value="admin" selected={user.role === 'admin'}>ADMIN</option>
										<option value="editor" selected={user.role === 'editor'}>EDITOR</option>
										<option value="author" selected={user.role === 'author'}>AUTHOR</option>
										<option value="user" selected={user.role === 'user'}>USER</option>
									</select>
								</form>

								{#if !user.is_protected}
									<form
										method="POST"
										action="?/deleteUser"
										use:enhance={({ cancel }) => {
											if (!confirm(t(lang, 'delete_confirm'))) return cancel();
											return async ({ update }) => {
												await update();
											};
										}}
									>
										<input type="hidden" name="userId" value={user.id} />
										<button
											aria-label={t(lang, 'delete')}
											class="w-10 h-10 flex items-center justify-center text-psan-pink hover:bg-psan-pink/10 rounded-xl transition-all"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
												><path
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/></svg
											>
										</button>
									</form>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<div class="py-20 text-center card-dashboard border-dashed border-2">
						<p class="font-black text-muted uppercase tracking-[0.3em] text-[10px]">
							{t(lang, 'no_data')}
						</p>
					</div>
				{/if}
			</div>
		</section>
	</div>

	<!-- CREATE USER MODAL -->
	{#if showCreateModal}
		<div class="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12">
			<button
				aria-label={t(lang, 'close')}
				class="absolute inset-0 bg-slate-950/60 backdrop-blur-xl animate-in fade-in"
				onclick={() => (showCreateModal = false)}
			></button>
			<div
				class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[48px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300"
			>
				<form
					method="POST"
					action="?/createUser"
					use:enhance={() => {
						isCreating = true;
						return async ({ result }) => {
							isCreating = false;
							if (result.type === 'success') {
								showCreateModal = false;
								await invalidateAll();
							}
						};
					}}
					class="p-10 md:p-12 space-y-8"
				>
					<div class="flex items-center gap-4">
						<div
							class="w-12 h-12 rounded-2xl bg-psan-green flex items-center justify-center text-white shadow-lg shadow-psan-green/20"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
								/></svg
							>
						</div>
						<h3 class="text-2xl font-black text-main uppercase tracking-tighter">
							{t(lang, 'create_user')}
						</h3>
					</div>

					<div class="space-y-6">
						<div class="space-y-2">
							<label
								for="username"
								class="text-[10px] font-black text-muted uppercase tracking-widest ml-2"
								>{t(lang, 'username')}</label
							>
							<input
								id="username"
								name="username"
								required
								class="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 font-bold text-main border-none focus:ring-2 focus:ring-psan-green"
								placeholder="psan_user"
							/>
						</div>
						<div class="space-y-2">
							<label
								for="password"
								class="text-[10px] font-black text-muted uppercase tracking-widest ml-2"
								>{t(lang, 'password')}</label
							>
							<input
								id="password"
								name="password"
								type="password"
								required
								class="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 font-bold text-main border-none focus:ring-2 focus:ring-psan-green"
								placeholder="••••••••"
							/>
						</div>
						<div class="space-y-2">
							<label
								for="role"
								class="text-[10px] font-black text-muted uppercase tracking-widest ml-2"
								>{t(lang, 'role')}</label
							>
							<select
								id="role"
								name="role"
								class="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 font-black text-sm text-main border-none focus:ring-2 focus:ring-psan-green uppercase tracking-widest"
							>
								<option value="user">USER</option>
								<option value="author">AUTHOR</option>
								<option value="editor">EDITOR</option>
								<option value="admin">ADMIN</option>
							</select>
						</div>
					</div>

					<div class="flex gap-4 pt-4">
						<button
							type="button"
							class="flex-1 btn-psan-ghost py-4 text-xs font-black uppercase tracking-widest"
							onclick={() => (showCreateModal = false)}
						>
							{t(lang, 'cancel')}
						</button>
						<button
							type="submit"
							class="flex-1 btn-psan-primary py-4 text-xs font-black uppercase tracking-widest"
							disabled={isCreating}
						>
							{isCreating ? t(lang, 'saving') : t(lang, 'create_now')}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

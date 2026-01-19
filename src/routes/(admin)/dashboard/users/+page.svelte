<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<svelte:head>
	<title>User Management | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
	<header class="mb-12 flex items-center justify-between">
		<div>
			<h2 class="text-4xl font-black tracking-tighter text-main uppercase">User Management</h2>
			<p class="text-muted font-medium">ユーザーの権限を管理します。</p>
		</div>
		<button class="btn-psan-primary px-6 py-2 text-xs" onclick={() => (document.getElementById('create_user_modal') as HTMLDialogElement).showModal()}>
			+ CREATE USER
		</button>
	</header>

	<dialog id="create_user_modal" class="bg-transparent backdrop:bg-black/50 p-0 rounded-[32px] shadow-2xl open:animate-in open:fade-in open:zoom-in-95 backdrop:animate-in backdrop:fade-in">
		<div class="bg-white dark:bg-slate-900 w-full max-w-lg p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-6">
			<div class="flex items-center justify-between">
				<h3 class="text-xl font-black text-main uppercase italic">Create New User</h3>
				<form method="dialog"><button class="btn-psan-ghost py-1 px-3 text-xs">✕</button></form>
			</div>
			
			<form method="POST" action="?/createUser" use:enhance class="space-y-4">
				<div class="space-y-2">
					<label class="text-[10px] font-black uppercase text-muted" for="new_username">Username</label>
					<input id="new_username" name="username" required class="w-full bg-secondary dark:bg-slate-800 border-none rounded-xl p-3 font-bold text-main" placeholder="username" autocomplete="off" />
				</div>
				<div class="space-y-2">
					<label class="text-[10px] font-black uppercase text-muted" for="new_password">Password</label>
					<input id="new_password" type="password" name="password" required class="w-full bg-secondary dark:bg-slate-800 border-none rounded-xl p-3 font-bold text-main" placeholder="••••••••" autocomplete="new-password" />
				</div>
				<div class="space-y-2">
					<label class="text-[10px] font-black uppercase text-muted" for="new_role">Role</label>
					<select id="new_role" name="role" class="w-full bg-secondary dark:bg-slate-800 border-none rounded-xl p-3 font-bold text-main">
						<option value="user">User</option>
						<option value="vip">VIP</option>
						<option value="editor">Editor</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<button class="w-full btn-psan-primary py-3 font-black uppercase text-sm mt-4">Create Account</button>
			</form>
		</div>
	</dialog>

	<div class="grid lg:grid-cols-3 gap-8 items-start">
		<div class="lg:col-span-2 space-y-4">
			{#each data.users as user}
				<div class="card-psan p-6 flex items-center justify-between">
					<div>
						<div class="flex items-center gap-2">
							<span class="font-black text-xl text-main">{user.username}</span>
							{#if user.is_protected}
								<span class="bg-psan-green text-white text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase">System Protected</span>
							{/if}
						</div>
						<span class="text-[10px] font-bold text-psan-pink uppercase tracking-widest">{user.role}</span>
					</div>

					<div class="flex items-center gap-4">
						{#if !user.is_protected}
							<form method="POST" action="?/updateRole" use:enhance class="flex items-center gap-2">
								<input type="hidden" name="userId" value={user.id} />
								<select name="role" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-xl text-xs font-bold p-2 text-main">
									<option value="user" selected={user.role === 'user'}>USER</option>
									<option value="vip" selected={user.role === 'vip'}>VIP</option>
									<option value="editor" selected={user.role === 'editor'}>EDITOR</option>
									<option value="admin" selected={user.role === 'admin'}>ADMIN</option>
								</select>
							</form>
							<form method="POST" action="?/deleteUser" use:enhance>
								<input type="hidden" name="userId" value={user.id} />
								<button class="text-xs font-bold text-red-500 hover:text-red-700 transition">DELETE</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<aside class="card-psan p-8 space-y-6 bg-secondary dark:bg-slate-900 border-none">
			<h3 class="font-black text-xs tracking-widest text-muted uppercase">Role Descriptions</h3>
			<div class="space-y-4">
				<div>
					<div class="font-black text-psan-green text-sm">ADMIN</div>
					<p class="text-xs font-medium text-main opacity-70">サイト設定、ユーザー管理、すべてのコンテンツの操作が可能です。</p>
				</div>
				<div>
					<div class="font-black text-psan-pink text-sm">EDITOR</div>
					<p class="text-xs font-medium text-main opacity-70">記事の作成、編集、削除が可能です。サイト設定は操作できません。</p>
				</div>
				<div>
					<div class="font-black text-psan-green text-sm italic">VIP</div>
					<p class="text-xs font-medium text-main opacity-70">一般ユーザーの全機能に加え、VIP限定投稿の閲覧が可能です。</p>
				</div>
				<div>
					<div class="font-black text-muted text-sm uppercase">User</div>
					<p class="text-xs font-medium text-main opacity-70">記事の閲覧、コメントの投稿が可能です。管理画面には入れません。</p>
				</div>
			</div>
		</aside>
	</div>
	
	{#if form?.message}<p class="mt-8 text-center font-black text-psan-pink">{form.message}</p>{/if}
</div>

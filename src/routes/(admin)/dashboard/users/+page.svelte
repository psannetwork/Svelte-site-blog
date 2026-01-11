<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<div class="max-w-6xl mx-auto">
	<header class="mb-12">
		<h2 class="text-4xl font-black tracking-tighter uppercase">User Management</h2>
		<p class="text-slate-500 font-medium">ユーザーの権限を管理します。</p>
	</header>

	<div class="grid lg:grid-cols-3 gap-8 items-start">
		<div class="lg:col-span-2 space-y-4">
			{#each data.users as user}
				<div class="card-psan p-6 flex items-center justify-between">
					<div>
						<div class="flex items-center gap-2">
							<span class="font-black text-xl">{user.username}</span>
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
								<select name="role" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold p-2">
									<option value="user" selected={user.role === 'user'}>USER</option>
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

		<aside class="card-psan p-8 space-y-6 bg-slate-100 dark:bg-slate-900 border-none">
			<h3 class="font-black text-xs tracking-widest text-slate-400 uppercase">Role Descriptions</h3>
			<div class="space-y-4">
				<div>
					<div class="font-black text-psan-green text-sm">ADMIN</div>
					<p class="text-xs font-medium opacity-60">サイト設定、ユーザー管理、すべてのコンテンツの操作が可能です。</p>
				</div>
				<div>
					<div class="font-black text-psan-pink text-sm">EDITOR</div>
					<p class="text-xs font-medium opacity-60">記事の作成、編集、削除が可能です。サイト設定は操作できません。</p>
				</div>
				<div>
					<div class="font-black text-slate-400 text-sm">USER</div>
					<p class="text-xs font-medium opacity-60">記事の閲覧、コメントの投稿が可能です。管理画面には入れません。</p>
				</div>
			</div>
		</aside>
	</div>
	
	{#if form?.message}<p class="mt-8 text-center font-black text-psan-pink">{form.message}</p>{/if}
</div>

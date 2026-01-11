<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let avatarUrl = $state(data.user?.avatar_url || '');
	let isUploading = $state(false);

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

<div class="max-w-2xl mx-auto px-4 py-20">
	<h2 class="text-4xl font-black tracking-tighter mb-10 uppercase">Account Settings</h2>

	<div class="space-y-12 pb-20">
		<section class="card-psan p-8 space-y-8 border-psan-green/30 border-2 shadow-psan-green/5">
			<h3 class="font-black text-sm tracking-widest text-psan-green uppercase">Profile</h3>
			<div class="flex flex-col items-center sm:flex-row gap-8">
				<div class="relative group">
					<div class="w-32 h-32 rounded-[40px] bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-xl">
						{#if avatarUrl}
							<img src={avatarUrl} alt="Avatar" class="w-full h-full object-cover" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300 uppercase">
								{(data.user?.nickname || data.user?.username).substring(0,1)}
							</div>
						{/if}
					</div>
					<label class="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[10px] font-black opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-[40px] uppercase tracking-widest">
						{isUploading ? 'Uploading...' : 'Change Icon'}
						<input type="file" accept="image/*" class="hidden" onchange={handleAvatarUpload} disabled={isUploading} />
					</label>
				</div>
				<form method="POST" action="?/updateNickname" use:enhance class="flex-1 space-y-4">
					<input type="hidden" name="avatar_url" value={avatarUrl} />
					<div class="space-y-2">
						<label for="nickname" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nickname</label>
						<input id="nickname" name="nickname" value={data.user?.nickname || ''} placeholder="未設定（IDが表示されます）" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold" />
					</div>
					<button class="btn-psan-primary w-full">Save Profile</button>
				</form>
			</div>
		</section>

		<section class="card-psan p-8 space-y-6">
			<h3 class="font-black text-sm tracking-widest text-slate-400 uppercase">Identity</h3>
			<div>
				<div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">User ID</div>
				<p class="text-xl font-black dark:text-white">{data.user?.username}</p>
			</div>
		</section>

		<section class="card-psan p-8 space-y-6">
			<h3 class="font-black text-sm tracking-widest text-psan-pink uppercase">Security</h3>
			<form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
				<input name="current_password" type="password" placeholder="Current Password" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold" />
				<input name="new_password" type="password" placeholder="New Password" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold" />
				<div class="flex justify-end">
					<button class="btn-psan bg-psan-pink text-white py-4 px-8 rounded-2xl font-black">Change Password</button>
				</div>
			</form>
		</section>

		{#if data.allow_deletion && !data.user.is_protected}
			<section class="pt-12 border-t border-slate-100 dark:border-slate-800">
				<div class="p-8 bg-red-50 dark:bg-red-950/20 rounded-[32px] border border-red-100 dark:border-red-900/30">
					<h3 class="text-red-600 font-black tracking-tighter text-xl mb-2 uppercase">Danger Zone</h3>
					<p class="text-red-500/70 text-sm font-medium mb-6">アカウントを削除すると、これまでの投稿やコメント、画像などはすべて完全に削除され、復元することはできません。</p>
					<form method="POST" action="?/deleteAccount" use:enhance={() => {
						return ({ confirm }) => {
							if (!confirm("本当にアカウントを削除しますか？ この操作は取り消せません。")) return;
						};
					}}>
						<button class="btn-psan-danger w-full sm:w-auto">Delete My Account</button>
					</form>
				</div>
			</section>
		{/if}

		{#if form?.success}<p class="text-center font-black text-psan-green animate-pulse">SAVED SUCCESSFULLY!</p>{/if}
		{#if form?.message}<p class="text-center font-black text-psan-pink">{form.message}</p>{/if}
	</div>
</div>
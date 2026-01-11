<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-20">
	<h2 class="text-4xl font-black tracking-tighter mb-10 uppercase">Account Settings</h2>

	<div class="space-y-12">
		<!-- ユーザーID表示 (固定) -->
		<section class="card-psan p-8 space-y-2 opacity-60">
			<h3 class="font-black text-sm tracking-widest text-slate-400 uppercase">User ID (Permanent)</h3>
			<p class="text-xl font-bold dark:text-white">{data.user?.username}</p>
		</section>

		<!-- ニックネーム変更 -->
		<section class="card-psan p-8 space-y-6 border-psan-green/30 border-2">
			<h3 class="font-black text-sm tracking-widest text-psan-green uppercase">Nickname (Display Name)</h3>
			<form method="POST" action="?/updateNickname" use:enhance class="flex flex-col sm:flex-row gap-4">
				<input name="nickname" value={data.user?.nickname || ''} placeholder="未設定（IDが表示されます）" class="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold" />
				<button class="btn-psan-primary py-4 px-8">Update Nickname</button>
			</form>
		</section>

		<!-- パスワード変更 -->
		<section class="card-psan p-8 space-y-6">
			<h3 class="font-black text-sm tracking-widest text-psan-pink uppercase">Security</h3>
			<form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
				<input name="current_password" type="password" placeholder="Current Password" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold" />
				<input name="new_password" type="password" placeholder="New Password" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold" />
				<div class="flex justify-end">
					<button class="btn-psan bg-psan-pink text-white py-4 px-8">Change Password</button>
				</div>
			</form>
		</section>

		{#if form?.success}<p class="text-center font-black text-psan-green animate-pulse">SAVED SUCCESSFULLY!</p>{/if}
		{#if form?.message}<p class="text-center font-black text-psan-pink">{form.message}</p>{/if}
	</div>
</div>
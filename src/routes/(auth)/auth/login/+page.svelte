<script lang="ts">
	import type { ActionData, PageData } from "./$types";
	import { enhance } from '$app/forms';
	let { form, data } = $props<{ form: ActionData, data: PageData }>();
</script>

<svelte:head>
	{#if data.settings.enable_turnstile}
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
	{/if}
</svelte:head>

<div class="w-full max-w-md px-4 py-20">
	<div class="card-psan p-8 md:p-12 shadow-2xl shadow-psan-green/5 relative overflow-hidden group">
		<!-- 装飾的な背景要素 -->
		<div class="absolute -top-20 -right-20 w-40 h-40 bg-psan-green/10 rounded-full blur-3xl group-hover:bg-psan-green/20 transition-colors duration-700"></div>
		
		<div class="relative z-10 text-center mb-10">
			<div class="w-16 h-16 bg-psan-green rounded-2xl mx-auto mb-6 flex items-center justify-center font-black text-white text-3xl italic rotate-12 shadow-lg shadow-psan-green/20">P.</div>
			<h2 class="text-3xl font-black tracking-tighter uppercase dark:text-white">Welcome Back</h2>
			<p class="mt-2 text-sm font-medium text-slate-400">ログインしてダッシュボードにアクセス</p>
		</div>

		<form method="POST" use:enhance class="space-y-6 relative z-10">
			<div class="space-y-4">
				<div class="space-y-2">
					<label for="username" class="text-[10px] font-black tracking-widest text-slate-400 uppercase">User ID</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-psan-green transition-all dark:text-white"
						placeholder="Username"
					/>
				</div>
				<div class="space-y-2">
					<label for="password" class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-psan-green transition-all dark:text-white"
						placeholder="••••••••"
					/>
				</div>
			</div>

			{#if data.settings.enable_turnstile}
				<div class="cf-turnstile flex justify-center" data-sitekey={data.settings.turnstile_site_key}></div>
			{/if}

			{#if form?.message}
				<p class="text-psan-pink text-xs font-bold text-center animate-bounce">{form.message}</p>
			{/if}

			<button type="submit" class="btn-psan-primary w-full py-4 text-lg">
				Login
			</button>
		</form>

		<div class="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center space-y-4 relative z-10">
			{#if data.settings?.allow_signup === 'true'}
				<p class="text-xs font-bold text-slate-400">
					アカウントをお持ちでないですか？
					<a href="/auth/register" class="text-psan-green hover:underline ml-1">新規登録</a>
				</p>
			{/if}
			<a href="/" class="block text-[10px] font-black tracking-widest text-slate-300 hover:text-slate-500 transition-colors uppercase">Back to Home</a>
		</div>
	</div>
</div>

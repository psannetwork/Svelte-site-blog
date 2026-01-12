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
		<div class="absolute -top-20 -left-20 w-40 h-40 bg-psan-pink/10 rounded-full blur-3xl"></div>
		
		<div class="relative z-10 text-center mb-10">
			<div class="w-16 h-16 bg-psan-pink rounded-2xl mx-auto mb-6 flex items-center justify-center font-black text-white text-3xl italic rotate-12 shadow-lg shadow-psan-pink/20">P.</div>
			<h2 class="text-3xl font-black tracking-tighter uppercase text-main">Join Us</h2>
			<p class="mt-2 text-sm font-medium text-muted">新しいアカウントを作成</p>
		</div>

		{#if data.settings?.allow_signup === 'true'}
			<form method="POST" use:enhance class="space-y-6 relative z-10">
				<div class="space-y-4">
					<div class="space-y-2">
						<label for="username" class="text-[10px] font-black tracking-widest text-muted uppercase">User ID</label>
						<input
							id="username"
							name="username"
							type="text"
							required
							class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-2xl p-4 font-bold focus:ring-2 ring-psan-pink transition-all text-main"
							placeholder="Pick a unique ID"
						/>
					</div>
					<div class="space-y-2">
						<label for="password" class="text-[10px] font-black tracking-widest text-muted uppercase">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-none rounded-2xl p-4 font-bold focus:ring-2 ring-psan-pink transition-all text-main"
							placeholder="••••••••"
						/>
					</div>
				</div>

				{#if data.settings.enable_turnstile}
					<div class="cf-turnstile flex justify-center" data-sitekey={data.settings.turnstile_site_key}></div>
				{/if}

				{#if form?.message}
					<p class="text-psan-pink text-xs font-bold text-center">{form.message}</p>
				{/if}

				<button type="submit" class="btn-psan bg-psan-pink text-white w-full py-4 text-lg font-black rounded-2xl shadow-lg shadow-psan-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
					Register
				</button>
			</form>
		{:else}
			<div class="text-center py-10">
				<p class="text-sm font-bold text-muted">現在、新規登録は受け付けておりません。</p>
			</div>
		{/if}

		<div class="mt-10 pt-8 border-t border-[--border-color] dark:border-slate-800 text-center space-y-4 relative z-10">
			<p class="text-xs font-bold text-muted">
				既にアカウントをお持ちですか？
				<a href="/auth/login" class="text-psan-pink hover:underline ml-1">ログイン</a>
			</p>
			<a href="/" class="block text-[10px] font-black tracking-widest text-muted opacity-50 hover:opacity-100 transition-colors uppercase">Back to Home</a>
		</div>
	</div>
</div>
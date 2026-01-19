<script lang="ts">
	let { form } = $props();
</script>

<div class="min-h-screen flex items-center justify-center px-4">
	<div class="max-w-md w-full card-psan p-10 shadow-2xl">
		<div class="text-center mb-10">
			<div
				class="w-16 h-16 bg-psan-green rounded-2xl mx-auto mb-6 flex items-center justify-center font-black text-psan-green-fg text-3xl italic rotate-12 shadow-lg shadow-psan-green/20"
			>
				P.
			</div>
			<h1 class="text-3xl font-black tracking-tighter text-main">WELCOME</h1>
			<p class="text-muted font-medium mt-2 text-sm">
				最初の管理者アカウントを作成して、サイトを開始しましょう。
			</p>
		</div>

		<form method="POST" class="space-y-6">
			<div class="space-y-2">
				<label for="username" class="text-[10px] font-black tracking-widest text-muted uppercase"
					>Admin Username</label
				>
				<input
					id="username"
					name="username"
					required
					class="w-full bg-secondary dark:bg-slate-800 border-none rounded-2xl p-4 font-bold text-main"
					placeholder="admin"
				/>
			</div>
			<div class="space-y-2">
				<label for="password" class="text-[10px] font-black tracking-widest text-muted uppercase"
					>Password (min 8 characters)</label
				>
				<input
					id="password"
					name="password"
					type="password"
					required
					class="w-full bg-secondary dark:bg-slate-800 border-none rounded-2xl p-4 font-bold text-main"
					placeholder="••••••••"
				/>
			</div>

			{#if form?.message}<p class="text-psan-pink text-xs font-bold text-center">
					{form.message}
				</p>{/if}

			<button class="btn-psan-primary w-full py-4 text-lg uppercase tracking-widest"
				>Start PSANBLOG</button
			>
		</form>
	</div>
</div>

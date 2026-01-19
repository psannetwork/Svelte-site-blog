<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Manage Pages | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto">
	<header class="mb-12">
		<h2 class="text-4xl font-black tracking-tighter text-main uppercase">Static Pages</h2>
		<p class="text-muted font-medium">
			サイトの主要ページ（ホーム、About等）をリッチエディタで編集します。
		</p>
	</header>

	<div class="grid gap-6">
		{#each data.pages as page}
			{@const p = page as any}
			<div class="card-psan p-8 flex items-center justify-between group">
				<div>
					<div class="flex items-center gap-3 mb-1">
						<h3 class="text-2xl font-black text-main">{p.title}</h3>
						{#if p.id === 'home' || p.id === 'about'}
							<span
								class="bg-psan-green/10 text-psan-green text-[8px] font-black px-2 py-0.5 rounded tracking-widest uppercase border border-psan-green/20"
								>System Page</span
							>
						{/if}
					</div>
					<p class="text-xs text-muted font-bold">
						Last updated: {new Date(p.updated_at).toLocaleString()} • ID: {p.id}
					</p>
				</div>

				<a
					href="/dashboard/pages/{p.id}"
					class="btn-psan-ghost py-2 px-8 text-xs dark:bg-slate-700 dark:text-white dark:border-slate-500 hover:bg-psan-green hover:text-white hover:border-psan-green transition-all shadow-sm uppercase tracking-widest"
				>
					Edit Content
				</a>
			</div>
		{/each}
	</div>
</div>

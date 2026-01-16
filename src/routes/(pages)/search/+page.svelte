<script lang="ts">
	import { onMount } from 'svelte';
	let query = $state('');
	let results = $state<any[]>([]);
	let isSearching = $state(false);

	async function doSearch() {
		if (!query.trim()) {
			results = [];
			return;
		}
		isSearching = true;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
			const data = await res.json();
			results = data.posts || [];
		} finally {
			isSearching = false;
		}
	}

	function handleInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		query = val;
		// 簡易的なデバウンス
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(doSearch, 300);
	}

	let searchTimeout: any;
</script>

<svelte:head>
	<title>Search | {data.settings?.site_title || 'Blog'}</title>
	{#if data.settings.enable_turnstile === 'true'}
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
	{/if}
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-20">
	<div class="mb-12">
		<h2 class="text-4xl font-black tracking-tighter uppercase mb-8">Search Posts</h2>
		<form onsubmit={(e) => e.preventDefault()} class="relative group">
			<input 
				type="text" 
				placeholder="キーワードを入力..." 
				bind:value={query}
				oninput={handleInput}
				class="w-full bg-secondary dark:bg-slate-800 border-none rounded-[32px] p-8 text-xl font-bold focus:ring-4 ring-psan-green/20 transition-all shadow-xl text-main"
			/>
			<div class="absolute right-8 top-1/2 -translate-y-1/2 text-muted">
				{#if isSearching}
					<div class="w-6 h-6 border-4 border-psan-green border-t-transparent rounded-full animate-spin"></div>
				{:else}
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
				{/if}
			</div>
		</form>
	</div>

	<div class="space-y-6">
		{#each results as post}
			<a href="/pages/{post.id}" class="block card-psan p-8 hover:scale-[1.02] transition-all group">
				<div class="flex justify-between items-start gap-4">
					<div>
						<h3 class="text-2xl font-black group-hover:text-psan-green transition-colors">{post.title}</h3>
						{#if post.summary}
							<p class="text-muted mt-2 font-medium line-clamp-2">{post.summary}</p>
						{/if}
					</div>
					<span class="text-[10px] font-black text-muted uppercase shrink-0 mt-2">{new Date(post.created_at).toLocaleDateString()}</span>
				</div>
			</a>
		{:else}
			{#if query && !isSearching}
				<p class="text-center py-20 text-muted font-bold opacity-40 uppercase tracking-widest">No results found for "{query}"</p>
			{:else if !query}
				<p class="text-center py-20 text-muted font-bold opacity-20 uppercase tracking-widest italic">Start typing to search...</p>
			{/if}
		{/each}
	</div>
</div>

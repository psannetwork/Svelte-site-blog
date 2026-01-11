<script lang="ts">
	let { data } = $props();
</script>

<div class="max-w-7xl mx-auto">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
		<div>
			<h2 class="text-4xl font-black tracking-tighter">POSTS</h2>
			<p class="text-slate-500 dark:text-slate-400 font-medium">これまでに公開したストーリーの一覧です。</p>
		</div>
		<a href="/dashboard/posts/new" class="btn-psan-primary">新規投稿作成</a>
	</header>

	<div class="grid gap-6">
		{#each data.posts as post}
			<div class="card-psan p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
				<div class="flex-1">
					<div class="flex items-center gap-3 mb-2">
						<span class="text-[10px] font-black tracking-widest text-psan-green uppercase">Published</span>
						<span class="text-[10px] font-black tracking-widest opacity-30">{new Date(post.created_at).toLocaleDateString()}</span>
					</div>
					<h3 class="text-2xl font-black group-hover:text-psan-green transition-colors">{post.title}</h3>
					<p class="text-sm opacity-50 font-medium line-clamp-1 mt-1">{post.summary || '概要なし'}</p>
				</div>
				<div class="flex items-center gap-2">
					<a href="/admin/posts/{post.id}" class="px-4 py-2 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-psan-green hover:text-white transition-all">編集</a>
					<button class="px-4 py-2 rounded-xl font-bold text-sm text-psan-pink hover:bg-psan-pink/10 transition-all">削除</button>
				</div>
			</div>
		{:else}
			<div class="py-20 text-center card-psan border-dashed border-2">
				<p class="font-bold opacity-30">NO POSTS FOUND.</p>
			</div>
		{/each}
	</div>
</div>

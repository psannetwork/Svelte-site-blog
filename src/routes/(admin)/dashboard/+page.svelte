<script lang="ts">
	let { data } = $props();
</script>

<div class="max-w-7xl mx-auto">
	<header class="mb-12">
		<h2 class="text-4xl font-black tracking-tighter">OVERVIEW</h2>
		<p class="text-slate-500 dark:text-slate-400 font-medium">サイトの現在のステータスを確認しましょう。</p>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
		<div class="card-psan p-8">
			<div class="text-[10px] font-black tracking-widest opacity-50 uppercase mb-2">Total Posts</div>
			<div class="text-5xl font-black text-psan-green">{data.posts.length}</div>
		</div>
		<div class="card-psan p-8">
			<div class="text-[10px] font-black tracking-widest opacity-50 uppercase mb-2">Total Comments</div>
			<div class="text-5xl font-black text-psan-pink">{data.comments.length}</div>
		</div>
		<div class="card-psan p-8">
			<div class="text-[10px] font-black tracking-widest opacity-50 uppercase mb-2">Registrations</div>
			<div class="text-2xl font-black">{data.settings.allow_registration === 'true' ? 'ENABLED' : 'DISABLED'}</div>
		</div>
		<div class="card-psan p-8">
			<div class="text-[10px] font-black tracking-widest opacity-50 uppercase mb-2">Security</div>
			<div class="text-2xl font-black">{data.settings.enable_turnstile === 'true' ? 'TURNSTILE ON' : 'BASIC'}</div>
		</div>
	</div>

	<div class="grid lg:grid-cols-2 gap-8">
		<!-- 最近の投稿 -->
		<section class="space-y-4">
			<h3 class="font-black tracking-tighter text-xl px-2 uppercase">Recent Posts</h3>
			<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
				<div class="divide-y dark:divide-slate-800">
					{#each data.posts.slice(0, 5) as post}
						<a href="/admin/posts/{post.id}" class="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
							<span class="font-bold">{post.title}</span>
							<span class="text-[10px] font-bold opacity-30">{new Date(post.created_at).toLocaleDateString()}</span>
						</a>
					{/each}
				</div>
			</div>
		</section>

		<!-- 最近のコメント -->
		<section class="space-y-4">
			<h3 class="font-black tracking-tighter text-xl px-2 uppercase text-psan-pink">Recent Comments</h3>
			<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
				<div class="divide-y dark:divide-slate-800">
					{#each data.comments.slice(0, 5) as comment}
						<div class="p-6">
							<div class="flex justify-between items-center mb-1">
								<span class="text-sm font-black text-psan-green">{comment.username}</span>
								<span class="text-[10px] font-bold opacity-30">{new Date(comment.created_at).toLocaleDateString()}</span>
							</div>
							<p class="text-xs font-medium opacity-70 line-clamp-1">{comment.content}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>
	</div>
</div>

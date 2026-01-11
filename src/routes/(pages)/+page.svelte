<script lang="ts">
	import type { PageData } from "./$types";
	let { data } = $props<{ data: PageData }>();
</script>

<!-- ヒーロー -->
<section class="relative pt-20 pb-32 overflow-hidden border-b border-[--border-color]">
	<div class="max-w-7xl mx-auto px-4 relative">
		<div class="max-w-4xl prose dark:prose-invert">
			<!-- エディタコンテンツのレンダリング -->
			{@html data.homeHtml}
		</div>
		<div class="mt-10 flex flex-wrap gap-4">
			<a href="/auth/register" class="btn-psan-primary uppercase text-sm tracking-widest">Get Started</a>
			<a href="/about" class="btn-psan-ghost uppercase text-sm tracking-widest">Learn More</a>
		</div>
	</div>
</section>

<!-- 記事リスト -->
<section class="py-24 transition-colors">
	<div class="max-w-7xl mx-auto px-4">
		<div class="flex items-end justify-between mb-16 px-4">
			<div>
				<h2 class="text-3xl font-black uppercase tracking-tighter">LATEST STORIES</h2>
				<div class="h-1.5 w-12 bg-psan-pink mt-2"></div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
			{#each data.posts as post}
				<article class="group px-4">
					<a href="/pages/{post.id}" class="block">
						<div class="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden mb-6">
							<div class="absolute inset-0 bg-gradient-to-br from-psan-green/10 to-psan-pink/10 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"></div>
							<div class="absolute inset-0 flex items-center justify-center">
								<span class="text-slate-400 dark:text-slate-500 text-6xl font-black italic">{post.title.substring(0, 1)}</span>
							</div>
						</div>
						<div class="space-y-3">
							<div class="flex items-center gap-3 text-[10px] font-black tracking-widest text-muted uppercase">
								<span>{new Date(post.created_at).toLocaleDateString()}</span>
								<span class="w-1 h-1 bg-psan-green rounded-full"></span>
								{#if post.visibility === 'vip'}
									<span class="text-psan-pink font-black">💎 VIP</span>
								{:else if post.visibility === 'draft'}
									<span class="italic">📁 DRAFT</span>
								{:else}
									<span class="text-psan-green">ARTICLE</span>
								{/if}
							</div>
							<h3 class="text-2xl font-black leading-tight group-hover:text-psan-green transition-colors">
								{post.title}
							</h3>
							<p class="text-muted text-sm line-clamp-2 font-medium leading-relaxed">
								{post.summary || 'No summary available.'}
							</p>
						</div>
					</a>
				</article>
			{:else}
				<div class="col-span-full py-32 text-center border-2 border-dashed border-[--border-color] rounded-[40px]">
					<p class="text-muted font-bold tracking-tighter uppercase">No stories published yet.</p>
				</div>
			{/each}
		</div>
	</div>
</section>
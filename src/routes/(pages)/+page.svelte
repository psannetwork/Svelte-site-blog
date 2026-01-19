<script lang="ts">
	import type { PageData } from './$types';
	let { data } = $props<{ data: PageData }>();
</script>

<!-- 編集ボタン (Adminのみ) -->
{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
	<div class="fixed bottom-8 right-8 z-[100]">
		<a
			href="/dashboard/pages/home"
			class="flex items-center gap-2 bg-psan-green text-white px-6 py-3 rounded-full font-black shadow-2xl hover:scale-105 transition-all uppercase tracking-widest text-xs border-4 border-white dark:border-slate-900"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="3"
					d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
				/></svg
			>
			Edit Page
		</a>
	</div>
{/if}

<!-- メインコンテンツ -->
<article class="relative pt-20 pb-20 overflow-hidden transition-colors">
	<div class="max-w-7xl mx-auto px-4 relative">
		<div
			class="max-w-5xl prose prose-xl dark:prose-invert prose-headings:font-black prose-headings:tracking-tighter prose-p:font-medium prose-img:rounded-[40px] prose-img:shadow-2xl"
		>
			{@html data.homeHtml}
		</div>
	</div>
</article>

<!-- 記事リスト (固定位置に戻す) -->
<section class="py-24 border-t border-slate-100 dark:border-slate-800 transition-colors">
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
						<div
							class="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden mb-6"
						>
							<div
								class="absolute inset-0 bg-gradient-to-br from-psan-green/10 to-psan-pink/10 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
							></div>
							<div class="absolute inset-0 flex items-center justify-center">
								<span class="text-slate-400 dark:text-slate-500 text-6xl font-black italic"
									>{post.title.substring(0, 1)}</span
								>
							</div>
						</div>
						<div class="space-y-3">
							<div
								class="flex items-center gap-3 text-[10px] font-black tracking-widest text-muted uppercase"
							>
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
							<h3
								class="text-2xl font-black leading-tight group-hover:text-psan-green transition-colors"
							>
								{post.title}
							</h3>
							<p class="text-muted text-sm line-clamp-2 font-medium leading-relaxed">
								{post.summary || 'No summary available.'}
							</p>
						</div>
					</a>
				</article>
			{:else}
				<div
					class="col-span-full py-32 text-center border-2 border-dashed border-[--border-color] rounded-[40px]"
				>
					<p class="text-muted font-bold tracking-tighter uppercase">No stories published yet.</p>
				</div>
			{/each}
		</div>
	</div>
</section>

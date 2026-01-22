<script lang="ts">
	import type { PageData } from './$types';
	import { t, type Language } from '$lib/i18n';
	let { data } = $props<{ data: PageData }>();
	const lang = $derived((data.settings?.site_language || 'ja') as Language);
</script>

<!-- 編集ボタン (Adminのみ) -->
{#if data.user?.role === 'admin' || data.user?.role === 'editor'}
	<div class="fixed bottom-8 right-8 z-[100]">
		<a
			href="/dashboard/pages/home"
			class="flex items-center gap-2 bg-psan-dark dark:bg-psan-green text-white dark:text-psan-green-fg px-6 py-3 rounded-full font-black shadow-2xl hover:scale-105 transition-all uppercase tracking-widest text-xs border-4 border-white dark:border-slate-900"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="3"
					d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
				/></svg
			>
			{t(lang, 'edit_page')}
		</a>
	</div>
{/if}

<!-- メインコンテンツ -->
<article class="relative pt-20 pb-20 overflow-hidden transition-colors" style="overflow-x: clip;">
	<div class="max-w-7xl mx-auto px-4 relative">
		<div
			class="max-w-5xl prose prose-xl dark:prose-invert w-full prose-headings:font-black prose-headings:tracking-tighter prose-p:font-medium prose-img:rounded-[40px] prose-img:shadow-2xl prose-img:max-w-full overflow-x-hidden break-words"
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
				<h2 class="text-3xl font-black uppercase tracking-tighter">{t(lang, 'latest_stories')}</h2>
				<div class="h-1.5 w-12 bg-psan-pink mt-2"></div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
			{#each data.posts as post}
				<article class="group px-4">
					<a href="/{post.id}" class="block">
						<div
							class="w-full aspect-video rounded-3xl bg-psan-green/10 dark:bg-slate-800 mb-6 overflow-hidden flex items-center justify-center relative group-hover:scale-[1.02] transition-transform duration-500"
						>
							{#if post.thumbnail_url}
								<img src={post.thumbnail_url} alt="" class="w-full h-full object-cover" />
							{:else}
								<span
									class="text-6xl font-black text-psan-green/20 dark:text-slate-500 uppercase italic tracking-tighter"
									>{post.title.substring(0, 1)}</span
								>
							{/if}
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
								<span class="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
								<div class="flex items-center gap-1.5 px-3 py-1 bg-psan-pink/10 dark:bg-psan-pink/20 rounded-full border border-psan-pink/20 dark:border-psan-pink/40 text-psan-pink transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-110 hover:shadow-xl hover:shadow-psan-pink/30 hover:bg-psan-pink hover:text-white cursor-default">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
									<span class="text-[9px] font-black italic tracking-tight uppercase">{t(lang, 'by_author').replace('{author}', post.author_name)}</span>
								</div>
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
					<p class="text-muted font-bold tracking-tighter uppercase">{t(lang, 'no_data')}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

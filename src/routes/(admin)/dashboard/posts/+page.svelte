<script lang="ts">
	import { enhance } from '$app/forms';
	let { data } = $props();
</script>

<div class="max-w-7xl mx-auto">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-8 md:12 gap-4">
		<div>
			<h2 class="text-3xl md:text-4xl font-black tracking-tighter">POSTS</h2>
			<p class="text-xs md:text-sm text-slate-500 font-medium">これまでに公開したストーリーの一覧です。</p>
		</div>
		<a href="/dashboard/posts/new" class="btn-psan-primary w-full md:w-auto text-sm">新規投稿作成</a>
	</header>

	<div class="grid gap-4 md:gap-6">
		{#each data.posts as post}
			<div class="card-psan p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 group">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-[8px] md:text-[10px] font-black tracking-widest px-2 py-0.5 rounded
							{post.visibility === 'public' ? 'bg-psan-green text-white' : 
							 post.visibility === 'draft' ? 'bg-slate-200 text-slate-600' : 
							 post.visibility === 'review' ? 'bg-psan-pink text-white animate-pulse' : 
							 'bg-psan-dark text-white'} uppercase">
							{post.visibility}
						</span>
						<span class="text-[8px] md:text-[10px] font-black tracking-widest opacity-30">{new Date(post.created_at).toLocaleDateString()}</span>
					</div>
					<h3 class="text-xl md:text-2xl font-black group-hover:text-psan-green transition-colors truncate">{post.title}</h3>
					<p class="text-xs opacity-50 font-medium line-clamp-1 mt-1">By {post.author_name}</p>
				</div>
				
				<div class="flex items-center justify-between md:justify-end gap-2 md:gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
					<form method="POST" action="?/updateStatus" use:enhance class="flex items-center">
						<input type="hidden" name="id" value={post.id} />
						<select name="status" onchange={(e) => e.currentTarget.form?.requestSubmit()} class="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black p-2 pr-8 focus:ring-psan-green">
							<option value="draft" selected={post.visibility === 'draft'}>DRAFT</option>
							<option value="review" selected={post.visibility === 'review'}>REVIEW</option>
							<option value="public" selected={post.visibility === 'public'}>PUBLIC</option>
							<option value="unlisted" selected={post.visibility === 'unlisted'}>UNLISTED</option>
							<option value="vip" selected={post.visibility === 'vip'}>VIP</option>
							<option value="private" selected={post.visibility === 'private'}>PRIVATE</option>
						</select>
					</form>

					<div class="flex items-center gap-1 md:gap-2">
						<a href="/dashboard/posts/{post.id}" class="p-2 md:p-3 hover:text-psan-green transition-all bg-slate-50 dark:bg-slate-800 rounded-xl" title="Edit">
							<svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
						</a>
						<form method="POST" action="?/deletePost" use:enhance>
							<input type="hidden" name="id" value={post.id} />
							<button class="p-2 md:p-3 text-psan-pink hover:bg-psan-pink/10 rounded-xl transition-all" title="Delete">
								<svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
							</button>
						</form>
					</div>
				</div>
			</div>
		{:else}
			<div class="py-24 text-center card-psan border-dashed border-2">
				<p class="font-bold opacity-20 uppercase tracking-widest text-xs">No posts found.</p>
			</div>
		{/each}
	</div>
</div>

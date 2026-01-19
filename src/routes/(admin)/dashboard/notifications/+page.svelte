<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Notifications | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8">
	<header class="flex items-center justify-between">
		<div>
			<h2 class="text-3xl font-black tracking-tighter text-main uppercase">Notifications</h2>
			<p class="text-sm text-muted font-bold">あなたへの通知一覧です。</p>
		</div>
		<form method="POST" action="/api/notifications">
			<button class="btn-action-sm flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/></svg
				>
				Mark all as read
			</button>
		</form>
	</header>

	<div class="card-psan divide-y border-[--border-color]">
		{#if data.notificationResult.success}
			{#if data.notificationResult.notifications && data.notificationResult.notifications.length > 0}
				{#each data.notificationResult.notifications as note}
					<a
						href={note.link || '#'}
						class="block p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors {note.is_read
							? 'opacity-60'
							: 'bg-green-50/50 dark:bg-green-900/10'}"
					>
						<div class="flex items-start gap-4">
							<div
								class="p-2 rounded-xl {note.type === 'reply'
									? 'bg-blue-100 text-blue-600'
									: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}"
							>
								{#if note.type === 'reply'}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
										/></svg
									>
								{:else}
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
										/></svg
									>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-bold text-main mb-1">{note.content}</p>
								<p class="text-xs font-black text-muted uppercase tracking-wider">
									{new Date(note.created_at).toLocaleString()}
								</p>
							</div>
							{#if !note.is_read}
								<span class="w-2 h-2 rounded-full bg-psan-green shrink-0 mt-2"></span>
							{/if}
						</div>
					</a>
				{/each}
			{:else}
				<div class="p-20 text-center text-muted font-bold opacity-50">Notifications not found.</div>
			{/if}
		{:else}
			<div class="p-10 text-center text-psan-pink font-bold">
				Error: {data.notificationResult.error || 'Unknown error'}
			</div>
		{/if}
	</div>
</div>

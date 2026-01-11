<script lang="ts">
	import { onMount } from 'svelte';
	import type { ActionData } from './$types';

	let { form } = $props<{ form: ActionData }>();
	let editor: any;
	let title = $state('');
	let summary = $state('');
	let visibility = $state('public');
	let editorData = $state('');

	onMount(async () => {
		const EditorJS = (await import('@editorjs/editorjs')).default;
		const Header = (await import('@editorjs/header')).default;
		const List = (await import('@editorjs/list')).default;
		const Quote = (await import('@editorjs/quote')).default;
		const Code = (await import('@editorjs/code')).default;
						const Image = (await import('@editorjs/image')).default;
						const Embed = (await import('@editorjs/embed')).default;
						const Marker = (await import('@editorjs/marker')).default;
						const ColorPlugin = (await import('editorjs-text-color-plugin')).default;
				
						editor = new EditorJS({
							holder: 'editorjs',
							tools: {
								header: Header,
								list: List,
								quote: Quote,
								code: Code,
								marker: Marker,
								color: {
									class: ColorPlugin,
									config: {
										colorCollections: ['#00CC99', '#EB2D8C', '#1A1A1A', '#FF1313', '#2388FF', '#FFD300'],
										defaultColor: '#1A1A1A',
										type: 'text',
										customPicker: true
									}
								},
								image: {
									class: Image,
									config: { endpoints: { byFile: '/api/upload' } }
								},
								embed: {
									class: Embed,
									config: {
										services: {
											youtube: true,
											vimeo: true,
											twitter: true
										}
									}
								}
							},			placeholder: 'Start writing...',
			onChange: async () => {
				const data = await editor.save();
				editorData = JSON.stringify(data);
			}
		});
	});
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<form id="post-form" method="POST" class="space-y-8">
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<h2 class="text-4xl font-black tracking-tighter">CREATE STORY</h2>
				<div class="flex gap-4 mt-2">
					<select name="visibility" bind:value={visibility} class="text-[10px] font-black bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1 uppercase tracking-widest cursor-pointer">
						<option value="draft">📁 Draft (下書き)</option>
						<option value="public">🌍 Public (公開)</option>
						<option value="unlisted">🔗 Unlisted (限定公開)</option>
						<option value="private">🔒 Private (自分のみ)</option>
						<option value="vip">💎 VIP (メンバー限定)</option>
					</select>
				</div>
			</div>
			<div class="flex gap-3">
				<a href="/dashboard/posts" class="btn-psan bg-slate-200 dark:bg-slate-800 text-xs">Discard</a>
				<button class="btn-psan-primary py-3 px-10 text-sm">Publish</button>
			</div>
		</header>

		<div class="card-psan p-6 md:p-12 space-y-8">
			<input
				id="title"
				type="text"
				name="title"
				bind:value={title}
				class="w-full text-4xl md:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 dark:text-white placeholder:opacity-20"
				placeholder="Title here..."
			/>

			<textarea
				id="summary"
				name="summary"
				bind:value={summary}
				rows="2"
				class="w-full text-xl font-medium bg-transparent border-b border-slate-100 dark:border-slate-800 focus:border-psan-green focus:ring-0 p-0 pb-4 dark:text-slate-400 placeholder:opacity-20"
				placeholder="Add a short summary..."
			></textarea>

			<div class="prose prose-slate dark:prose-invert max-w-none min-h-[500px]">
				<div id="editorjs"></div>
			</div>
		</div>

		<input type="hidden" name="editorData" value={editorData} />
		{#if form?.message}<p class="text-psan-pink font-bold text-center">{form.message}</p>{/if}
	</form>
</div>
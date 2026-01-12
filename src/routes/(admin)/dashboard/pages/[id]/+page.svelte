<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData, form: ActionData }>();
	let editor: any;
	let formElement: HTMLFormElement;
	let title = $state(data.page.title);
	let editorData = $state(data.page.content || '');
	let isSaving = $state(false);

	function addWidget(name: string) {
		if (editor) {
			editor.blocks.insert('widget', { name });
		}
	}

	onMount(async () => {
		const EditorJS = (await import('@editorjs/editorjs')).default;
		const Header = (await import('@editorjs/header')).default;
		const List = (await import('@editorjs/list')).default;
		const Quote = (await import('@editorjs/quote')).default;
		const Code = (await import('@editorjs/code')).default;
		const Image = (await import('@editorjs/image')).default;
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
						type: 'text',
						customPicker: true
					}
				},
				image: { class: Image, config: { endpoints: { byFile: '/api/upload' } } }
			},
			data: editorData ? JSON.parse(editorData) : { blocks: [] },
			placeholder: 'Build your page content...',
			onChange: async () => {
				const saved = await editor.save();
				editorData = JSON.stringify(saved);
			}
		});
	});

	function handleSubmit() {
		isSaving = true;
		return async ({ update }: { update: any }) => {
			await update();
			isSaving = false;
		};
	}
</script>

<svelte:head>
	<title>Edit Page: {title} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
	<form bind:this={formElement} method="POST" action="?/savePage" use:enhance={handleSubmit} class="space-y-8">
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<h2 class="text-4xl font-black tracking-tighter uppercase text-psan-green">Edit Page</h2>
				<p class="text-xs text-muted font-bold mt-1">ID: {data.page.id}</p>
			</div>
			<div class="flex gap-3">
				<div class="flex items-center gap-2 mr-4 px-4 border-r border-slate-100 dark:border-slate-800">
					<span class="text-[10px] font-black text-muted uppercase">Insert:</span>
					<button type="button" onclick={() => addWidget('latest-posts')} class="text-[10px] font-black px-3 py-1 bg-psan-green/10 text-psan-green rounded-full hover:bg-psan-green hover:text-white transition-all">Latest Posts</button>
					<button type="button" onclick={() => addWidget('comments')} class="text-[10px] font-black px-3 py-1 bg-psan-pink/10 text-psan-pink rounded-full hover:bg-psan-pink hover:text-white transition-all">Comments</button>
				</div>
				<a href="/dashboard/pages" class="btn-psan-ghost text-xs py-2 dark:bg-slate-700 dark:text-white dark:border-slate-500">Back</a>
				<button type="submit" class="btn-psan-primary py-3 px-10 text-sm" disabled={isSaving}>
					{isSaving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</header>

		<div class="card-psan p-6 md:p-12 space-y-8">
			<input
				id="title"
				type="text"
				name="title"
				bind:value={title}
				class="w-full text-4xl md:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 text-main"
				placeholder="Page Title..."
			/>

			<div class="prose dark:prose-invert max-w-none min-h-[500px]">
				<div id="editorjs" class="text-main"></div>
			</div>
		</div>

		<input type="hidden" name="content" value={editorData} />
		{#if form?.success}
			<div class="fixed top-24 left-1/2 -translate-x-1/2 bg-psan-green text-white px-10 py-4 rounded-full font-black shadow-2xl z-[101] animate-in fade-in slide-in-from-top-4">
				PAGE SAVED!
			</div>
		{/if}
	</form>
</div>

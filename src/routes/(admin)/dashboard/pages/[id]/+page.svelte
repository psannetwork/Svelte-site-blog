<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { editorJsToHtml } from '$lib/utils/editor';
	import { editorI18n } from '$lib/utils/editor_i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
	
	// Svelte 5 state management
	let editor: any;
	let formElement: HTMLFormElement;

	let title = $state('');
	let editorData = $state('');
	let isSaving = $state(false);
	let isPreview = $state(false);
	let previewHtml = $state('');

	$effect(() => {
		if (data.page && title === '') {
			title = data.page.title;
			editorData = data.page.raw_json || data.page.content || '';
		}
	});

	async function togglePreview() {
		if (!isPreview) {
			if (editor) {
				const saved = await editor.save();
				previewHtml = editorJsToHtml(saved.blocks);
			}
			isPreview = true;
		} else {
			isPreview = false;
		}
	}

	async function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			submitForm();
		}
	}

	function submitForm() {
		if (!editor || isSaving) return;
		formElement?.requestSubmit();
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown, true);

		(async () => {
			if (editor) return;

			const EditorJS = (await import('@editorjs/editorjs')).default;
			const Header = (await import('@editorjs/header')).default;
			const List = (await import('@editorjs/list')).default;
			const Quote = (await import('@editorjs/quote')).default;
			const Code = (await import('@editorjs/code')).default;
			const Image = (await import('@editorjs/image')).default;
			const Marker = (await import('@editorjs/marker')).default;
			const Table = (await import('@editorjs/table')).default;
			const Checklist = (await import('@editorjs/checklist')).default;
			const Warning = (await import('@editorjs/warning')).default;
			const Delimiter = (await import('@editorjs/delimiter')).default;
			const InlineCode = (await import('@editorjs/inline-code')).default;
			const Underline = (await import('@editorjs/underline')).default;
			const ColorPlugin = (await import('editorjs-text-color-plugin')).default;
			const Undo = (await import('editorjs-undo')).default;
			const DragDrop = (await import('editorjs-drag-drop')).default;
			const Paragraph = (await import('@editorjs/paragraph')).default;

			let parsedData: { blocks: any[] } = { blocks: [] };
			try {
				if (editorData) {
					const data = JSON.parse(editorData);
					if (data && data.blocks) parsedData = data;
				}
			} catch (e) {
				console.error('Invalid page data', e);
			}

			if (parsedData.blocks.length === 0) {
				parsedData.blocks.push({ type: 'paragraph', data: { text: '' } });
			}

			try {
				editor = new EditorJS({
					holder: 'editorjs',
					inlineToolbar: true,
					i18n: data?.settings?.site_language === 'ja' ? editorI18n : undefined,
					tools: {
						paragraph: { class: Paragraph, inlineToolbar: true },
						header: { class: Header, inlineToolbar: true },
						list: { class: List, inlineToolbar: true },
						quote: { class: Quote, inlineToolbar: true },
						code: Code,
						marker: { 
							class: ColorPlugin, 
							inlineToolbar: true, 
							config: { 
								type: 'marker', 
								customPicker: true,
								colorCollections: ['#FFCC00', '#FF9900', '#FF6666', '#CC99FF', '#99CCFF', '#99FFCC', '#00CC99', '#CCCCCC'],
								defaultColor: '#FFCC00',
							} 
						},
						table: { class: Table, inlineToolbar: true },
						checklist: { class: Checklist, inlineToolbar: true },
						warning: Warning,
						delimiter: Delimiter,
						inlineCode: InlineCode,
						underline: Underline,
						color: { 
							class: ColorPlugin, 
							inlineToolbar: true, 
							config: { 
								type: 'text', 
								customPicker: true,
								colorCollections: ['#000000', '#FF0000', '#0000FF', '#00CC99', '#FF00FF', '#0099FF', '#666666', '#FFFFFF'],
								defaultColor: '#FF0000',
							} 
						},
						image: { class: Image, config: { endpoints: { byFile: '/api/upload' } } }
					},
					onReady: () => {
						new Undo({ editor });
						new DragDrop(editor);
					},
					onChange: () => {
						debouncedAutosave();
					},
					data: parsedData,
					placeholder: 'Build your page content...',
					defaultBlock: 'paragraph'
				});
			} catch (err) {
				console.error('EditorJS initialization failed:', err);
			}
		})();

		return () => {
			window.removeEventListener('keydown', handleKeydown, true);
			if (editor && typeof editor.destroy === 'function') {
				editor.destroy();
				editor = null;
			}
			debouncedAutosave.clear();
		};
	});

	function debounce<T extends (...args: any[]) => any>(func: T, timeout = 300) {
		let timer: ReturnType<typeof setTimeout>;
		const debounced = function(this: any, ...args: Parameters<T>) {
			clearTimeout(timer);
			timer = setTimeout(() => {
				func.apply(this, args);
			}, timeout);
		};
		debounced.clear = () => {
			clearTimeout(timer);
		};
		return debounced;
	}

	const debouncedAutosave = debounce(async () => {
		if (editor) {
			try {
				await editor.save();
				// Pages don't currently use localStorage autosave, but we could add it here
			} catch (err) {
				console.error('Autosave failed:', err);
			}
		}
	}, 1000);
</script>

<svelte:head>
	<title>Edit Page: {title} | {data.settings?.site_title || 'Admin'}</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
	<form
		bind:this={formElement}
		method="POST"
		action="?/savePage"
		class="space-y-8"
		use:enhance={async ({ formData, cancel }) => {
			if (!editor) return cancel();
			isSaving = true;
			try {
				const saved = await editor.save();
				formData.set('content', JSON.stringify(saved));
			} catch (err) {
				console.error('Save failed', err);
				isSaving = false;
				return cancel();
			}

			return async ({ result, update }) => {
				isSaving = false;
				await update({ reset: false });
			};
		}}
	>
		<header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<h2 class="text-4xl font-black tracking-tighter uppercase text-psan-green">Edit Page</h2>
				<p class="text-xs text-muted font-bold mt-1 uppercase tracking-widest">ID: {data.page.id}</p>
			</div>
			<div class="flex gap-3">
				<a
					href="/dashboard/pages"
					class="btn-psan-ghost text-xs py-2 dark:bg-slate-700 dark:text-white dark:border-slate-500"
					>Back</a
				>
				<button
					type="button"
					onclick={togglePreview}
					class="btn-psan-ghost text-xs py-2 border-psan-green text-psan-green hover:bg-psan-green hover:text-psan-green-fg transition-all min-w-[100px]"
				>
					{isPreview ? 'Edit' : 'Preview'}
				</button>
				<button
					type="submit"
					class="btn-psan-primary py-3 px-10 text-sm"
					disabled={isSaving}
				>
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
				class="w-full text-4xl md:text-6xl font-black bg-transparent border-none focus:ring-0 p-0 text-main placeholder:text-muted/20 tracking-tighter"
				placeholder="Page Title..."
			/>

			<div class="editor-container-psan min-h-[500px]">
				<div id="editorjs" class="text-main {isPreview ? 'hidden' : 'block'}"></div>
				{#if isPreview}
					<div class="prose dark:prose-invert max-w-none preview-content animate-in fade-in duration-300">
						{@html previewHtml}
					</div>
				{/if}
			</div>
		</div>

		<input type="hidden" name="content" value={editorData} />
		{#if form?.success}
			<div
				class="fixed top-24 left-1/2 -translate-x-1/2 bg-psan-green text-psan-green-fg px-10 py-4 rounded-full font-black shadow-2xl z-[101] animate-in fade-in slide-in-from-top-4 uppercase text-xs tracking-widest"
			>
				Page Saved!
			</div>
		{/if}
	</form>
</div>
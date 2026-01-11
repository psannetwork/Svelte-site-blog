<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	
	let { data, form } = $props();

	let editors = $state({
		home: { data: data.settings.home_hero_content, instance: null },
		about: { data: data.settings.about_page_content, instance: null },
		error404: { data: data.settings.error_404_content, instance: null },
		error500: { data: data.settings.error_500_content, instance: null }
	});

	async function initEditor(id: string, holder: string, initialData: string) {
		const EditorJS = (await import('@editorjs/editorjs')).default;
		const Header = (await import('@editorjs/header')).default;
		const List = (await import('@editorjs/list')).default;
		const Image = (await import('@editorjs/image')).default;
		const Marker = (await import('@editorjs/marker')).default;
		const ColorPlugin = (await import('editorjs-text-color-plugin')).default;

		const editor = new EditorJS({
			holder,
			tools: {
				header: Header,
				list: List,
				marker: Marker,
				color: {
					class: ColorPlugin,
					config: {
						colorCollections: ['#00CC99', '#EB2D8C', '#1A1A1A', '#FF1313', '#2388FF', '#FFD300'],
						type: 'text',
						customPicker: true
					}
				},
				image: {
					class: Image,
					config: { endpoints: { byFile: '/api/upload' } }
				}
			},
			data: JSON.parse(initialData),
			onChange: async () => {
				const savedData = await editor.save();
				editors[id].data = JSON.stringify(savedData);
			}
		});
		editors[id].instance = editor;
	}

	onMount(() => {
		initEditor('home', 'editor-home', data.settings.home_hero_content);
		initEditor('about', 'editor-about', data.settings.about_page_content);
		initEditor('error404', 'editor-404', data.settings.error_404_content);
		initEditor('error500', 'editor-500', data.settings.error_500_content);
	});

	function handleFormSubmit(event: Event) {
		const formData = new FormData(event.target as HTMLFormElement);
		if (data.settings.require_email_verification !== 'true' && formData.get('require_email_verification') === 'on') {
			if (!confirm("警告: メール認証を有効にしますか？")) event.preventDefault();
		}
	}
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<header class="mb-12">
		<h2 class="text-4xl font-black tracking-tighter">ADVANCED SETTINGS</h2>
		<p class="text-slate-500 dark:text-slate-400 font-medium">すべてのページコンテンツを自由にカスタマイズします。</p>
	</header>

	<form method="POST" use:enhance onsubmit={handleFormSubmit} class="space-y-12 pb-20">
		<!-- 基本設定 -->
		<section class="card-psan p-8 space-y-6">
			<h3 class="text-xl font-black text-psan-green italic">IDENTITY</h3>
			<div class="grid md:grid-cols-2 gap-6">
				<div class="space-y-2">
					<label for="site_title" class="text-[10px] font-black tracking-widest opacity-50 uppercase">サイトタイトル</label>
					<input id="site_title" name="site_title" value={data.settings.site_title} class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 font-bold" />
				</div>
				<div class="space-y-2">
					<label for="accent_color" class="text-[10px] font-black tracking-widest opacity-50 uppercase">アクセントカラー</label>
					<input id="accent_color" name="accent_color" type="color" value={data.settings.accent_color} class="w-full h-14 bg-transparent border-none cursor-pointer" />
				</div>
			</div>
		</section>

		<!-- ホーム編集 -->
		<section class="card-psan p-8 space-y-6">
			<h3 class="text-xl font-black text-psan-green italic">HOME PAGE</h3>
			<div class="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6">
				<div id="editor-home"></div>
			</div>
			<input type="hidden" name="home_hero_content" value={editors.home.data} />
		</section>

		<!-- About編集 -->
		<section class="card-psan p-8 space-y-6">
			<h3 class="text-xl font-black text-psan-pink italic">ABOUT PAGE</h3>
			<div class="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6">
				<div id="editor-about"></div>
			</div>
			<input type="hidden" name="about_page_content" value={editors.about.data} />
		</section>

		<!-- エラーページ編集 -->
		<section class="card-psan p-8 space-y-6">
			<h3 class="text-xl font-black text-slate-400 italic">ERROR PAGES</h3>
			<div class="space-y-8">
				<div>
					<label class="text-[10px] font-black tracking-widest opacity-50 uppercase block mb-4">404 Not Found Content</label>
					<div class="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6">
						<div id="editor-404"></div>
					</div>
					<input type="hidden" name="error_404_content" value={editors.error404.data} />
				</div>
				<div>
					<label class="text-[10px] font-black tracking-widest opacity-50 uppercase block mb-4">500 Server Error Content</label>
					<div class="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6">
						<div id="editor-500"></div>
					</div>
					<input type="hidden" name="error_500_content" value={editors.error500.data} />
				</div>
			</div>
		</section>

		<!-- セキュリティ・機能 -->
		<section class="card-psan p-8 space-y-6">
			<h3 class="text-xl font-black text-psan-pink italic">SYSTEM & PERMISSIONS</h3>
			<div class="grid md:grid-cols-2 gap-4">
				<label class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer">
					<span class="text-sm font-bold">一般公開</span>
					<input type="checkbox" name="is_site_public" checked={data.settings.is_site_public === 'true'} class="w-5 h-5 accent-psan-green" />
				</label>
				<label class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer">
					<span class="text-sm font-bold">新規登録許可</span>
					<input type="checkbox" name="allow_signup" checked={data.settings.allow_signup === 'true'} class="w-5 h-5 accent-psan-green" />
				</label>
			</div>
		</section>

		<div class="sticky bottom-8 flex justify-end gap-4">
			<button class="btn-psan-primary px-12 py-4 text-lg shadow-2xl">設定を保存する</button>
		</div>

		{#if form?.success}<p class="text-center font-black text-psan-green animate-bounce">SAVED SUCCESSFULLY!</p>{/if}
	</form>
</div>

<style>
	:global(.ce-block__content) { max-width: 100%; }
	:global(.ce-toolbar__content) { max-width: 100%; }
</style>

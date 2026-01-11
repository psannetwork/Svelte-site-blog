<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	
	let { data, form } = $props();
	let formElement: HTMLFormElement;
	let isSaving = $state(false);
	let showSuccess = $state(false);

	// ステート管理 (初期値は空にし、effectで同期)
	let editors = $state({
		home: { data: '', instance: null as any },
		about: { data: '', instance: null as any },
		error404: { data: '', instance: null as any },
		error500: { data: '', instance: null as any }
	});

	// data が変更されたときにエディタのデータを同期する
	$effect(() => {
		editors.home.data = data.settings.home_hero_content;
		editors.about.data = data.settings.about_page_content;
		editors.error404.data = data.settings.error_404_content;
		editors.error500.data = data.settings.error_500_content;
	});

	async function initEditor(id: keyof typeof editors, holder: string, initialData: string) {
		const el = document.getElementById(holder);
		if (!el) return;

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
				image: { class: Image, config: { endpoints: { byFile: '/api/upload' } } }
			},
			data: initialData ? JSON.parse(initialData) : { blocks: [] },
			onChange: async () => {
				const savedData = await editor.save();
				editors[id].data = JSON.stringify(savedData);
			}
		});
		editors[id].instance = editor;
	}

	async function saveAll() {
		if (isSaving) return;
		isSaving = true;

		try {
			await Promise.all(Object.entries(editors).map(async ([id, e]) => {
				if (e.instance) {
					await e.instance.isReady;
					const saved = await e.instance.save();
					editors[id as keyof typeof editors].data = JSON.stringify(saved);
				}
			}));
			
			formElement?.requestSubmit();
		} catch (e) {
			console.error('Save failed:', e);
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			saveAll();
		}
	}

	onMount(() => {
		setTimeout(() => {
			initEditor('home', 'editor-home', data.settings.home_hero_content);
			initEditor('about', 'editor-about', data.settings.about_page_content);
			initEditor('error404', 'editor-404', data.settings.error_404_content);
			initEditor('error500', 'editor-500', data.settings.error_500_content);
		}, 100);

		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			Object.values(editors).forEach(e => e.instance?.destroy?.());
		};
	});
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<header class="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
		<div>
			<h2 class="text-3xl md:text-4xl font-black tracking-tighter uppercase text-psan-dark dark:text-white">Site Configuration</h2>
			<p class="text-sm text-slate-500 font-medium">Ctrl + S で即座に保存</p>
		</div>
		<div class="flex gap-3">
			<a href="/dashboard" class="btn-psan-ghost text-xs px-6 py-2">Cancel</a>
			<button onclick={saveAll} class="btn-psan-primary text-xs px-8 py-2" disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	</header>

	<form 
		bind:this={formElement} 
		method="POST" 
		use:enhance={() => {
			return async ({ result }) => {
				isSaving = false;
				if (result.type === 'success') {
					showSuccess = true;
					setTimeout(() => showSuccess = false, 3000);
					await invalidateAll();
				}
			};
		}} 
		class="space-y-12 pb-32"
	>
		<section class="card-psan p-6 md:p-8 space-y-6">
			<h3 class="text-xl font-black text-psan-green italic uppercase tracking-tighter">Identity</h3>
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

		<section class="card-psan p-6 md:p-8 space-y-6 border-psan-pink/20 border-2">
			<h3 class="text-xl font-black text-psan-pink italic uppercase tracking-tighter">Access & Security</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<label class="flex items-center justify-between p-4 bg-psan-pink/5 rounded-2xl cursor-pointer hover:bg-psan-pink/10 transition-all border border-psan-pink/10">
					<span class="text-sm font-black text-psan-pink uppercase italic">ログインを強制する</span>
					<input type="checkbox" name="is_site_public" checked={data.settings.is_site_public === 'false'} class="w-6 h-6 accent-psan-pink" />
				</label>
				{#each [
					{ id: 'allow_signup', label: '新規登録を許可' },
					{ id: 'allow_comments', label: 'コメントを許可' },
					{ id: 'allow_anonymous_comments', label: '匿名コメントを許可' },
					{ id: 'allow_account_deletion', label: 'ユーザーによる退会を許可' },
					{ id: 'enable_turnstile', label: 'Cloudflare Turnstile' }
				] as item}
					<label class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer">
						<span class="text-xs font-bold">{item.label}</span>
						<input type="checkbox" name={item.id} checked={data.settings[item.id] === 'true'} class="w-5 h-5 accent-psan-green" />
					</label>
				{/each}
				<div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2">
					<label for="anonymous_name" class="text-[10px] font-black opacity-50 uppercase">匿名ユーザーの表示名</label>
					<input id="anonymous_name" name="anonymous_name" value={data.settings.anonymous_name || 'Anonymous'} class="w-full bg-white dark:bg-slate-900 border-none rounded-lg p-2 text-sm font-bold" />
				</div>
			</div>
		</section>

		<div class="space-y-8">
			<div class="card-psan p-6 md:p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-green italic uppercase tracking-tighter">Home Content</h3>
				<div class="bg-slate-50 dark:bg-slate-900 rounded-[32px] p-4 md:p-8 border border-slate-100 dark:border-slate-800">
					<div id="editor-home"></div>
				</div>
				<input type="hidden" name="home_hero_content" value={editors.home.data} />
			</div>

			<div class="card-psan p-6 md:p-8 space-y-6">
				<h3 class="text-xl font-black text-psan-pink italic uppercase tracking-tighter">About Content</h3>
				<div class="bg-slate-50 dark:bg-slate-900 rounded-[32px] p-4 md:p-8 border border-slate-100 dark:border-slate-800">
					<div id="editor-about"></div>
				</div>
				<input type="hidden" name="about_page_content" value={editors.about.data} />
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="card-psan p-6 space-y-4">
					<h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">404 Error Content</h3>
					<div class="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
						<div id="editor-404"></div>
					</div>
					<input type="hidden" name="error_404_content" value={editors.error404.data} />
				</div>
				<div class="card-psan p-6 space-y-4">
					<h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">500 Error Content</h3>
					<div class="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
						<div id="editor-500"></div>
					</div>
					<input type="hidden" name="error_500_content" value={editors.error500.data} />
				</div>
			</div>
		</div>

		<input type="hidden" name="site_description" value={data.settings.site_description} />
		<input type="hidden" name="turnstile_site_key" value={data.settings.turnstile_site_key} />
		<input type="hidden" name="turnstile_secret_key" value={data.settings.turnstile_secret_key} />
		<input type="hidden" name="require_email_verification" value={data.settings.require_email_verification} />
		<input type="hidden" name="show_footer_auth" value={data.settings.show_footer_auth} />

		{#if showSuccess}
			<div class="fixed top-24 left-1/2 -translate-x-1/2 bg-psan-green text-white px-8 py-3 rounded-full font-black shadow-2xl z-[101] animate-in fade-in slide-in-from-top-4">
				SAVED SUCCESSFULLY!
			</div>
		{/if}
	</form>
</div>

<style>
	:global(.ce-block__content) { max-width: 100%; }
	:global(.ce-toolbar__content) { max-width: 100%; }
</style>
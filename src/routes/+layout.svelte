<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { theme } from '$lib/theme.svelte';
	import { page } from '$app/state';
	import { sanitizeHtml } from '$lib/utils/htmlSanitizer';

	let { children, data } = $props();

	// グローバル通知システム
	type Notification = {
		id: number;
		message: string;
		type: 'success' | 'error' | 'info';
	};

	let notifications = $state<Notification[]>([]);
	let notificationId = $state(0);

	onMount(() => {
		theme.init();

		// 言語設定を HTML タグに適用
		if (data.settings?.site_language) {
			document.documentElement.lang = data.settings.site_language;
		}

		// グローバル通知イベントをリッスン
		window.addEventListener('notify', ((e: CustomEvent) => {
			addNotification(e.detail.message, e.detail.type);
		}) as EventListener);

		// Color picker fix for Editor.js (editorjs-text-color-plugin)
		const handleGlobalClick = (e: MouseEvent) => {
			const path = e.composedPath();

			// 1. Handle clicking the custom button inside the xy-color-picker popover
			const xyPicker = path.find((el) => (el as HTMLElement).tagName === 'XY-COLOR-PICKER') as any;
			if (xyPicker) {
				const isCustom = path.some(
					(el) =>
						(el as HTMLElement).id === 'custom-picker' ||
						(el as HTMLElement).classList?.contains('rainbow-mask') ||
						(el as HTMLElement).classList?.contains('tc-color-picker__button')
				);

				if (isCustom) {
					e.preventDefault();
					e.stopPropagation();
					triggerNativePicker(xyPicker);
					return;
				}
			}

			// 2. Handle color tool button clicks in the toolbar
			const toolbarBtn = path.find(
				(el) =>
					(el as HTMLElement).classList?.contains('ce-inline-tool') &&
					(el as HTMLElement).classList?.contains('colorPlugin')
			) as HTMLElement;

			if (toolbarBtn) {
				const isIcon = path.some(
					(el) =>
						(el as HTMLElement).id === 'color-left-btn' ||
						(el as HTMLElement).id === 'color-btn-text'
				);
				const isRightPart = path.some((el) => (el as HTMLElement).tagName === 'XY-COLOR-PICKER');

				if (isRightPart && !isIcon) {
					// 右側の端っこ（矢印部分）をクリックした場合はカラーピッカーを起動
					const picker = toolbarBtn.querySelector('xy-color-picker') as any;
					if (picker) {
						e.preventDefault();
						e.stopPropagation();
						triggerNativePicker(picker);
					}
				}
				// アイコン部分（isIcon）をクリックした場合は、Editor.js 本来の挙動（色あり/なしのトグル）に任せる
			}
		};

		function triggerNativePicker(xyPicker: any) {
			const input = document.createElement('input');
			input.type = 'color';
			input.value = xyPicker.value || '#000000';

			// 選択範囲またはボタンの座標を取得して、そこに配置する
			let top = 0;
			let left = 0;
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				const rect = sel.getRangeAt(0).getBoundingClientRect();
				if (rect.top !== 0 || rect.left !== 0) {
					top = rect.top + window.scrollY;
					left = rect.left + window.scrollX;
				}
			}

			if (top === 0 && left === 0) {
				const rect = xyPicker.getBoundingClientRect();
				top = rect.top + window.scrollY;
				left = rect.left + window.scrollX;
			}

			Object.assign(input.style, {
				position: 'absolute',
				top: `${top}px`,
				left: `${left}px`,
				width: '1px',
				height: '1px',
				opacity: '0',
				pointerEvents: 'none',
				appearance: 'none',
				border: 'none'
			});

			document.body.appendChild(input);

			input.oninput = (ev) => {
				const color = (ev.target as HTMLInputElement).value;
				xyPicker.value = color;
				if (typeof xyPicker.onColorPicked === 'function') {
					xyPicker.onColorPicked(color);
				}

				const type = xyPicker.pluginType || xyPicker.getAttribute('type');
				const tag = type === 'marker' ? 'MARK' : 'FONT';
				if (sel && sel.rangeCount > 0) {
					let node = sel.anchorNode;
					while (node && node !== document.body) {
						if (node && (node as HTMLElement).tagName === tag) {
							if (type === 'marker') (node as HTMLElement).style.backgroundColor = color;
							else (node as HTMLElement).style.color = color;
							break;
						}
						node = node?.parentNode || null;
					}
				}

				xyPicker.dispatchEvent(new CustomEvent('change', { detail: { value: color } }));
			};

			input.onchange = () => {
				setTimeout(() => {
					if (input.parentNode) document.body.removeChild(input);
				}, 100);
			};

			input.click();
		}

		document.addEventListener('click', handleGlobalClick, true);
		return () => {
			document.removeEventListener('click', handleGlobalClick, true);
		};
	});

	function getContrastColor(hex: string, isDark: boolean) {
		if (!hex || hex.length < 6) return '#ffffff';
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		const yiq = (r * 299 + g * 587 + b * 114) / 1000;
		// ライトモードでは標準的な128、ダークモードではより白文字を優先するために180に設定
		const threshold = isDark ? 180 : 128;
		return yiq >= threshold ? '#000000' : '#ffffff';
	}

	$effect(() => {
		const color = data.settings?.accent_color || '#00cc99';
		const isDark = theme.current === 'dark';
		document.documentElement.style.setProperty('--psan-green', color);
		document.documentElement.style.setProperty('--accent-color', color);
		document.documentElement.style.setProperty('--psan-green-fg', getContrastColor(color, isDark));
	});

	function addNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
		const id = ++notificationId;
		notifications.push({ id, message, type });
		setTimeout(() => {
			notifications = notifications.filter(n => n.id !== id);
		}, 3000);
	}
</script>

<svelte:head>
	<title
		>{page.data.pageTitle ? `${page.data.pageTitle} | ` : ''}{data.settings?.site_title ||
			'Svelte Site Blog'}</title
	>
	{#if data.settings?.site_description}
		<meta name="description" content={data.settings.site_description} />
	{/if}
	{#if data.settings?.site_icon_url}
		<link rel="icon" href={data.settings.site_icon_url} />
	{:else}
		<link rel="icon" href="/favicon.svg" />
	{/if}
	{#if data.settings?.custom_css}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<style>${sanitizeHtml(data.settings.custom_css)}</style>`}
	{/if}

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={data.settings?.site_title || 'Svelte Site Blog'} />
	<meta property="og:title" content={page.data.pageTitle ? `${page.data.pageTitle} | ${data.settings?.site_title || 'Svelte Site Blog'}` : data.settings?.site_title || 'Svelte Site Blog'} />
	{#if data.settings?.site_description}
		<meta property="og:description" content={data.settings.site_description} />
	{/if}
	{#if page.data.ogImage}
		<meta property="og:image" content={page.data.ogImage} />
	{:else if data.settings?.site_icon_url}
		<meta property="og:image" content={data.settings.site_icon_url} />
	{/if}
	<meta property="og:url" content={page.url.origin + page.url.pathname} />
	<meta property="og:locale" content={data.settings?.site_language || 'ja_JP'} />
	
	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={page.data.pageTitle ? `${page.data.pageTitle} | ${data.settings?.site_title || 'Svelte Site Blog'}` : data.settings?.site_title || 'Svelte Site Blog'} />
	{#if data.settings?.site_description}
		<meta name="twitter:description" content={data.settings.site_description} />
	{/if}
	{#if page.data.ogImage}
		<meta name="twitter:image" content={page.data.ogImage} />
	{:else if data.settings?.site_icon_url}
		<meta name="twitter:image" content={data.settings.site_icon_url} />
	{/if}
	
	<!-- Canonical URL -->
	<link rel="canonical" href={page.url.origin + page.url.pathname} />
</svelte:head>

<div class="min-h-screen flex flex-col transition-colors duration-300">
	{@render children()}
	
	<!-- グローバル通知 (右上にログ形式) -->
	<div class="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
		{#each notifications as notification (notification.id)}
			<div
				class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] max-w-md animate-in slide-in-from-right-4 fade-in duration-300 {
					notification.type === 'success' ? 'bg-psan-green text-white dark:text-psan-green-fg' :
					notification.type === 'error' ? 'bg-psan-pink text-white' :
					'bg-slate-800 text-white'
				}"
				role="status"
			>
				{#if notification.type === 'success'}
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
					</svg>
				{:else if notification.type === 'error'}
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				{/if}
				<span class="text-sm font-bold">{notification.message}</span>
			</div>
		{/each}
	</div>
</div>

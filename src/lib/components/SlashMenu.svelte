<script lang="ts">
	import {
		Heading1, Heading2, Heading3,
		List, ListOrdered, Quote,
		Image as ImageIcon, Code, Minus, Table as TableIcon,
		Video, Twitter, Instagram, Youtube,
		AlertCircle, Info, CheckCircle,
		ListTodo, FileText, MessageSquare, Github, Twitch,
		Music, MapPin, Sigma, Footprints,
		Columns, Timer, User, Trophy, ZoomIn
	} from 'lucide-svelte';

	interface Props {
		x: number;
		y: number;
		onSelect: (command: string) => void;
		onClose: () => void;
	}

	let { x, y, onSelect, onClose }: Props = $props();

	let selectedIndex = $state(0);
	let menuRef: HTMLDivElement | undefined = $state();

	const commands = [
		// テキスト
		{ id: 'h1', label: '見出し 1', icon: Heading1, shortcut: '#', category: 'text' },
		{ id: 'h2', label: '見出し 2', icon: Heading2, shortcut: '##', category: 'text' },
		{ id: 'h3', label: '見出し 3', icon: Heading3, shortcut: '###', category: 'text' },
		{ id: 'bullet', label: '箇条書きリスト', icon: List, shortcut: '-', category: 'text' },
		{ id: 'number', label: '番号付きリスト', icon: ListOrdered, shortcut: '1.', category: 'text' },
		{ id: 'todo', label: 'チェックリスト', icon: ListTodo, shortcut: '[]', category: 'text' },
		{ id: 'quote', label: '引用', icon: Quote, shortcut: '>', category: 'text' },
		
		// コールアウト
		{ id: 'callout-info', label: '情報ボックス', icon: Info, shortcut: '/info', category: 'callout' },
		{ id: 'callout-warning', label: '警告ボックス', icon: AlertCircle, shortcut: '/warn', category: 'callout' },
		{ id: 'callout-success', label: '成功ボックス', icon: CheckCircle, shortcut: '/ok', category: 'callout' },
		
		// メディア
		{ id: 'image', label: '画像', icon: ImageIcon, shortcut: '/img', category: 'media' },
		{ id: 'video', label: '動画', icon: Video, shortcut: '/video', category: 'media' },
		{ id: 'youtube', label: 'YouTube', icon: Youtube, shortcut: '/yt', category: 'media' },
		{ id: 'twitter', label: 'X (Twitter)', icon: Twitter, shortcut: '/tw', category: 'media' },
		{ id: 'instagram', label: 'Instagram', icon: Instagram, shortcut: '/ig', category: 'media' },
		{ id: 'github', label: 'GitHub Gist', icon: Github, shortcut: '/gist', category: 'media' },
		{ id: 'twitch', label: 'Twitch', icon: Twitch, shortcut: '/twitch', category: 'media' },
		{ id: 'spotify', label: 'Spotify', icon: Music, shortcut: '/spotify', category: 'media' },
		{ id: 'soundcloud', label: 'SoundCloud', icon: Music, shortcut: '/sc', category: 'media' },
		{ id: 'map', label: 'Google マップ', icon: MapPin, shortcut: '/map', category: 'media' },
		
		// コード
		{ id: 'code', label: 'コードブロック', icon: Code, shortcut: '```', category: 'code' },
		{ id: 'math', label: '数式 (LaTeX)', icon: Sigma, shortcut: '$$', category: 'code' },
		
		// レイアウト
		{ id: 'table', label: 'テーブル', icon: TableIcon, shortcut: '/table', category: 'layout' },
		{ id: 'hr', label: '区切り線', icon: Minus, shortcut: '---', category: 'layout' },
		{ id: 'button', label: 'ボタン', icon: MessageSquare, shortcut: '/btn', category: 'layout' },
		{ id: 'accordion', label: 'アコーディオン', icon: MessageSquare, shortcut: '/acc', category: 'layout' },
		{ id: 'progress', label: 'プログレスバー', icon: FileText, shortcut: '/prog', category: 'layout' },
		{ id: 'toc', label: '目次', icon: FileText, shortcut: '/toc', category: 'layout' },
		{ id: 'tabs', label: 'タブ切り替え', icon: Columns, shortcut: '/tabs', category: 'layout' },
		{ id: 'timeline', label: 'タイムライン', icon: Timer, shortcut: '/time', category: 'layout' },
		{ id: 'profile', label: 'プロフィール', icon: User, shortcut: '/profile', category: 'layout' },
		{ id: 'ranking', label: 'ランキング', icon: Trophy, shortcut: '/rank', category: 'layout' },
		{ id: 'footnote', label: '脚注', icon: Footprints, shortcut: '/fn', category: 'layout' }
	];

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % commands.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + commands.length) % commands.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const cmd = commands[selectedIndex];
			if (cmd) onSelect(cmd.id);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}

	// カテゴリごとにグループ化
	const groupedCommands = commands.reduce((acc, cmd) => {
		if (!acc[cmd.category]) acc[cmd.category] = [];
		acc[cmd.category].push(cmd);
		return acc;
	}, {} as Record<string, typeof commands>);

	const categoryLabels: Record<string, string> = {
		text: 'テキスト',
		callout: 'コールアウト',
		media: 'メディア',
		code: 'コード',
		layout: 'レイアウト'
	};

	// フォーカス管理 - メニュー表示時に最初のアイテムにフォーカス
	$effect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="slash-menu" style="left: {x}px; top: {y}px;" bind:this={menuRef} role="menu" aria-label="コマンドメニュー">
	{#each Object.entries(groupedCommands) as [category, cmds]}
		<div class="category-header">{categoryLabels[category]}</div>
		{#each cmds as command}
			{@const index = commands.indexOf(command)}
			<button
				class="menu-item"
				class:active={index === selectedIndex}
				onclick={(e) => { e.stopPropagation(); onSelect(command.id); }}
				onmouseenter={() => selectedIndex = index}
				role="menuitem"
				tabindex={index === 0 ? 0 : -1}
				aria-label={command.label}
			>
				<command.icon size={18} aria-hidden="true" />
				<span class="label">{command.label}</span>
				<span class="shortcut">{command.shortcut}</span>
			</button>
		{/each}
	{/each}
</div>

<style>
	.slash-menu {
		position: absolute;
		z-index: 1000;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		padding: 8px;
		min-width: 280px;
		max-height: 500px;
		overflow-y: auto;
	}

	.category-header {
		font-size: 10px;
		font-weight: 700;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 8px 12px 4px;
		margin-top: 8px;
	}

	.category-header:first-child {
		margin-top: 0;
	}

	.menu-item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 10px 12px;
		gap: 12px;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.menu-item:hover,
	.menu-item.active {
		background: #f1f5f9;
	}

	.menu-item .label {
		flex: 1;
		font-size: 13px;
		font-weight: 500;
		color: #1e293b;
	}

	.menu-item .shortcut {
		font-size: 11px;
		font-weight: 600;
		color: #94a3b8;
		background: #e2e8f0;
		padding: 2px 6px;
		border-radius: 4px;
	}

	:global(.dark) .slash-menu {
		background: #1e293b;
		border-color: #334155;
	}

	:global(.dark) .menu-item:hover,
	:global(.dark) .menu-item.active {
		background: #334155;
	}

	:global(.dark) .menu-item .label {
		color: #f1f5f9;
	}

	:global(.dark) .menu-item .shortcut {
		background: #475569;
		color: #cbd5e1;
	}

	:global(.dark) .category-header {
		color: #64748b;
	}
</style>

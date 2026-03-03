<script lang="ts">
	import {
		Heading1, Heading2, Heading3,
		List, ListOrdered, Quote,
		Image as ImageIcon, Code, Minus, Table as TableIcon
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
		{ id: 'h1', label: '見出し 1', icon: Heading1, shortcut: '#' },
		{ id: 'h2', label: '見出し 2', icon: Heading2, shortcut: '##' },
		{ id: 'h3', label: '見出し 3', icon: Heading3, shortcut: '###' },
		{ id: 'bullet', label: '箇条書きリスト', icon: List, shortcut: '-' },
		{ id: 'number', label: '番号付きリスト', icon: ListOrdered, shortcut: '1.' },
		{ id: 'quote', label: '引用', icon: Quote, shortcut: '>' },
		{ id: 'code', label: 'コードブロック', icon: Code, shortcut: '```' },
		{ id: 'table', label: 'テーブル', icon: TableIcon, shortcut: '/table' },
		{ id: 'image', label: '画像', icon: ImageIcon, shortcut: '/img' },
		{ id: 'hr', label: '区切り線', icon: Minus, shortcut: '---' }
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

	// フォーカス管理 - メニュー表示時に最初のアイテムにフォーカス
	$effect(() => {
		window.addEventListener('keydown', handleKeyDown);
		
		// メニュー表示時に最初のアイテムにフォーカス
		const firstMenuItem = menuRef?.querySelector('.menu-item') as HTMLElement;
		firstMenuItem?.focus();
		
		return () => window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<div class="slash-menu" style="left: {x}px; top: {y}px;" bind:this={menuRef} role="menu" aria-label="コマンドメニュー">
	{#each commands as command, i}
		<button
			class="menu-item"
			class:active={i === selectedIndex}
			onclick={() => onSelect(command.id)}
			onmouseenter={() => selectedIndex = i}
			role="menuitem"
			tabindex={i === 0 ? 0 : -1}
			aria-label={command.label}
		>
			<command.icon size={18} aria-hidden="true" />
			<span class="label">{command.label}</span>
			<span class="shortcut">{command.shortcut}</span>
		</button>
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
		min-width: 240px;
		max-height: 400px;
		overflow-y: auto;
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
		text-align: left;
		color: #1f2937;
		font-size: 0.9rem;
		transition: background 0.15s;
	}

	.menu-item.active {
		background: #f3f4f6;
	}

	.menu-item:hover {
		background: #f3f4f6;
	}

	.label {
		flex: 1;
		font-weight: 500;
	}

	.shortcut {
		font-size: 0.75rem;
		color: #9ca3af;
		font-family: monospace;
		background: #f9fafb;
		padding: 2px 6px;
		border-radius: 4px;
	}
</style>

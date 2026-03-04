<script lang="ts">
	import { onMount } from 'svelte';
	import SlashMenu from './SlashMenu.svelte';
	import { replaceTextWithBlock, setCursorToEnd, getSelectionRange, formatBlock, toggleList, toggleBlockquote, insertHorizontalRule, insertTableElement, alignText, createLink, removeLink, applyInlineStyleToSelection, getSelectionBounds, isSelectionCollapsed, insertHtmlAtCursor, addTableRow, addTableColumn, deleteTableRow, deleteTableColumn, mergeTableCellsHorizontally, mergeTableCellsVertically, splitTableCell, hasInlineStyleInSelection, hasAllInlineStyleInSelection } from './utils/selection';
	import { htmlToMarkdown, markdownToHtml } from './utils/converter';
	import { sanitizeHtml } from '$lib/utils/htmlSanitizer';
	import {
		Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon,
		Undo, Redo, Move, List, ListOrdered, Quote, Code, Minus, Table as TableIcon,
		AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Palette, Trash2,
		Heading1, Heading2, Heading3, Video, Mic
	} from 'lucide-svelte';

	interface Props {
		value?: string;
		placeholder?: string;
		onchange?: (html: string) => void;
		autoSaveId?: string;
		onExportMarkdown?: () => void;
	}

	let {
		value = '',
		placeholder = '内容を入力するか、 "/" でコマンドを表示...',
		onchange,
		autoSaveId,
		onExportMarkdown
	}: Props = $props();

	let editorRef: HTMLDivElement | undefined = $state();
	let fileInputRef: HTMLInputElement | undefined = $state();
	let menuState = $state({ show: false, x: 0, y: 0 });
	let innerHTML = $state('');

	// AbortController for event listener cleanup
	let abortController: AbortController | null = null;

	// History State for Undo/Redo
	let history = $state<string[]>([]);
	let historyIndex = $state(-1);
	// メモリ使用量削減のため履歴数を 30 に制限
	const MAX_HISTORY = 30;
	let historyTimeout: ReturnType<typeof setTimeout>;

	// Input Debounce for Performance
	const INPUT_DEBOUNCE_DELAY = 300;
	let inputDebounceTimeout: ReturnType<typeof setTimeout>;
	let pendingInputHtml = '';

	// 履歴エントリの最大サイズ (約 100KB)
	const MAX_HISTORY_ENTRY_SIZE = 100000;

	// Element Resizing & Moving State
	let selectedElement = $state<HTMLElement | null>(null);
	let resizing = $state(false);
	let resizeHandle = $state<'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null>(null);
	let startX = 0;
	let startY = 0;
	let startWidth = 0;
	let startHeight = 0;
	let startLeft = 0;
	let startTop = 0;
	let overlayPos = $state<{left: number, top: number, width: number, height: number} | null>(null);

	// リサイズ中のサイズ表示
	let resizeDimension = $state<{width: number, height: number} | null>(null);

	// アスペクト比維持
	let maintainAspectRatio = $state(false);
	let initialAspectRatio = 1;
	let shiftKeyPressed = $state(false);

	// Drag and Drop State
	let draggedElement = $state<HTMLElement | null>(null);
	let dragPlaceholder = $state<HTMLElement | null>(null);
	let dragOverElement = $state<HTMLElement | null>(null);

	// Color Picker State
	let showColorPicker = $state(false);
	let colorPickerPosition = $state({ x: 0, y: 0 });
	let currentColor = $state('#000000');

	// Font Size State
	let currentFontSize = $state('16');

	// Upload Loading State
	let isUploading = $state(false);

	// Link Edit Dialog State
	let showLinkDialog = $state(false);
	let linkUrl = $state('');
	let linkTarget = $state('_blank');
	let editingLink = $state<HTMLAnchorElement | null>(null);

	// Inline Toolbar State
	let showInlineToolbar = $state(false);
	let inlineToolbarPos = $state({ x: 0, y: 0 });

	// Inline Style State (for button active states)
	let isBold = $state(false);
	let isItalic = $state(false);
	let isUnderline = $state(false);
	let isStrikethrough = $state(false);

	// Auto Save State
	let autoSaveInterval: ReturnType<typeof setInterval> | null = null;
	const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
	const LOCAL_STORAGE_KEY = 'rich_editor_backup';

	// Media Embed Dialog State
	let showMediaDialog = $state(false);
	let mediaType = $state<'video' | 'audio'>('video');
	let mediaUrl = $state('');
	let mediaPosition = $state({ x: 0, y: 0 });

	// Markdown Export State
	let showMarkdownDialog = $state(false);
	let markdownContent = $state('');

	// Table Context Menu State
	let tableContextMenu = $state<{show: boolean, x: number, y: number, cell: HTMLTableCellElement | null, table: HTMLTableElement | null}>({
		show: false,
		x: 0,
		y: 0,
		cell: null,
		table: null
	});

	// Color Names for Accessibility
	const colorNames: Record<string, string> = {
		'#000000': '黒', '#434343': '濃灰', '#666666': '灰', '#999999': '銀', '#b7b7b7': '薄銀',
		'#cccccc': '淡灰', '#d9d9d9': '白灰', '#efefef': '煙白', '#f3f3f3': '白煙', '#ffffff': '白',
		'#980000': '赤茶', '#ff0000': '赤', '#ff9900': '橙', '#ffff00': '黄', '#00ff00': '緑',
		'#00ffff': '水', '#4a86e8': '青', '#0000ff': '紺', '#9900ff': '紫', '#ff00ff': '桃',
		'#e6b8af': '薄赤', '#f4cccc': '淡赤', '#fce5cd': '淡橙', '#fff2cc': '淡黄', '#d9ead3': '淡緑',
		'#d0e0e3': '淡水', '#c9daf8': '淡青', '#cfe2f3': '薄青', '#d9d2e9': '薄紫', '#ead1dc': '薄桃',
		'#dd7e6b': '赤橙', '#ea9999': '赤白', '#f9cb9c': '橙白', '#ffe599': '黄白', '#b6d7a8': '緑白',
		'#a2c4c9': '水白', '#b4a7d6': '紫白', '#9fc5e8': '青白', '#d5a6bd': '桃白', '#cc4125': '暗赤',
		'#e06666': '赤灰', '#f6b26b': '橙灰', '#ffd966': '黄灰', '#93c47d': '緑灰', '#76a5af': '水灰',
		'#8e7cc3': '紫灰', '#6fa8dc': '青灰', '#c27ba0': '桃灰', '#a61b00': '暗赤茶', '#cc0000': '暗赤',
		'#e69138': '暗橙', '#f1c232': '暗黄', '#6aa84f': '暗緑', '#45818e': '暗水', '#674ea7': '暗紫',
		'#3d85c6': '暗青', '#a64d79': '暗桃', '#85200c': '褐赤', '#990000': '褐赤', '#b45f06': '褐橙',
		'#bf9000': '褐黄', '#38761d': '褐緑', '#134f5c': '褐水', '#351c75': '褐紫', '#0b5394': '褐青',
		'#741b47': '褐桃', '#5b0f00': '暗褐', '#660000': '暗褐赤', '#783f04': '暗褐橙', '#7f6000': '暗褐黄',
		'#274e13': '暗褐緑', '#0c343d': '暗褐水', '#20124d': '暗褐紫', '#073763': '暗褐青', '#4c1130': '暗褐桃'
	};

	const colorPalette = [
		'#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
		'#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
		'#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
		'#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#b4a7d6', '#9fc5e8', '#b4a7d6', '#d5a6bd',
		'#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#8e7cc3', '#6fa8dc', '#8e7cc3', '#c27ba0',
		'#a61b00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#674ea7', '#3d85c6', '#674ea7', '#a64d79',
		'#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#351c75', '#0b5394', '#351c75', '#741b47',
		'#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#20124d', '#073763', '#20124d', '#4c1130'
	];

	function updateOverlayPos() {
		if (!selectedElement || !editorRef) {
			overlayPos = null;
			return;
		}
		const outer = editorRef.closest('.editor-outer');
		if (!outer) return;

		const editorWrapper = editorRef.parentElement;
		if (!editorWrapper) return;

		const wrapperRect = editorWrapper.getBoundingClientRect();
		
		// 画像の場合は実際のサイズを使用（margin を除く）
		const elementRect = selectedElement.tagName === 'IMG' 
			? selectedElement.getBoundingClientRect()
			: selectedElement.getBoundingClientRect();

		overlayPos = {
			left: elementRect.left - wrapperRect.left,
			top: elementRect.top - wrapperRect.top,
			width: elementRect.width,
			height: elementRect.height
		};
	}

	onMount(async () => {
		abortController = new AbortController();

		if (editorRef) {
			// Try to load from localStorage first
			const backup = loadFromLocalStorage();
			if (backup && backup.html) {
				const now = Date.now();
				const hoursSinceBackup = (now - backup.timestamp) / (1000 * 60 * 60);

				if (hoursSinceBackup < 24) { // 24 時間以内のバックアップのみ使用
					editorRef.innerHTML = sanitizeHtml(backup.html);
					innerHTML = editorRef.innerHTML;
					if (backup.history && backup.history.length > 0) {
						history = backup.history;
						historyIndex = backup.historyIndex;
					}
					console.log(`Loaded backup from ${hoursSinceBackup.toFixed(1)} hours ago`);
					// 要素に ID を付与
					assignElementIds();
					return;
				}
			}

			// No valid backup, use provided value
			const p = document.createElement('p');
			p.innerHTML = '<br>';
			editorRef.appendChild(p);
			editorRef.innerHTML = sanitizeHtml(value) || '<p><br></p>';
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			// 要素に ID を付与
			assignElementIds();
		}
	});

	function assignElementIds() {
		if (!editorRef) return;
		// リサイズ可能な要素に ID を付与
		const resizableTags = ['IMG', 'PRE', 'BLOCKQUOTE', 'IFRAME', 'VIDEO', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'HR'];
		editorRef.querySelectorAll(resizableTags.join(', ')).forEach((el, index) => {
			if (!el.getAttribute('data-element-id')) {
				el.setAttribute('data-element-id', `el-${Date.now()}-${index}`);
			}
		});
	}

	function saveToHistory(html: string) {
		// 大きすぎるエントリはスキップ
		if (html.length > MAX_HISTORY_ENTRY_SIZE) {
			console.warn('History entry too large, skipping');
			return;
		}

		// 重複チェック
		if (history[historyIndex] === html) return;

		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push(html);

		// 履歴数制限
		if (newHistory.length > MAX_HISTORY) {
			newHistory.shift();
		} else {
			historyIndex++;
		}
		history = newHistory;
	}

	function saveToLocalStorage(html: string) {
		if (!autoSaveId) return;
		try {
			const backupKey = `${LOCAL_STORAGE_KEY}_${autoSaveId}`;
			const backupData = {
				html,
				timestamp: Date.now(),
				history: history.slice(-5), // 最新の 5 つのみ保存
				historyIndex: historyIndex
			};
			localStorage.setItem(backupKey, JSON.stringify(backupData));
		} catch (err) {
			console.warn('Failed to save to localStorage:', err);
		}
	}

	function loadFromLocalStorage() {
		if (!autoSaveId) return null;
		try {
			const backupKey = `${LOCAL_STORAGE_KEY}_${autoSaveId}`;
			const backupData = localStorage.getItem(backupKey);
			if (backupData) {
				const parsed = JSON.parse(backupData);
				return {
					html: parsed.html,
					timestamp: parsed.timestamp,
					history: parsed.history || [],
					historyIndex: parsed.historyIndex || 0
				};
			}
		} catch (err) {
			console.warn('Failed to load from localStorage:', err);
		}
		return null;
	}

	function clearLocalStorage() {
		if (!autoSaveId) return;
		try {
			const backupKey = `${LOCAL_STORAGE_KEY}_${autoSaveId}`;
			localStorage.removeItem(backupKey);
		} catch (err) {
			console.warn('Failed to clear localStorage:', err);
		}
	}

	function undo() {
		if (historyIndex > 0) {
			historyIndex--;
			const html = history[historyIndex];
			if (html !== undefined) applyHistory(html);
		}
	}

	function redo() {
		if (historyIndex < history.length - 1) {
			historyIndex++;
			const html = history[historyIndex];
			if (html !== undefined) applyHistory(html);
		}
	}

	function applyHistory(html: string) {
		if (editorRef) {
			editorRef.innerHTML = sanitizeHtml(html);
			innerHTML = editorRef.innerHTML;
			if (onchange) onchange(innerHTML);
			// 要素 ID を再付与
			assignElementIds();
			requestAnimationFrame(updateOverlayPos);
		}
	}

	function handleGlobalClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		// テキスト要素も選択可能に
		const resizableTags = ['IMG', 'PRE', 'BLOCKQUOTE', 'IFRAME', 'VIDEO', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'HR'];

		if (resizableTags.includes(target.tagName) && editorRef?.contains(target)) {
			if (selectedElement && selectedElement !== target) {
				selectedElement.removeAttribute('draggable');
			}
			selectedElement = target;
			selectedElement.setAttribute('draggable', 'true');
			// 要素に ID を付与して識別可能に
			if (!selectedElement.getAttribute('data-element-id')) {
				selectedElement.setAttribute('data-element-id', `el-${Date.now()}`);
			}
			updateOverlayPos();
		} else if (!target.closest('.resize-handle') && !target.closest('.rich-editor') &&
			!target.closest('.move-handle') && !target.closest('.color-picker') &&
			!target.closest('.table-context-menu') && !target.closest('.toolbar-btn')) {
			if (selectedElement) {
				selectedElement.removeAttribute('draggable');
			}
			selectedElement = null;
			overlayPos = null;
			showColorPicker = false;
			closeTableContextMenu();
		}
	}

	function handleGlobalContextMenu(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'TD' || target.tagName === 'TH') {
			const table = target.closest('table');
			if (table && editorRef?.contains(table)) {
				handleTableContextMenu(e, target as HTMLTableCellElement);
			}
		}
	}

	// キーボードでドラッグ（アクセシビリティ）
	function handleDragKeydown(e: KeyboardEvent) {
		if (!selectedElement) return;

		// Alt + ArrowUp/Down: 1 つ移動
		if (e.key === 'ArrowUp' && e.altKey && !e.shiftKey) {
			e.preventDefault();
			const prev = selectedElement.previousElementSibling;
			if (prev && editorRef?.contains(prev)) {
				selectedElement.parentElement?.insertBefore(selectedElement, prev);
				saveAndNotify();
			}
		} else if (e.key === 'ArrowDown' && e.altKey && !e.shiftKey) {
			e.preventDefault();
			const next = selectedElement.nextElementSibling;
			if (next && editorRef?.contains(next)) {
				selectedElement.parentElement?.insertBefore(selectedElement, next.nextElementSibling);
				saveAndNotify();
			}
		}
		
		// Alt + Shift + ArrowUp/Down: 5 つ移動（複数ブロック飛ばし）
		if (e.key === 'ArrowUp' && e.altKey && e.shiftKey) {
			e.preventDefault();
			let target = selectedElement;
			for (let i = 0; i < 5; i++) {
				const prev = target.previousElementSibling;
				if (prev && editorRef?.contains(prev)) {
					target = prev;
				}
			}
			if (target !== selectedElement) {
				selectedElement.parentElement?.insertBefore(selectedElement, target);
				saveAndNotify();
			}
		} else if (e.key === 'ArrowDown' && e.altKey && e.shiftKey) {
			e.preventDefault();
			let target = selectedElement;
			for (let i = 0; i < 5; i++) {
				const next = target.nextElementSibling;
				if (next && editorRef?.contains(next)) {
					target = next;
				}
			}
			if (target !== selectedElement) {
				selectedElement.parentElement?.insertBefore(selectedElement, target.nextElementSibling);
				saveAndNotify();
			}
		}
		
		// Alt + PageUp/PageDown: 最初/最後に移動
		if (e.key === 'PageUp' && e.altKey) {
			e.preventDefault();
			const first = editorRef?.firstElementChild;
			if (first && first !== selectedElement) {
				editorRef?.insertBefore(selectedElement, first);
				saveAndNotify();
			}
		} else if (e.key === 'PageDown' && e.altKey) {
			e.preventDefault();
			if (editorRef) {
				editorRef.appendChild(selectedElement);
				saveAndNotify();
			}
		}
	}

	function saveAndNotify() {
		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
			if (autoSaveId) {
				saveToLocalStorage(innerHTML);
			}
		}
		updateOverlayPos();
	}

	function startResize(e: MouseEvent, handle?: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w') {
		if (!selectedElement) return;
		resizing = true;
		resizeHandle = handle || 'se';
		startX = e.clientX;
		startY = e.clientY;

		// 現在のスタイルから幅・高さを取得
		const computedStyle = window.getComputedStyle(selectedElement);
		const currentWidth = parseFloat(computedStyle.width) || selectedElement.clientWidth;
		const currentHeight = parseFloat(computedStyle.height) || selectedElement.clientHeight;

		startWidth = currentWidth;
		startHeight = currentHeight;
		
		// アスペクト比を計算
		if (selectedElement.tagName === 'IMG' || selectedElement.tagName === 'VIDEO') {
			initialAspectRatio = currentWidth / currentHeight;
		}

		e.preventDefault();
		e.stopPropagation();

		window.addEventListener('mousemove', handleResize, { passive: false });
		window.addEventListener('mouseup', stopResize, { once: true });
	}

	function handleResize(e: MouseEvent) {
		if (!resizing || !selectedElement) return;

		const deltaX = e.clientX - startX;
		const deltaY = e.clientY - startY;

		const isTextElement = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'HR', 'BLOCKQUOTE', 'PRE'].includes(selectedElement.tagName);
		const isHeadingElement = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(selectedElement.tagName);
		const isImageOrVideo = ['IMG', 'VIDEO', 'IFRAME'].includes(selectedElement.tagName);
		const minWidth = isTextElement ? 100 : 50;
		const minHeight = isTextElement ? 30 : 20;

		let newWidth = startWidth;
		let newHeight = startHeight;

		// Shift キーの状態を更新
		shiftKeyPressed = e.shiftKey;

		// ハンドル位置に応じてリサイズ方向を変更
		if (resizeHandle?.includes('e')) {
			newWidth = Math.max(minWidth, startWidth + deltaX);
		}
		if (resizeHandle?.includes('w')) {
			newWidth = Math.max(minWidth, startWidth - deltaX);
		}
		if (resizeHandle?.includes('s')) {
			newHeight = Math.max(minHeight, startHeight + deltaY);
		}
		if (resizeHandle?.includes('n')) {
			newHeight = Math.max(minHeight, startHeight - deltaY);
		}

		// アスペクト比維持（Shift キー押しまたはトグルオン）
		if ((e.shiftKey || maintainAspectRatio) && isImageOrVideo) {
			if (resizeHandle?.includes('e') || resizeHandle?.includes('w')) {
				newHeight = newWidth / initialAspectRatio;
			} else if (resizeHandle?.includes('s') || resizeHandle?.includes('n')) {
				newWidth = newHeight * initialAspectRatio;
			}
		}

		selectedElement.style.width = `${newWidth}px`;
		selectedElement.style.height = `${newHeight}px`;

		// 見出し要素はフォントサイズも連動させる
		if (isHeadingElement) {
			// 幅の変化率を計算
			const widthRatio = newWidth / startWidth;
			const computedFontSize = window.getComputedStyle(selectedElement).fontSize;
			const currentFontSize = parseFloat(computedFontSize) || 16;
			
			// 初期フォントサイズを保存
			if (!selectedElement.hasAttribute('data-initial-font-size')) {
				selectedElement.setAttribute('data-initial-font-size', currentFontSize.toString());
			}
			
			const initialFontSize = parseFloat(selectedElement.getAttribute('data-initial-font-size') || '16');
			
			// 幅の変化に応じてフォントサイズを調整（0.5 倍の比率で）
			const fontRatio = 1 + (widthRatio - 1) * 0.5;
			const newFontSize = Math.max(12, initialFontSize * fontRatio);
			
			selectedElement.style.fontSize = `${newFontSize.toFixed(1)}px`;
		}

		// リサイズ中のサイズを表示
		resizeDimension = { width: Math.round(newWidth), height: Math.round(newHeight) };

		updateOverlayPos();
	}

	function stopResize() {
		resizing = false;
		resizeHandle = null;
		resizeDimension = null;
		shiftKeyPressed = false;
		window.removeEventListener('mousemove', handleResize);

		if (selectedElement) {
			// style 属性を直接保存
			const styleAttr = selectedElement.getAttribute('style');
			if (styleAttr) {
				// data-element-id を付与して識別可能に
				if (!selectedElement.getAttribute('data-element-id')) {
					selectedElement.setAttribute('data-element-id', `el-${Date.now()}`);
				}
			}
		}

		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
			if (autoSaveId) {
				saveToLocalStorage(innerHTML);
			}
		}
	}

	function deleteSelectedElement() {
		if (!selectedElement) return;
		selectedElement.remove();
		selectedElement = null;
		overlayPos = null;
		if (editorRef) {
			const html = editorRef.innerHTML;
			saveToHistory(html);
			if (onchange) onchange(html);
			if (autoSaveId) {
				saveToLocalStorage(html);
			}
		}
	}

	// value が外部から変更されたらエディターを更新
	$effect(() => {
		if (!editorRef || !value) return;

		// 編集中は更新しない
		if (document.activeElement === editorRef) return;

		// 内容が異なる場合のみ更新
		const sanitizedValue = sanitizeHtml(value);
		if (sanitizedValue !== editorRef.innerHTML) {
			// 現在の要素の style 情報を保持（data-element-id 付きの要素のみ）
			const elementsWithId = editorRef.querySelectorAll('[data-element-id]');
			const styleMap = new Map<string, string>();
			elementsWithId.forEach((el) => {
				const id = el.getAttribute('data-element-id');
				if (id && el.getAttribute('style')) {
					styleMap.set(id, el.getAttribute('style') || '');
				}
			});

			editorRef.innerHTML = sanitizedValue;
			innerHTML = editorRef.innerHTML;
			saveToHistory(sanitizedValue);

			// style 情報を復元
			styleMap.forEach((style, id) => {
				const el = editorRef.querySelector(`[data-element-id="${id}"]`);
				if (el && style) {
					el.setAttribute('style', style);
				}
			});
		}
	});

	$effect(() => {
		const controller = new AbortController();

		window.addEventListener('click', handleGlobalClick, { signal: controller.signal });
		window.addEventListener('scroll', updateOverlayPos, { capture: true, passive: true, signal: controller.signal });
		window.addEventListener('resize', updateOverlayPos, { passive: true, signal: controller.signal });
		document.addEventListener('selectionchange', handleSelectionChange, { signal: controller.signal });

		// Auto-save interval
		if (autoSaveId) {
			autoSaveInterval = setInterval(() => {
				if (editorRef && innerHTML) {
					saveToLocalStorage(innerHTML);
				}
			}, AUTO_SAVE_INTERVAL);
		}

		return () => {
			controller.abort();
			if (autoSaveInterval) {
				clearInterval(autoSaveInterval);
			}
			// クリーンアップ時にも保存
			if (editorRef && autoSaveId) {
				saveToLocalStorage(editorRef.innerHTML);
			}
		};
	});

	// ドラッグ開始
	function handleDragStart(e: DragEvent) {
		const target = e.target as HTMLElement;
		if (!editorRef?.contains(target)) return;

		// 編集可能な要素のみドラッグ許可
		const allowedTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'DIV', 'IMG', 'VIDEO', 'AUDIO', 'IFRAME'];
		if (!allowedTags.includes(target.tagName)) return;

		// 既存のプレースホルダーを削除（増殖防止）
		if (dragPlaceholder && dragPlaceholder.parentElement) {
			dragPlaceholder.remove();
		}
		dragPlaceholder = null;

		draggedElement = target;
		
		target.style.opacity = '0.4';
		target.style.background = 'rgba(59, 130, 246, 0.1)';
		target.style.transition = 'opacity 0.15s, background 0.15s';

		// プレースホルダー作成（もっと目立たせる）
		dragPlaceholder = document.createElement('div');
		dragPlaceholder.className = 'drag-placeholder';
		dragPlaceholder.style.cssText = 'height: 60px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(147, 51, 234, 0.5)); border: 4px solid #3b82f6; border-radius: 12px; margin: 0; display: flex; align-items: center; justify-content: center; color: #3b82f6; font-weight: 700; font-size: 16px; animation: placeholder-pulse 0.8s infinite;';
		dragPlaceholder.innerHTML = '<span style="font-size: 20px;">📍</span> <span style="margin-left: 8px;">ここに移動</span>';

		e.dataTransfer?.setData('text/plain', target.tagName);
		e.dataTransfer!.effectAllowed = 'move';
		e.dataTransfer!.setDragImage(dragPlaceholder, 50, 30);
	}

	// ドラッグ中 - 簡易化
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';

		if (!draggedElement || !editorRef || !dragPlaceholder) return;

		// 既存のプレースホルダーを一旦削除（増殖防止）
		if (dragPlaceholder.parentElement) {
			dragPlaceholder.remove();
		}

		// マウスポインターの位置の要素を取得
		const elements = document.elementsFromPoint(e.clientX, e.clientY);
		
		// エディター内かどうかをチェック
		const isOverEditor = elements.some(el => editorRef?.contains(el) || el === editorRef);
		if (!isOverEditor) return;

		// ドロップ先の候補を探す
		let insertTarget: HTMLElement | null = null;
		let insertBefore = true;

		for (const el of elements) {
			// 直接の子供として挿入できるブロック要素
			if (editorRef.contains(el) && 
				['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'DIV', 'IMG', 'VIDEO', 'AUDIO', 'IFRAME'].includes(el.tagName) &&
				el !== draggedElement &&
				!el.contains(draggedElement)) {
				
				insertTarget = el;
				
				// 要素の 1/3 以上か以下かで判断（余裕を持たせる）
				const rect = el.getBoundingClientRect();
				const third = rect.height / 3;
				
				if (e.clientY < rect.top + third) {
					// 上 1/3: この要素の前に挿入
					insertBefore = true;
				} else if (e.clientY > rect.bottom - third) {
					// 下 1/3: この要素の後に挿入
					insertBefore = false;
				} else {
					// 中央：何もしない（現在の位置を維持）
					insertTarget = null;
				}
				break;
			}
		}

		// プレースホルダーを配置
		if (insertTarget) {
			if (insertBefore) {
				insertTarget.parentElement?.insertBefore(dragPlaceholder, insertTarget);
			} else {
				insertTarget.parentElement?.insertBefore(dragPlaceholder, insertTarget.nextElementSibling);
			}
		} else {
			// 最後尾に配置
			editorRef.appendChild(dragPlaceholder);
		}
	}

	// ドロップ
	function handleDragEnd(e: DragEvent) {
		if (!draggedElement || !dragPlaceholder) return;

		const placeholderParent = dragPlaceholder.parentElement;
		if (placeholderParent && placeholderParent.contains(dragPlaceholder)) {
			// プレースホルダーの位置に移動
			placeholderParent.insertBefore(draggedElement, dragPlaceholder);

			// プレースホルダー削除
			dragPlaceholder.remove();

			// 変更を保存
			if (editorRef) {
				innerHTML = editorRef.innerHTML;
				saveToHistory(innerHTML);
				if (onchange) onchange(innerHTML);
				if (autoSaveId) {
					saveToLocalStorage(innerHTML);
				}
			}
		}

		// クリーンアップ
		if (draggedElement) {
			draggedElement.style.opacity = '1';
			draggedElement.style.background = '';
			draggedElement.style.transform = 'none';
			draggedElement.style.transition = 'none';
		}
		draggedElement = null;
		dragPlaceholder = null;
		dragOverElement = null;
	}

	async function handleImageUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append('image', file);

		isUploading = true;

		try {
			const response = await fetch('/api/upload?type=misc', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			if (result.success && result.file?.url) {
				insertImageAtCursor(result.file.url);
			} else {
				throw new Error('Upload failed');
			}
		} catch (err) {
			console.error('Image upload failed:', err);
			alert('画像のアップロードに失敗しました');
		} finally {
			isUploading = false;
			if (fileInputRef) fileInputRef.value = '';
		}
	}

	function insertImageAtCursor(src: string) {
		if (!editorRef) return;
		editorRef.focus();

		const selection = window.getSelection();
		if (!selection || !selection.rangeCount) return;

		const range = selection.getRangeAt(0);
		range.deleteContents();

		const img = document.createElement('img');
		img.src = src;
		img.alt = 'Uploaded image';
		img.style.maxWidth = '100%';
		img.style.height = 'auto';
		img.style.borderRadius = '8px';
		img.style.margin = '1rem 0';

		range.insertNode(img);

		const p = document.createElement('p');
		p.innerHTML = '<br>';
		img.after(p);

		const newRange = document.createRange();
		newRange.setStart(p, 0);
		newRange.collapse(true);
		selection.removeAllRanges();
		selection.addRange(newRange);

		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function format(command: string, value: string = '') {
		if (!editorRef) return;

		// エディターにフォーカスを戻す
		editorRef.focus();

		let result = { applied: false, removed: false };

		switch (command) {
			case 'bold':
				result = applyInlineStyleToSelection('b', {}, true);
				break;
			case 'italic':
				result = applyInlineStyleToSelection('i', {}, true);
				break;
			case 'underline':
				result = applyInlineStyleToSelection('u', {}, true);
				break;
			case 'strikeThrough':
				result = applyInlineStyleToSelection('s', {}, true);
				break;
			case 'justifyLeft':
				alignText('left');
				result.applied = true;
				break;
			case 'justifyCenter':
				alignText('center');
				result.applied = true;
				break;
			case 'justifyRight':
				alignText('right');
				result.applied = true;
				break;
			case 'justifyFull':
				alignText('justify');
				result.applied = true;
				break;
		}

		if (editorRef && (result.applied || result.removed)) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
		}
	}

	function setFontSize(size: string) {
		if (!editorRef) return;
		
		// エディターにフォーカスを戻す
		editorRef.focus();
		
		const result = applyInlineStyleToSelection('span', { fontSize: size + 'px' });
		
		if (result.applied || result.removed) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
		}
	}

	function setTextColor(color: string) {
		if (!editorRef) return;
		
		// エディターにフォーカスを戻す
		editorRef.focus();
		
		// 選択範囲に色を適用
		const result = applyInlineStyleToSelection('span', { color });
		
		if (result.applied || result.removed) {
			currentColor = color;
			showColorPicker = false;
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
		}
	}

	function toggleColorPicker(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		const button = (event.target as HTMLElement).closest('.toolbar-btn') as HTMLElement;
		if (!button || !editorRef) return;

		const rect = button.getBoundingClientRect();
		const outer = editorRef.closest('.editor-outer');

		if (outer) {
			const outerRect = outer.getBoundingClientRect();
			colorPickerPosition = {
				x: rect.left - outerRect.left,
				y: rect.bottom - outerRect.top + 4
			};
		}

		showColorPicker = !showColorPicker;
	}

	function handleColorPickerButton(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		
		// カラーピッカーの表示状態をトグル
		showColorPicker = !showColorPicker;
		
		// 位置を計算
		if (editorRef) {
			const button = (event.target as HTMLElement).closest('.toolbar-btn') as HTMLElement;
			if (button) {
				const rect = button.getBoundingClientRect();
				const outer = editorRef.closest('.editor-outer');
				if (outer) {
					const outerRect = outer.getBoundingClientRect();
					colorPickerPosition = {
						x: rect.left - outerRect.left,
						y: rect.bottom - outerRect.top + 4
					};
				}
			}
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLDivElement;
		const newHtml = target.innerHTML;

		// 入力デバウンス - パフォーマンス向上のため 300ms 遅延
		clearTimeout(inputDebounceTimeout);
		pendingInputHtml = newHtml;
		
		inputDebounceTimeout = setTimeout(() => {
			innerHTML = pendingInputHtml;
			
			if (onchange) {
				onchange(innerHTML);
			}

			// 履歴保存はさらに遅延
			clearTimeout(historyTimeout);
			historyTimeout = setTimeout(() => {
				saveToHistory(innerHTML);
				if (autoSaveId) {
					saveToLocalStorage(innerHTML);
				}
			}, 1000);
		}, INPUT_DEBOUNCE_DELAY);

		// SlashMenu の表示は即時処理
		const selection = window.getSelection();
		if (!selection || !selection.rangeCount) {
			menuState.show = false;
			return;
		}

		const range = selection.getRangeAt(0);
		const node = range.startContainer;
		const text = node.textContent || '';
		const cursorOffset = range.startOffset;

		const charBeforeCursor = text[cursorOffset - 1];

		if (charBeforeCursor === '/') {
			const rects = range.getClientRects();
			let rect: DOMRect | undefined = rects.length > 0 ? rects[0] : undefined;

			if (!rect || (rect.width === 0 && rect.height === 0)) {
				const span = document.createElement('span');
				span.textContent = '\u200B';
				range.insertNode(span);
				rect = span.getBoundingClientRect();
				span.remove();
				selection.removeAllRanges();
				selection.addRange(range);
			}

			const outer = editorRef?.closest('.editor-outer');
			if (outer && rect) {
				const outerRect = outer.getBoundingClientRect();
				menuState = {
					show: true,
					x: rect.left - outerRect.left,
					y: rect.bottom - outerRect.top + 4
				};
			}
		} else {
			menuState.show = false;
		}

		if (e instanceof InputEvent) {
			const data = e.data;
			if (data === ' ') {
				handleMarkdownShortcuts(text, node);
			} else if (data) {
				handleInlineShortcuts(text, node, cursorOffset);
			}
		}
	}

	function handleInlineShortcuts(text: string, node: Node, offset: number) {
		const boldMatch = text.slice(0, offset).match(/\*\*([^*]+)\*\*$/);
		if (boldMatch && boldMatch[1]) {
			const start = offset - boldMatch[0].length;
			applyInlineStyle(node, start, offset, 'b', boldMatch[1]);
			return;
		}

		const italicMatch = text.slice(0, offset).match(/\*([^*]+)\*$/);
		if (italicMatch && italicMatch[1]) {
			const start = offset - italicMatch[0].length;
			applyInlineStyle(node, start, offset, 'i', italicMatch[1]);
			return;
		}

		const codeMatch = text.slice(0, offset).match(/`([^`]+)`$/);
		if (codeMatch && codeMatch[1]) {
			const start = offset - codeMatch[0].length;
			applyInlineStyle(node, start, offset, 'code', codeMatch[1]);
			return;
		}
	}

	function applyInlineStyle(node: Node, start: number, end: number, tag: string, content: string) {
		if (node.nodeType !== Node.TEXT_NODE) return;

		const text = node.textContent || '';
		const before = text.slice(0, start);
		const after = text.slice(end);

		const parent = node.parentElement;
		if (!parent) return;

		const element = document.createElement(tag);
		element.textContent = content;

		const afterNode = document.createTextNode(after || '\u200B');

		node.textContent = before;
		parent.insertBefore(element, node.nextSibling);
		parent.insertBefore(afterNode, element.nextSibling);

		const range = document.createRange();
		const selection = window.getSelection();
		if (selection) {
			range.setStart(afterNode, after ? 0 : 1);
			range.collapse(true);
			selection.removeAllRanges();
			selection.addRange(range);
		}

		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
		}
	}

	function handleMarkdownShortcuts(text: string, node: Node) {
		const shortcuts = [
			{ pattern: /^#\s$/, tag: 'h1' },
			{ pattern: /^##\s$/, tag: 'h2' },
			{ pattern: /^###\s$/, tag: 'h3' },
			{ pattern: /^>\s$/, tag: 'blockquote' },
			{ pattern: /^-\s$/, tag: 'li' },
			{ pattern: /^\*\s$/, tag: 'li' },
			{ pattern: /^1\.\s$/, tag: 'li' },
			{ pattern: /^---\s$/, tag: 'hr' },
			{ pattern: /^```\s$/, tag: 'pre' }
		];

		for (const { pattern, tag } of shortcuts) {
			if (pattern.test(text)) {
				if (tag === 'li') {
					toggleList('UL');
					const sel = window.getSelection();
					if (sel && sel.anchorNode) {
						const li = sel.anchorNode.parentElement?.closest('li');
						if (li) li.textContent = '';
					}
				} else if (tag === 'hr') {
					insertHorizontalRule();
					if (node.parentElement) node.parentElement.innerHTML = '';
				} else if (tag === 'pre') {
					formatBlock('PRE');
					const sel = window.getSelection();
					if (sel && sel.anchorNode) {
						const pre = (sel.anchorNode as HTMLElement).closest('pre');
						if (pre) pre.textContent = '';
					}
				} else {
					replaceTextWithBlock(pattern, tag);
				}

				if (editorRef) {
					innerHTML = editorRef.innerHTML;
					saveToHistory(innerHTML);
				}
				break;
			}
		}
	}

	function executeCommand(commandId: string) {
		if (!editorRef) return;
		editorRef.focus();

		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const node = range.startContainer;
			if (node.nodeType === Node.TEXT_NODE) {
				const content = node.textContent || '';
				const slashIndex = content.lastIndexOf('/', range.startOffset - 1);
				if (slashIndex !== -1) {
					node.textContent = content.slice(0, slashIndex) + content.slice(slashIndex + 1);
					const newRange = document.createRange();
					newRange.setStart(node, slashIndex);
					newRange.collapse(true);
					selection.removeAllRanges();
					selection.addRange(newRange);
				}
			}
		}

		switch (commandId) {
			case 'h1': formatBlock('H1'); break;
			case 'h2': formatBlock('H2'); break;
			case 'h3': formatBlock('H3'); break;
			case 'bullet': toggleList('UL'); break;
			case 'number': toggleList('OL'); break;
			case 'quote': toggleBlockquote(); break;
			case 'hr': insertHorizontalRule(); break;
			case 'image': fileInputRef?.click(); break;
			case 'code': formatBlock('PRE'); break;
			case 'table': insertTable(); break;
		}

		menuState.show = false;
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function insertTable() {
		if (!editorRef) return;
		insertTableElement(3, 3);
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function openLinkDialog() {
		if (!editorRef) return;
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		const node = range.commonAncestorContainer as HTMLElement;
		const link = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement?.closest('a');

		if (link) {
			editingLink = link as HTMLAnchorElement;
			linkUrl = editingLink.href;
			linkTarget = editingLink.target || '_self';
			showLinkDialog = true;
		} else {
			editingLink = null;
			linkUrl = '';
			linkTarget = '_blank';
			showLinkDialog = true;
		}
	}

	function insertLink() {
		if (!linkUrl || !editorRef) return;

		try {
			const parsedUrl = new URL(linkUrl.startsWith('http') || linkUrl.startsWith('mailto:') ? linkUrl : `https://${linkUrl}`);
			if (!['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)) {
				alert('無効な URL プロトコルです。http, https, mailto のみ許可されています。');
				return;
			}

			if (editingLink) {
				editingLink.href = parsedUrl.href;
				editingLink.target = linkTarget;
				editingLink.rel = linkTarget === '_blank' ? 'noopener noreferrer' : '';
			} else {
				createLink(parsedUrl.href, linkTarget);
			}

			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
		} catch {
			alert('無効な URL 形式です');
			return;
		}

		showLinkDialog = false;
		editingLink = null;
		linkUrl = '';
		linkTarget = '_blank';
	}

	function unlink() {
		removeLink();
		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
		}
		showLinkDialog = false;
		editingLink = null;
	}

	function closeLinkDialog() {
		showLinkDialog = false;
		editingLink = null;
		linkUrl = '';
		linkTarget = '_blank';
	}

	function toggleLinkTarget() {
		linkTarget = linkTarget === '_blank' ? '_self' : '_blank';
	}

	function openMediaDialog(type: 'video' | 'audio', event: MouseEvent) {
		mediaType = type;
		mediaUrl = '';
		showMediaDialog = true;

		const button = (event.target as HTMLElement).closest('.toolbar-btn') as HTMLElement;
		if (button && editorRef) {
			const rect = button.getBoundingClientRect();
			const outer = editorRef.closest('.editor-outer');
			if (outer) {
				const outerRect = outer.getBoundingClientRect();
				mediaPosition = {
					x: rect.left - outerRect.left,
					y: rect.bottom - outerRect.top + 4
				};
			}
		}
	}

	function closeMediaDialog() {
		showMediaDialog = false;
		mediaUrl = '';
	}

	function insertMedia() {
		if (!mediaUrl || !editorRef) return;

		let mediaHtml = '';
		if (mediaType === 'video') {
			mediaHtml = `<video controls src="${sanitizeHtml(mediaUrl)}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0;"></video>`;
		} else {
			mediaHtml = `<audio controls src="${sanitizeHtml(mediaUrl)}" style="width: 100%; margin: 1rem 0;"></audio>`;
		}

		insertHtmlAtCursor(mediaHtml);

		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);

		closeMediaDialog();
	}

	function openMarkdownExport() {
		if (!editorRef) return;
		const html = editorRef.innerHTML;
		markdownContent = htmlToMarkdown(html);
		showMarkdownDialog = true;
	}

	function closeMarkdownExport() {
		showMarkdownDialog = false;
		markdownContent = '';
	}

	function copyMarkdown() {
		navigator.clipboard.writeText(markdownContent).then(() => {
			alert('Markdown をコピーしました');
		}).catch(() => {
			alert('コピーに失敗しました');
		});
	}

	function downloadMarkdown() {
		const blob = new Blob([markdownContent], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `export-${Date.now()}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleTableContextMenu(e: MouseEvent, cell: HTMLTableCellElement) {
		e.preventDefault();
		e.stopPropagation();
		const table = cell.closest('table');
		const outer = editorRef?.closest('.editor-outer');

		if (outer) {
			const outerRect = outer.getBoundingClientRect();
			tableContextMenu = {
				show: true,
				x: e.clientX - outerRect.left,
				y: e.clientY - outerRect.top,
				cell: cell,
				table: table || null
			};
		}
	}

	function closeTableContextMenu() {
		tableContextMenu = { show: false, x: 0, y: 0, cell: null, table: null };
	}

	function tableAddRowAbove() {
		if (!tableContextMenu.table || !tableContextMenu.cell) return;
		const row = tableContextMenu.cell.parentElement;
		if (!row) return;
		addTableRow(tableContextMenu.table, row.rowIndex - 1);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableAddRowBelow() {
		if (!tableContextMenu.table || !tableContextMenu.cell) return;
		const row = tableContextMenu.cell.parentElement;
		if (!row) return;
		addTableRow(tableContextMenu.table, row.rowIndex);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableAddColumnLeft() {
		if (!tableContextMenu.table || !tableContextMenu.cell) return;
		addTableColumn(tableContextMenu.table, tableContextMenu.cell.cellIndex - 1);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableAddColumnRight() {
		if (!tableContextMenu.table || !tableContextMenu.cell) return;
		addTableColumn(tableContextMenu.table, tableContextMenu.cell.cellIndex);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableDeleteRow() {
		if (!tableContextMenu.table || !tableContextMenu.cell) return;
		const row = tableContextMenu.cell.parentElement;
		if (!row) return;
		deleteTableRow(tableContextMenu.table, row.rowIndex);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableDeleteColumn() {
		if (!tableContextMenu.table || !tableContextMenu.cell) return;
		deleteTableColumn(tableContextMenu.table, tableContextMenu.cell.cellIndex);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableMergeHorizontal() {
		if (!tableContextMenu.cell) return;
		mergeTableCellsHorizontally(tableContextMenu.cell);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableMergeVertical() {
		if (!tableContextMenu.cell) return;
		mergeTableCellsVertically(tableContextMenu.cell);
		saveAndNotify();
		closeTableContextMenu();
	}

	function tableSplit() {
		if (!tableContextMenu.cell) return;
		splitTableCell(tableContextMenu.cell);
		saveAndNotify();
		closeTableContextMenu();
	}

	function updateInlineToolbar() {
		if (!editorRef) return;

		if (isSelectionCollapsed()) {
			showInlineToolbar = false;
			return;
		}

		const bounds = getSelectionBounds();
		if (!bounds) {
			showInlineToolbar = false;
			return;
		}

		const outer = editorRef.closest('.editor-outer');
		if (!outer) return;

		const outerRect = outer.getBoundingClientRect();
		const editorWrapper = editorRef.parentElement;
		if (!editorWrapper) return;

		const wrapperRect = editorWrapper.getBoundingClientRect();

		inlineToolbarPos = {
			x: bounds.left - wrapperRect.left + bounds.width / 2,
			y: bounds.top - wrapperRect.top - 10
		};

		showInlineToolbar = true;
	}

	function handleInlineFormat(command: string) {
		// エディターにフォーカスを戻す
		if (editorRef) {
			editorRef.focus();
		}
		format(command);
		updateInlineToolbar();
	}

	function handleSelectionChange() {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) {
			showInlineToolbar = false;
			isBold = false;
			isItalic = false;
			isUnderline = false;
			isStrikethrough = false;
			return;
		}

		const range = selection.getRangeAt(0);
		if (!editorRef?.contains(range.commonAncestorContainer)) {
			showInlineToolbar = false;
			isBold = false;
			isItalic = false;
			isUnderline = false;
			isStrikethrough = false;
			return;
		}

		// Update inline style states
		isBold = hasInlineStyleInSelection('b') || hasInlineStyleInSelection('strong');
		isItalic = hasInlineStyleInSelection('i') || hasInlineStyleInSelection('em');
		isUnderline = hasInlineStyleInSelection('u');
		isStrikethrough = hasInlineStyleInSelection('s');

		if (range.collapsed) {
			showInlineToolbar = false;
		} else {
			updateInlineToolbar();
		}
	}

	// Enter キーの 2 回押し状態管理
	let lastEnterTime = 0;
	let enterCount = 0;
	let enterTimeout: ReturnType<typeof setTimeout> | null = null;

	function insertNewBlock() {
		if (!editorRef) return;

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		
		// 新しい段落を作成
		const newParagraph = document.createElement('p');
		newParagraph.innerHTML = '<br>';
		
		// 現在のカーソル位置に挿入
		range.insertNode(newParagraph);
		
		// カーソルを新しい段落に移動
		const textNode = newParagraph.firstChild;
		if (textNode) {
			const newRange = document.createRange();
			newRange.setStart(textNode, 0);
			newRange.collapse(true);
			selection.removeAllRanges();
			selection.addRange(newRange);
		}
		
		// 変更を保存
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
		if (autoSaveId) {
			saveToLocalStorage(innerHTML);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (selectedElement && (e.key === 'Backspace' || e.key === 'Delete')) {
			e.preventDefault();
			deleteSelectedElement();
			return;
		}

		// Enter キー 2 回で新しいブロック
		if (e.key === 'Enter') {
			const now = Date.now();
			
			if (now - lastEnterTime < 300) {
				// 2 回目の Enter（300ms 以内）
				e.preventDefault();
				
				// タイマーをクリア
				if (enterTimeout) {
					clearTimeout(enterTimeout);
				}
				
				// 新しい段落を挿入
				insertNewBlock();
				
				// リセット
				enterCount = 0;
				lastEnterTime = 0;
			} else {
				// 1 回目の Enter
				enterCount = 1;
				lastEnterTime = now;
				
				// 300ms 後にリセット
				enterTimeout = setTimeout(() => {
					enterCount = 0;
					lastEnterTime = 0;
				}, 300);
			}
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
			e.preventDefault();
			redo();
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
			e.preventDefault();
			format('bold');
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
			e.preventDefault();
			format('italic');
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
			e.preventDefault();
			format('underline');
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			openLinkDialog();
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
			e.preventDefault();
			format('justifyLeft');
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
			e.preventDefault();
			format('justifyCenter');
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
			e.preventDefault();
			format('justifyRight');
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key === '1') {
			e.preventDefault();
			executeCommand('h1');
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === '2') {
			e.preventDefault();
			executeCommand('h2');
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key === '3') {
			e.preventDefault();
			executeCommand('h3');
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '7') {
			e.preventDefault();
			executeCommand('code');
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'q') {
			e.preventDefault();
			executeCommand('quote');
			return;
		}

		if (e.key === 'Tab') {
			e.preventDefault();
			const selection = window.getSelection();
			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0);
				range.insertNode(document.createTextNode('\u00A0\u00A0'));
			}
		}
	}
</script>

<div class="editor-outer">
	<div class="editor-container">
		<div class="toolbar" role="toolbar" aria-label="エディターツールバー">
			<button type="button" class="toolbar-btn" onclick={undo} disabled={historyIndex <= 0} title="元に戻す (Ctrl+Z)" aria-label="元に戻す (Ctrl+Z)">
				<Undo size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onclick={redo} disabled={historyIndex >= history.length - 1} title="やり直し (Ctrl+Y)" aria-label="やり直し (Ctrl+Y)">
				<Redo size={18} aria-hidden="true" />
			</button>
			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" class:active={isBold} onmousedown={(e) => { e.preventDefault(); format('bold'); }} title="太字 (Ctrl+B)" aria-label="太字 (Ctrl+B)">
				<Bold size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" class:active={isItalic} onmousedown={(e) => { e.preventDefault(); format('italic'); }} title="イタリック (Ctrl+I)" aria-label="イタリック (Ctrl+I)">
				<Italic size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" class:active={isUnderline} onmousedown={(e) => { e.preventDefault(); format('underline'); }} title="下線 (Ctrl+U)" aria-label="下線 (Ctrl+U)">
				<Underline size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" class:active={isStrikethrough} onmousedown={(e) => { e.preventDefault(); format('strikeThrough'); }} title="取り消し線" aria-label="取り消し線">
				<Strikethrough size={18} aria-hidden="true" />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onmousedown={handleColorPickerButton} title="文字色" aria-label="文字色を選択">
				<Palette size={18} aria-hidden="true" />
			</button>

			<div class="v-divider"></div>

			<select onmousedown={(e) => { e.preventDefault(); editorRef?.focus(); }} onchange={(e) => {
				const size = (e.target as HTMLSelectElement).value;
				if (size) setFontSize(size);
			}} class="toolbar-select" value={currentFontSize} aria-label="フォントサイズ">
				<option value="12">12px</option>
				<option value="14">14px</option>
				<option value="16">16px</option>
				<option value="18">18px</option>
				<option value="20">20px</option>
				<option value="24">24px</option>
				<option value="28">28px</option>
				<option value="32">32px</option>
				<option value="36">36px</option>
				<option value="48">48px</option>
				<option value="60">60px</option>
			</select>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={() => executeCommand('h1')} title="見出し 1 (Ctrl+1)" aria-label="見出し 1">
				<Heading1 size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('h2')} title="見出し 2 (Ctrl+2)" aria-label="見出し 2">
				<Heading2 size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('h3')} title="見出し 3 (Ctrl+3)" aria-label="見出し 3">
				<Heading3 size={18} aria-hidden="true" />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); format('justifyLeft'); }} title="左揃え (Ctrl+L)" aria-label="左揃え">
				<AlignLeft size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); format('justifyCenter'); }} title="中央揃え (Ctrl+E)" aria-label="中央揃え">
				<AlignCenter size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); format('justifyRight'); }} title="右揃え (Ctrl+R)" aria-label="右揃え">
				<AlignRight size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); format('justifyFull'); }} title="両端揃え" aria-label="両端揃え">
				<AlignJustify size={18} aria-hidden="true" />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); executeCommand('bullet'); }} title="箇条書き" aria-label="箇条書きリスト">
				<List size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); executeCommand('number'); }} title="番号付きリスト" aria-label="番号付きリスト">
				<ListOrdered size={18} aria-hidden="true" />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); executeCommand('quote'); }} title="引用 (Ctrl+Shift+Q)" aria-label="引用">
				<Quote size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); executeCommand('code'); }} title="コードブロック (Ctrl+Shift+7)" aria-label="コードブロック">
				<Code size={18} />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={openLinkDialog} title="リンク (Ctrl+K)" aria-label="リンクを挿入">
				<LinkIcon size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => fileInputRef?.click()} title="画像" aria-label="画像をアップロード" disabled={isUploading}>
				{#if isUploading}
					<div class="loading-spinner" aria-label="アップロード中"></div>
				{:else}
					<ImageIcon size={18} aria-hidden="true" />
				{/if}
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('table')} title="テーブル" aria-label="テーブルを挿入">
				<TableIcon size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('hr')} title="区切り線" aria-label="区切り線を挿入">
				<Minus size={18} aria-hidden="true" />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={(e) => openMediaDialog('video', e)} title="動画を埋め込む" aria-label="動画を埋め込む">
				<Video size={18} aria-hidden="true" />
			</button>
			<button type="button" class="toolbar-btn" onclick={(e) => openMediaDialog('audio', e)} title="音声を埋め込む" aria-label="音声を埋め込む">
				<Mic size={18} aria-hidden="true" />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={openMarkdownExport} title="Markdown エクスポート" aria-label="Markdown エクスポート">
				<Code size={18} aria-hidden="true" />
			</button>

			<input
				type="file"
				bind:this={fileInputRef}
				onchange={handleImageUpload}
				accept="image/*"
				style="display: none;"
				aria-label="画像ファイル選択"
			/>

			{#if selectedElement}
				<div class="v-divider"></div>
				<button type="button" class="toolbar-btn" onclick={deleteSelectedElement} title="削除" style="color: #ef4444;" aria-label="選択した要素を削除">
					<Trash2 size={18} aria-hidden="true" />
				</button>
			{/if}
		</div>

		<div class="editor-wrapper">
			<div
				bind:this={editorRef}
				class="rich-editor"
				contenteditable="true"
				oninput={handleInput}
				onkeydown={(e) => { handleKeyDown(e); handleDragKeydown(e); }}
				ondragstart={handleDragStart}
				ondragover={handleDragOver}
				ondragend={handleDragEnd}
				oncontextmenu={handleGlobalContextMenu}
				role="textbox"
				tabindex="0"
				aria-multiline="true"
				aria-placeholder={placeholder}
			></div>

			{#if !innerHTML || innerHTML === '<br>'}
				<div class="placeholder">{placeholder}</div>
			{/if}

			{#if selectedElement && overlayPos}
				<div
					class="image-resizer-overlay"
					style="left: {overlayPos.left}px; top: {overlayPos.top}px; width: {overlayPos.width}px; height: {overlayPos.height}px;"
				>
					<!-- 移動ハンドル -->
					<div
						class="move-handle"
						onmousedown={(e) => {
							e.stopPropagation();
							if (selectedElement) {
								selectedElement.setAttribute('draggable', 'true');
								// ドラッグ開始エフェクト
								selectedElement.style.opacity = '0.4';
								selectedElement.style.background = 'rgba(59, 130, 246, 0.1)';
							}
						}}
						title="ドラッグして移動"
					>
						<Move size={14} />
						<span>移動</span>
					</div>
					
					<!-- クイック移動ボタン -->
					<div class="quick-move-buttons">
						<button
							type="button"
							class="quick-move-btn"
							onclick={(e) => {
								e.stopPropagation();
								if (selectedElement && selectedElement.previousElementSibling) {
									selectedElement.parentElement?.insertBefore(selectedElement, selectedElement.previousElementSibling);
									saveAndNotify();
								}
							}}
							title="1 つ上へ移動 (Alt+↑)"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 19V5"/>
								<path d="M5 12l7-7 7 7"/>
							</svg>
						</button>
						<button
							type="button"
							class="quick-move-btn"
							onclick={(e) => {
								e.stopPropagation();
								if (selectedElement && selectedElement.nextElementSibling) {
									selectedElement.parentElement?.insertBefore(selectedElement, selectedElement.nextElementSibling.nextElementSibling);
									saveAndNotify();
								}
							}}
							title="1 つ下へ移動 (Alt+↓)"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 5v14"/>
								<path d="M19 12l-7 7-7-7"/>
							</svg>
						</button>
						<button
							type="button"
							class="quick-move-btn"
							onclick={(e) => {
								e.stopPropagation();
								if (selectedElement && editorRef) {
									const first = editorRef.firstElementChild;
									if (first && first !== selectedElement) {
										editorRef.insertBefore(selectedElement, first);
										saveAndNotify();
									}
								}
							}}
							title="最初に移動 (Alt+PageUp)"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 5v14"/>
								<path d="M19 12l-7-7-7 7"/>
							</svg>
						</button>
						<button
							type="button"
							class="quick-move-btn"
							onclick={(e) => {
								e.stopPropagation();
								if (selectedElement && editorRef) {
									editorRef.appendChild(selectedElement);
									saveAndNotify();
								}
							}}
							title="最後に移動 (Alt+PageDown)"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 5v14"/>
								<path d="M5 12l7 7 7-7"/>
							</svg>
						</button>
					</div>
					
					<!-- アスペクト比維持トグル -->
					{#if selectedElement.tagName === 'IMG' || selectedElement.tagName === 'VIDEO'}
						<button
							type="button"
							class="aspect-ratio-toggle"
							class:active={maintainAspectRatio}
							onclick={(e) => {
								e.stopPropagation();
								maintainAspectRatio = !maintainAspectRatio;
							}}
							title="アスペクト���を維持 (Shift キーでも切り替え可能)"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M5 5h14v14H5z"/>
								<path d="M9 9l6 6"/>
							</svg>
						</button>
					{/if}
					
					<!-- リサイズ中のサイズ表示 -->
					{#if resizeDimension}
						<div class="resize-dimension-display">
							{resizeDimension.width} × {resizeDimension.height} px
							{#if maintainAspectRatio || shiftKeyPressed}
								<span class="aspect-ratio-indicator"> 🔒</span>
							{/if}
						</div>
					{/if}
					
					<!-- 8 方向リサイズハンドル -->
					<div class="resize-handle nw" onmousedown={(e) => startResize(e, 'nw')} title="左上からリサイズ"></div>
					<div class="resize-handle n" onmousedown={(e) => startResize(e, 'n')} title="上からリサイズ"></div>
					<div class="resize-handle ne" onmousedown={(e) => startResize(e, 'ne')} title="右上からリサイズ"></div>
					<div class="resize-handle e" onmousedown={(e) => startResize(e, 'e')} title="右からリサイズ"></div>
					<div class="resize-handle se" onmousedown={(e) => startResize(e, 'se')} title="右下からリサイズ"></div>
					<div class="resize-handle s" onmousedown={(e) => startResize(e, 's')} title="下からリサイズ"></div>
					<div class="resize-handle sw" onmousedown={(e) => startResize(e, 'sw')} title="左下からリサイズ"></div>
					<div class="resize-handle w" onmousedown={(e) => startResize(e, 'w')} title="左からリサイズ"></div>
					
					<!-- クイックサイズプリセット -->
					<div class="resize-presets">
						<button type="button" class="preset-btn" onclick={(e) => {
							e.stopPropagation();
							if (selectedElement) {
								const rect = selectedElement.getBoundingClientRect();
								const parent = selectedElement.parentElement;
								if (parent) {
									const parentWidth = parent.clientWidth;
									selectedElement.style.width = `${parentWidth * 0.25}px`;
									if (maintainAspectRatio && (selectedElement.tagName === 'IMG' || selectedElement.tagName === 'VIDEO')) {
										selectedElement.style.height = 'auto';
									}
									saveAndNotify();
								}
							}
						}} title="幅 25%">25%</button>
						<button type="button" class="preset-btn" onclick={(e) => {
							e.stopPropagation();
							if (selectedElement) {
								const rect = selectedElement.getBoundingClientRect();
								const parent = selectedElement.parentElement;
								if (parent) {
									const parentWidth = parent.clientWidth;
									selectedElement.style.width = `${parentWidth * 0.5}px`;
									if (maintainAspectRatio && (selectedElement.tagName === 'IMG' || selectedElement.tagName === 'VIDEO')) {
										selectedElement.style.height = 'auto';
									}
									saveAndNotify();
								}
							}
						}} title="幅 50%">50%</button>
						<button type="button" class="preset-btn" onclick={(e) => {
							e.stopPropagation();
							if (selectedElement) {
								const rect = selectedElement.getBoundingClientRect();
								const parent = selectedElement.parentElement;
								if (parent) {
									const parentWidth = parent.clientWidth;
									selectedElement.style.width = `${parentWidth * 0.75}px`;
									if (maintainAspectRatio && (selectedElement.tagName === 'IMG' || selectedElement.tagName === 'VIDEO')) {
										selectedElement.style.height = 'auto';
									}
									saveAndNotify();
								}
							}
						}} title="幅 75%">75%</button>
						<button type="button" class="preset-btn" onclick={(e) => {
							e.stopPropagation();
							if (selectedElement) {
								selectedElement.style.width = '100%';
								if (maintainAspectRatio && (selectedElement.tagName === 'IMG' || selectedElement.tagName === 'VIDEO')) {
									selectedElement.style.height = 'auto';
								}
								saveAndNotify();
							}
						}} title="幅 100%">100%</button>
					</div>
				</div>
			{/if}

			{#if showColorPicker}
				<div class="color-picker" style="left: {colorPickerPosition.x}px; top: {colorPickerPosition.y}px;">
					<div class="color-picker-title">文字色を選択</div>
					<div class="color-grid">
						{#each colorPalette as color}
			<button
								type="button"
								class="color-swatch"
								style="background: {color};"
								onclick={(e) => { e.preventDefault(); e.stopPropagation(); setTextColor(color); }}
								title="{colorNames[color] || color} ({color})"
								aria-label="{colorNames[color] || color}"
							></button>
						{/each}
					</div>
				</div>
			{/if}

			{#if showMediaDialog}
				<div class="color-picker" style="left: {mediaPosition.x}px; top: {mediaPosition.y}px;">
					<div class="color-picker-title">{mediaType === 'video' ? '動画を埋め込む' : '音声を埋め込む'}</div>
					<input
						type="url"
						value={mediaUrl}
						oninput={(e) => mediaUrl = (e.target as HTMLInputElement).value}
						placeholder="{mediaType === 'video' ? 'https://...' : 'https://...'}"
						class="dialog-input"
						style="margin-bottom: 0.75rem;"
					/>
					<div class="dialog-actions">
						<button type="button" class="btn-secondary" onclick={closeMediaDialog}>
							キャンセル
						</button>
						<button type="button" class="btn-primary" onclick={insertMedia} disabled={!mediaUrl}>
							挿入
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if menuState.show}
		<SlashMenu
			x={menuState.x}
			y={menuState.y}
			onSelect={executeCommand}
			onClose={() => menuState.show = false}
		/>
	{/if}

	{#if showInlineToolbar}
		<div
			class="inline-toolbar"
			style="left: {inlineToolbarPos.x}px; top: {inlineToolbarPos.y}px;"
		>
			<button type="button" class="inline-toolbar-btn" onclick={() => handleInlineFormat('bold')} title="太字" aria-label="太字">
				<Bold size={16} />
			</button>
			<button type="button" class="inline-toolbar-btn" onclick={() => handleInlineFormat('italic')} title="イタリック" aria-label="イタリック">
				<Italic size={16} />
			</button>
			<button type="button" class="inline-toolbar-btn" onclick={() => handleInlineFormat('underline')} title="下線" aria-label="下線">
				<Underline size={16} />
			</button>
			<button type="button" class="inline-toolbar-btn" onclick={() => handleInlineFormat('strikeThrough')} title="取り消し線" aria-label="取り消し線">
				<Strikethrough size={16} />
			</button>
			<div class="inline-toolbar-divider"></div>
			<button type="button" class="inline-toolbar-btn" onclick={openLinkDialog} title="リンク" aria-label="リンク">
				<LinkIcon size={16} />
			</button>
		</div>
	{/if}

	{#if showLinkDialog}
		<div class="dialog-overlay" onclick={closeLinkDialog}>
			<div class="link-dialog" onclick={(e) => e.stopPropagation()}>
				<h3 class="dialog-title">{editingLink ? 'リンクを編集' : 'リンクを挿入'}</h3>
				<div class="dialog-content">
					<label class="dialog-label">
						<span>URL</span>
						<input
							type="url"
							value={linkUrl}
							oninput={(e) => linkUrl = (e.target as HTMLInputElement).value}
							placeholder="https://example.com"
							class="dialog-input"
						/>
					</label>
					<label class="dialog-label">
						<span>ターゲット</span>
						<div class="target-toggle">
							<button
								type="button"
								class="target-btn"
								class:active={linkTarget === '_blank'}
								onclick={toggleLinkTarget}
							>
								新規タブ {linkTarget === '_blank' ? '✓' : ''}
							</button>
							<button
								type="button"
								class="target-btn"
								class:active={linkTarget === '_self'}
								onclick={toggleLinkTarget}
							>
								同じタブ {linkTarget === '_self' ? '✓' : ''}
							</button>
						</div>
					</label>
				</div>
				<div class="dialog-actions">
					{#if editingLink}
						<button type="button" class="btn-danger" onclick={unlink}>
							リンクを削除
						</button>
					{/if}
					<button type="button" class="btn-secondary" onclick={closeLinkDialog}>
						キャンセル
					</button>
					<button type="button" class="btn-primary" onclick={insertLink} disabled={!linkUrl}>
						{editingLink ? '更新' : '挿入'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showMarkdownDialog}
		<div class="dialog-overlay" onclick={closeMarkdownExport}>
			<div class="markdown-dialog" onclick={(e) => e.stopPropagation()}>
				<h3 class="dialog-title">Markdown エクスポート</h3>
				<div class="markdown-content">
					<textarea value={markdownContent} readonly class="markdown-textarea"></textarea>
				</div>
				<div class="dialog-actions">
					<button type="button" class="btn-secondary" onclick={copyMarkdown}>
						コピー
					</button>
					<button type="button" class="btn-secondary" onclick={downloadMarkdown}>
						ダウンロード
					</button>
					<button type="button" class="btn-primary" onclick={closeMarkdownExport}>
						閉じる
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if tableContextMenu.show && tableContextMenu.cell}
		<div
			class="table-context-menu"
			style="left: {tableContextMenu.x}px; top: {tableContextMenu.y}px;"
			onclick={closeTableContextMenu}
		>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableAddRowAbove(); }}>
				上に行を追加
			</button>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableAddRowBelow(); }}>
				下に行を追加
			</button>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableAddColumnLeft(); }}>
				左に列を追加
			</button>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableAddColumnRight(); }}>
				右に列を追加
			</button>
			<div class="context-menu-divider"></div>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableDeleteRow(); }}>
				行を削除
			</button>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableDeleteColumn(); }}>
				列を削除
			</button>
			<div class="context-menu-divider"></div>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableMergeHorizontal(); }}>
				セルを結合（��）
			</button>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableMergeVertical(); }}>
				セルを結合（縦）
			</button>
			<button type="button" class="context-menu-btn" onclick={(e) => { e.stopPropagation(); tableSplit(); }}>
				セルを分割
			</button>
		</div>
	{/if}
</div>

<style>
	.editor-outer {
		position: relative;
		width: 100%;
	}

	.editor-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		background: #ffffff;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 8px;
		background: rgba(249, 250, 251, 0.85);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid rgba(229, 231, 235, 0.5);
		flex-wrap: wrap;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: #4b5563;
		cursor: pointer;
		transition: all 0.15s;
	}

	.toolbar-btn:hover:not(:disabled) {
		background: #e5e7eb;
		color: #1f2937;
	}

	.toolbar-btn:active:not(:disabled) {
		background: #d1d5db;
		transform: scale(0.95);
	}

	.toolbar-btn.active {
		background: #3b82f6;
		color: white;
	}

	.toolbar-btn.active:hover {
		background: #2563eb;
	}

	.toolbar-btn:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.toolbar-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.toolbar-select {
		height: 34px;
		padding: 0 8px;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: white;
		font-size: 13px;
		cursor: pointer;
		outline: none;
	}

	.toolbar-select:hover {
		border-color: #9ca3af;
	}

	.toolbar-select:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.loading-spinner {
		width: 18px;
		height: 18px;
		border: 2px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.v-divider {
		width: 1px;
		height: 24px;
		background: #e5e7eb;
		margin: 0 4px;
	}

	.editor-wrapper {
		position: relative;
		padding: 1.25rem;
		cursor: text;
		background: #ffffff;
		min-height: 400px;
		overflow: visible;
	}

	.rich-editor {
		outline: none;
		min-height: 400px;
		line-height: 1.8;
		color: #1f2937;
		font-size: 16px;
	}

	.rich-editor:focus {
		cursor: text;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
		border-radius: 8px;
	}

	.rich-editor:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.placeholder {
		position: absolute;
		top: 1.25rem;
		left: 1.25rem;
		color: #9ca3af;
		pointer-events: none;
		font-style: italic;
		font-size: 16px;
	}

	.color-picker {
		position: absolute;
		z-index: 10000;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(229, 231, 235, 0.5);
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		padding: 12px;
		min-width: 280px;
		pointer-events: auto;
	}

	.color-picker-title {
		font-size: 12px;
		font-weight: 600;
		color: #6b7280;
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 4px;
	}

	.color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		cursor: pointer;
		transition: transform 0.1s, box-shadow 0.1s;
	}

	.color-swatch:hover {
		transform: scale(1.15);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		border-color: rgba(0, 0, 0, 0.3);
	}

	.image-resizer-overlay {
		position: absolute;
		pointer-events: none;
		border: 2px solid #3b82f6;
		z-index: 50;
		transition: none;
		border-radius: 4px;
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.15);
		animation: resizer-appear 0.2s ease-out;
	}

	@keyframes resizer-appear {
		from { opacity: 0; transform: scale(0.98); }
		to { opacity: 1; transform: scale(1); }
	}
	
	@keyframes placeholder-pulse {
		0%, 100% { opacity: 0.7; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.02); }
	}

	.move-handle {
		position: absolute;
		top: -36px;
		left: 0;
		background: rgba(59, 130, 246, 0.9);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: white;
		padding: 6px 12px;
		border-radius: 6px 6px 4px 4px;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		cursor: grab;
		pointer-events: auto;
		border: 1px solid rgba(59, 130, 246, 0.5);
		box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
		transition: all 0.15s;
	}

	.move-handle:hover {
		background: rgba(37, 99, 235, 0.95);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
		transform: translateY(-1px);
	}

	.move-handle:active {
		cursor: grabbing;
		transform: translateY(0);
	}
	
	/* クイック移動ボタン */
	.quick-move-buttons {
		position: absolute;
		top: -36px;
		right: 60px;
		display: flex;
		gap: 4px;
		pointer-events: auto;
		z-index: 55;
	}

	.quick-move-btn {
		background: rgba(139, 92, 246, 0.9);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: white;
		border: 1px solid rgba(139, 92, 246, 0.5);
		width: 32px;
		height: 32px;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
	}

	.quick-move-btn:hover {
		background: rgba(124, 58, 237, 0.95);
		box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
		transform: translateY(-1px);
	}

	.quick-move-btn:active {
		transform: translateY(0);
		box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
	}

	/* アスペクト比トグル */
	.aspect-ratio-toggle {
		position: absolute;
		top: -36px;
		right: 0;
		background: rgba(16, 185, 129, 0.9);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: white;
		border: 1px solid rgba(16, 185, 129, 0.5);
		padding: 6px 10px;
		border-radius: 6px;
		cursor: pointer;
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
	}

	.aspect-ratio-toggle:hover {
		background: rgba(5, 150, 105, 0.95);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
		transform: translateY(-1px);
	}

	.aspect-ratio-toggle.active {
		background: rgba(5, 150, 105, 0.95);
		animation: pulse-lock 1.5s infinite;
	}

	@keyframes pulse-lock {
		0%, 100% { box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4); }
		50% { box-shadow: 0 4px 16px rgba(16, 185, 129, 0.6); }
	}

	/* 8 方向リサイズハンドル */
	.resize-handle {
		position: absolute;
		width: 14px;
		height: 14px;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		border: 2px solid #3b82f6;
		pointer-events: auto;
		cursor: nwse-resize;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
		border-radius: 3px;
		transition: all 0.15s;
		z-index: 52;
	}

	.resize-handle:hover {
		transform: scale(1.3);
		background: rgba(59, 130, 246, 0.9);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
	}

	.resize-handle:active {
		transform: scale(1.4);
		background: rgba(37, 99, 235, 0.9);
	}

	.resize-handle.nw {
		left: -7px;
		top: -7px;
		cursor: nwse-resize;
	}

	.resize-handle.n {
		left: 50%;
		top: -7px;
		transform: translateX(-50%);
		cursor: ns-resize;
	}

	.resize-handle.n:hover,
	.resize-handle.n:active {
		transform: translateX(-50%) scale(1.3);
	}

	.resize-handle.ne {
		right: -7px;
		top: -7px;
		cursor: nesw-resize;
	}

	.resize-handle.e {
		right: -7px;
		top: 50%;
		transform: translateY(-50%);
		cursor: ew-resize;
	}

	.resize-handle.e:hover,
	.resize-handle.e:active {
		transform: translateY(-50%) scale(1.3);
	}

	.resize-handle.se {
		right: -7px;
		bottom: -7px;
		cursor: nwse-resize;
	}

	.resize-handle.s {
		left: 50%;
		bottom: -7px;
		transform: translateX(-50%);
		cursor: ns-resize;
	}

	.resize-handle.s:hover,
	.resize-handle.s:active {
		transform: translateX(-50%) scale(1.3);
	}

	.resize-handle.sw {
		left: -7px;
		bottom: -7px;
		cursor: nesw-resize;
	}

	.resize-handle.w {
		left: -7px;
		top: 50%;
		transform: translateY(-50%);
		cursor: ew-resize;
	}

	.resize-handle.w:hover,
	.resize-handle.w:active {
		transform: translateY(-50%) scale(1.3);
	}

	/* クイックサイズプリセット */
	.resize-presets {
		position: absolute;
		bottom: -40px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		gap: 6px;
		pointer-events: auto;
		z-index: 53;
	}

	.preset-btn {
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(229, 231, 235, 0.5);
		color: #6b7280;
		padding: 4px 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.preset-btn:hover {
		background: rgba(59, 130, 246, 0.9);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border-color: rgba(59, 130, 246, 0.5);
		color: white;
		box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
		transform: translateY(-2px);
	}

	.preset-btn:active {
		transform: translateY(0);
	}

	.resize-dimension-display {
		position: absolute;
		top: -48px;
		right: 0;
		background: rgba(31, 41, 55, 0.95);
		color: white;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		pointer-events: none;
		z-index: 54;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.aspect-ratio-indicator {
		font-size: 14px;
	}

	/* Drag and Drop Styles */
	:global(.rich-editor [draggable="true"]) {
		cursor: grab;
		outline: 2px solid rgba(59, 130, 246, 0.4);
		outline-offset: 2px;
		transition: outline-color 0.15s, transform 0.15s;
		border-radius: 8px;
	}

	:global(.rich-editor [draggable="true"]:hover) {
		outline-color: rgba(59, 130, 246, 0.6);
		background: rgba(59, 130, 246, 0.05);
	}

	:global(.rich-editor [draggable="true"]:active) {
		cursor: grabbing;
	}

	:global(.drag-placeholder) {
		height: 80px;
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3));
		border: 3px dashed #3b82f6;
		border-radius: 12px;
		margin: 1rem 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #3b82f6;
		font-weight: 600;
		font-size: 14px;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.6; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.02); }
	}

	/* Editor content styles */
	:global(.rich-editor h1) {
		font-size: 2.25rem;
		font-weight: 800;
		margin: 1.5rem 0 1rem;
		color: #1f2937;
		line-height: 1.2;
	}

	:global(.rich-editor h2) {
		font-size: 1.875rem;
		font-weight: 700;
		margin: 1.2rem 0 0.8rem;
		color: #1f2937;
		line-height: 1.3;
	}

	:global(.rich-editor h3) {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 1rem 0 0.6rem;
		color: #1f2937;
		line-height: 1.4;
	}

	:global(.rich-editor blockquote) {
		border-left: 4px solid #3b82f6;
		padding-left: 1rem;
		margin: 1rem 0;
		color: #4b5563;
		font-style: italic;
		background: #f9fafb;
		padding: 1rem;
		border-radius: 0 8px 8px 0;
	}

	:global(.rich-editor ul),
	:global(.rich-editor ol) {
		padding-left: 1.5rem;
		margin: 1rem 0;
	}

	:global(.rich-editor li) {
		margin: 0.5rem 0;
	}

	:global(.rich-editor pre) {
		background: #1f2937;
		color: #f3f4f6;
		padding: 1rem;
		border-radius: 8px;
		font-family: 'Fira Code', 'Consolas', monospace;
		overflow-x: auto;
		min-width: 100px;
		min-height: 1.5em;
		margin: 1rem 0;
	}

	:global(.rich-editor code) {
		background: #f3f4f6;
		color: #dc2626;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: 0.875em;
	}

	:global(.rich-editor pre code) {
		background: transparent;
		color: inherit;
		padding: 0;
	}

	:global(.rich-editor hr) {
		border: 0;
		border-top: 2px solid #e5e7eb;
		margin: 2rem 0;
	}

	:global(.rich-editor a) {
		color: #3b82f6;
		text-decoration: underline;
	}

	:global(.rich-editor img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		margin: 0;
		display: block;
	}

	:global(.rich-editor table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	:global(.rich-editor table td),
	:global(.rich-editor table th) {
		border: 1px solid #e5e7eb;
		padding: 0.75rem;
	}

	:global(.rich-editor [draggable="true"]) {
		cursor: grab;
	}

	:global(.rich-editor [draggable="true"]:active) {
		cursor: grabbing;
	}

	/* モバイル対応 - レスポンシブツールバー */
	@media (max-width: 768px) {
		.toolbar {
			overflow-x: auto;
			flex-wrap: nowrap;
			-webkit-overflow-scrolling: touch;
		}

		.toolbar::-webkit-scrollbar {
			height: 4px;
		}

		.toolbar::-webkit-scrollbar-thumb {
			background: #d1d5db;
			border-radius: 2px;
		}

		.toolbar-btn {
			width: 44px;
			height: 44px;
			flex-shrink: 0;
		}

		.v-divider {
			margin: 0 2px;
			flex-shrink: 0;
		}

		.toolbar-select {
			flex-shrink: 0;
			font-size: 12px;
			height: 44px;
		}

		.color-grid {
			grid-template-columns: repeat(5, 1fr);
		}

		.color-picker {
			min-width: 200px;
			left: 0 !important;
		}

		.inline-toolbar {
			overflow-x: auto;
			max-width: calc(100vw - 2rem);
		}

		.inline-toolbar-btn {
			width: 40px;
			height: 40px;
			flex-shrink: 0;
		}
	}

	@media (max-width: 480px) {
		.toolbar-btn {
			width: 44px;
			height: 44px;
		}

		.inline-toolbar-btn {
			width: 36px;
			height: 36px;
		}

		.color-swatch {
			width: 28px;
			height: 28px;
		}
	}

	/* Link Dialog Styles */
	.dialog-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.link-dialog {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 12px;
		padding: 1.5rem;
		min-width: 400px;
		max-width: 90vw;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(229, 231, 235, 0.5);
	}

	.dialog-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.dialog-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.dialog-label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.dialog-label span {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
	}

	.dialog-input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.dialog-input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.target-toggle {
		display: flex;
		gap: 0.5rem;
	}

	.target-btn {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		background: #ffffff;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.target-btn:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.target-btn.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: #ffffff;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn-primary,
	.btn-secondary,
	.btn-danger {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		border: none;
	}

	.btn-primary {
		background: #3b82f6;
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-danger {
		background: #fee2e2;
		color: #dc2626;
	}

	.btn-danger:hover {
		background: #fecaca;
	}

	/* Inline Toolbar Styles */
	.inline-toolbar {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px;
		background: rgba(31, 41, 55, 0.9);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 8px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		transform: translateX(-50%) translateY(-100%);
		pointer-events: auto;
	}

	.inline-toolbar::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-top-color: #1f2937;
	}

	.inline-toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: #f9fafb;
		cursor: pointer;
		transition: all 0.15s;
	}

	.inline-toolbar-btn:hover {
		background: #374151;
	}

	.inline-toolbar-btn:active {
		background: #4b5563;
		transform: scale(0.95);
	}

	.inline-toolbar-divider {
		width: 1px;
		height: 20px;
		background: #4b5563;
		margin: 0 4px;
	}

	@media (max-width: 480px) {
		.link-dialog {
			min-width: auto;
			width: 90vw;
		}
	}

	/* Markdown Dialog Styles */
	.markdown-dialog {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 12px;
		padding: 1.5rem;
		min-width: 500px;
		max-width: 90vw;
		max-height: 80vh;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(229, 231, 235, 0.5);
		display: flex;
		flex-direction: column;
	}

	.markdown-content {
		flex: 1;
		min-height: 300px;
		margin-bottom: 1.5rem;
	}

	.markdown-textarea {
		width: 100%;
		height: 100%;
		min-height: 300px;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: 0.875rem;
		resize: vertical;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.markdown-textarea:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	@media (max-width: 480px) {
		.markdown-dialog {
			min-width: auto;
			width: 90vw;
		}

		.markdown-textarea {
			min-height: 200px;
		}
	}

	/* Table Context Menu Styles */
	.table-context-menu {
		position: absolute;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(229, 231, 235, 0.5);
		border-radius: 8px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		padding: 4px;
		min-width: 180px;
		z-index: 3000;
	}

	.context-menu-btn {
		display: block;
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: none;
		border-radius: 4px;
		text-align: left;
		font-size: 0.875rem;
		color: #374151;
		cursor: pointer;
		transition: all 0.15s;
	}

	.context-menu-btn:hover {
		background: #f3f4f6;
	}

	.context-menu-btn:active {
		background: #e5e7eb;
	}

	.context-menu-divider {
		height: 1px;
		background: #e5e7eb;
		margin: 4px 0;
	}

	/* Table cell hover effect */
	:global(.rich-editor table td),
	:global(.rich-editor table th) {
		transition: background-color 0.15s;
		cursor: context-menu;
	}

	:global(.rich-editor table td:hover),
	:global(.rich-editor table th:hover) {
		background-color: rgba(59, 130, 246, 0.1);
	}
</style>

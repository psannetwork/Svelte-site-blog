<script lang="ts">
	import { onMount } from 'svelte';
	import SlashMenu from './SlashMenu.svelte';
	import ColorPicker from './ColorPicker.svelte';
	import { replaceTextWithBlock, setCursorToEnd, getSelectionRange, formatBlock, toggleList, toggleBlockquote, insertHorizontalRule, insertTableElement, alignText, createLink, removeLink, applyInlineStyleToSelection, getSelectionBounds, isSelectionCollapsed, insertHtmlAtCursor, addTableRow, addTableColumn, deleteTableRow, deleteTableColumn, mergeTableCellsHorizontally, mergeTableCellsVertically, splitTableCell, hasInlineStyleInSelection, hasAllInlineStyleInSelection } from './utils/selection';
	import { htmlToMarkdown, markdownToHtml } from './utils/converter';
	import { sanitizeHtml } from '$lib/utils/htmlSanitizer';
	import {
		Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon,
		Undo, Redo, Move, List, ListOrdered, Quote, Code, Minus, Table as TableIcon,
		AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Palette, Trash2,
		Heading1, Heading2, Heading3, Video, Mic, ChevronDown, MoreHorizontal, Maximize, ListTodo
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
	let videoInputRef: HTMLInputElement | undefined = $state();
	let menuState = $state({ show: false, x: 0, y: 0 });
	let innerHTML = $state('');

	// AbortController for event listener cleanup
	let abortController: AbortController | null = null;

	// History State for Undo/Redo
	let history = $state<string[]>([]);
	let historyIndex = $state(-1);
	const MAX_HISTORY = 30;
	let historyTimeout: ReturnType<typeof setTimeout>;

	// Input Debounce for Performance
	const INPUT_DEBOUNCE_DELAY = 300;
	let inputDebounceTimeout: ReturnType<typeof setTimeout>;
	let pendingInputHtml = '';

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

	let resizeDimension = $state<{width: number, height: number} | null>(null);

	let maintainAspectRatio = $state(false);
	let initialAspectRatio = 1;
	let shiftKeyPressed = $state(false);

	// Drag and Drop State
	let draggedElement = $state<HTMLElement | null>(null);
	let dragPlaceholder = $state<HTMLElement | null>(null);

	// Color Picker State
	let showColorPicker = $state(false);
	let colorPickerPosition = $state({ x: 0, y: 0 });
	let currentColor = $state<string | null>(null);

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

	// Inline Style State
	let isBold = $state(false);
	let isItalic = $state(false);
	let isUnderline = $state(false);
	let isStrikethrough = $state(false);

	// Image Alignment State
	let imageAlignment = $state<'left' | 'center' | 'right'>('center');

	// Auto Save State
	let autoSaveInterval: ReturnType<typeof setInterval> | null = null;
	const AUTO_SAVE_INTERVAL = 30000;
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

	// Dropdown State
	let activeDropdown = $state<string | null>(null);

	function toggleDropdown(name: string, event?: MouseEvent) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		activeDropdown = activeDropdown === name ? null : name;
		if (activeDropdown) showColorPicker = false;
	}

	function closeDropdowns() {
		activeDropdown = null;
	}

	const colorNames: Record<string, string> = {
		'#000000': '黒', '#434343': '濃灰', '#666666': '灰', '#999999': '銀', '#b7b7b7': '薄銀',
		'#cccccc': '淡灰', '#d9d9d9': '白灰', '#efefef': '煙白', '#f3f3f3': '白煙', '#ffffff': '白',
		'#980000': '赤茶', '#ff0000': '赤', '#ff9900': '橙', '#ffff00': '黄', '#00ff00': '緑',
		'#00ffff': '水', '#4a86e8': '青', '#0000ff': '紺', '#9900ff': '紫', '#ff00ff': '桃'
	};

	const colorPalette = [
		'#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
		'#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'
	];

	function updateOverlayPos() {
		if (!selectedElement || !editorRef) {
			overlayPos = null;
			return;
		}
		const editorWrapper = editorRef.parentElement;
		if (!editorWrapper) return;
		const wrapperRect = editorWrapper.getBoundingClientRect();
		const elementRect = selectedElement.getBoundingClientRect();
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
			const backup = loadFromLocalStorage();
			if (backup && backup.html) {
				const now = Date.now();
				const hoursSinceBackup = (now - backup.timestamp) / (1000 * 60 * 60);
				if (hoursSinceBackup < 24) {
					editorRef.innerHTML = sanitizeHtml(backup.html);
					innerHTML = editorRef.innerHTML;
					if (backup.history && backup.history.length > 0) {
						history = backup.history;
						historyIndex = backup.historyIndex;
					}
					assignElementIds();
					return;
				}
			}
			editorRef.innerHTML = sanitizeHtml(value) || '<p><br></p>';
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			assignElementIds();
		}
	});

	function assignElementIds() {
		if (!editorRef) return;
		const resizableTags = ['IMG', 'PRE', 'BLOCKQUOTE', 'IFRAME', 'VIDEO', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'HR'];
		editorRef.querySelectorAll(resizableTags.join(', ')).forEach((el, index) => {
			if (!el.getAttribute('data-element-id')) {
				el.setAttribute('data-element-id', `el-${Date.now()}-${index}`);
			}
		});
	}

	function saveToHistory(html: string) {
		if (html.length > MAX_HISTORY_ENTRY_SIZE) return;
		if (history[historyIndex] === html) return;
		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push(html);
		if (newHistory.length > MAX_HISTORY) newHistory.shift();
		else historyIndex++;
		history = newHistory;
	}

	function saveToLocalStorage(html: string) {
		if (!autoSaveId) return;
		try {
			const backupKey = `${LOCAL_STORAGE_KEY}_${autoSaveId}`;
			localStorage.setItem(backupKey, JSON.stringify({
				html, timestamp: Date.now(),
				history: history.slice(-5), historyIndex
			}));
		} catch (err) {}
	}

	function loadFromLocalStorage() {
		if (!autoSaveId) return null;
		try {
			const data = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${autoSaveId}`);
			return data ? JSON.parse(data) : null;
		} catch (err) { return null; }
	}

	function undo() {
		if (historyIndex > 0) {
			historyIndex--;
			applyHistory(history[historyIndex]);
		}
	}

	function redo() {
		if (historyIndex < history.length - 1) {
			historyIndex++;
			applyHistory(history[historyIndex]);
		}
	}

	function applyHistory(html: string) {
		if (editorRef && html !== undefined) {
			editorRef.innerHTML = sanitizeHtml(html);
			innerHTML = editorRef.innerHTML;
			if (onchange) onchange(innerHTML);
			assignElementIds();
			requestAnimationFrame(updateOverlayPos);
		}
	}

	function handleGlobalClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const resizableTags = ['IMG', 'PRE', 'BLOCKQUOTE', 'IFRAME', 'VIDEO', 'TABLE', 'HR'];
		const draggableTags = ['IMG', 'PRE', 'BLOCKQUOTE', 'IFRAME', 'VIDEO', 'TABLE', 'HR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI'];

		// 移動ボタンをクリックした場合は選択を維持
		if (target.closest('.overlay-control.move-up') || target.closest('.overlay-control.move-down')) {
			return;
		}

		// 削除ボタンをクリックした場合は何もしない
		if (target.closest('.overlay-control.delete')) {
			return;
		}

		// 配置ボタンをクリックした場合は何もしない
		if (target.closest('.overlay-control.align')) {
			return;
		}

		if (resizableTags.includes(target.tagName) && editorRef?.contains(target)) {
			selectedElement = target;
			selectedElement.setAttribute('draggable', 'true');
			// 画像の場合は配置状態を取得
			if (target.tagName === 'IMG') {
				const parent = target.parentElement;
				const alignClass = parent?.classList.contains('image-align-left') ? 'left' :
					parent?.classList.contains('image-align-right') ? 'right' : 'center';
				imageAlignment = alignClass;
			}
			updateOverlayPos();
		} else if (draggableTags.includes(target.tagName) && editorRef?.contains(target)) {
			// リサイズはできないがドラッグ可能な要素（テキスト系）
			selectedElement = target;
			selectedElement.setAttribute('draggable', 'true');
			updateOverlayPos(); // 青枠は表示
		} else if (
			!target.closest('.resize-handle') &&
			!target.closest('.overlay-controls') &&
			!target.closest('.toolbar') &&
			!target.closest('.overlay-control') &&
			!target.closest('.slash-menu') &&
			!target.closest('.dropdown-menu') &&
			!target.closest('.color-picker') &&
			!target.closest('.inline-toolbar') &&
			!target.closest('.table-menu')
		) {
			if (selectedElement) selectedElement.removeAttribute('draggable');
			selectedElement = null;
			overlayPos = null;
			showColorPicker = false;
			activeDropdown = null;
		}
	}

	function handleGlobalContextMenu(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'TD' || target.tagName === 'TH') {
			const table = target.closest('table');
			if (table && editorRef?.contains(table)) handleTableContextMenu(e, target as HTMLTableCellElement);
		}
	}

	function handleDragKeydown(e: KeyboardEvent) {
		if (!selectedElement) return;
		if (e.key === 'ArrowUp' && e.altKey) {
			e.preventDefault();
			const prev = selectedElement.previousElementSibling;
			if (prev) { selectedElement.parentElement?.insertBefore(selectedElement, prev); saveAndNotify(); }
		} else if (e.key === 'ArrowDown' && e.altKey) {
			e.preventDefault();
			const next = selectedElement.nextElementSibling;
			if (next) { selectedElement.parentElement?.insertBefore(selectedElement, next.nextElementSibling); saveAndNotify(); }
		}
	}

	function saveAndNotify() {
		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
			if (autoSaveId) saveToLocalStorage(innerHTML);
		}
		updateOverlayPos();
		// 選択状態を維持
		if (selectedElement) {
			requestAnimationFrame(() => {
				updateOverlayPos();
			});
		}
	}

	function startResize(e: MouseEvent, handle?: any) {
		if (!selectedElement) return;
		// テキスト要素はリサイズできない
		const nonResizableTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'UL', 'OL'];
		if (nonResizableTags.includes(selectedElement.tagName)) return;
		
		resizing = true;
		resizeHandle = handle || 'se';
		startX = e.clientX; startY = e.clientY;
		const style = window.getComputedStyle(selectedElement);
		startWidth = parseFloat(style.width); startHeight = parseFloat(style.height);
		if (['IMG', 'VIDEO'].includes(selectedElement.tagName)) initialAspectRatio = startWidth / startHeight;
		e.preventDefault();
		window.addEventListener('mousemove', handleResize);
		window.addEventListener('mouseup', stopResize, { once: true });
	}

	function handleResize(e: MouseEvent) {
		if (!resizing || !selectedElement) return;
		const deltaX = e.clientX - startX; const deltaY = e.clientY - startY;
		let newWidth = startWidth + (resizeHandle?.includes('e') ? deltaX : resizeHandle?.includes('w') ? -deltaX : 0);
		let newHeight = startHeight + (resizeHandle?.includes('s') ? deltaY : resizeHandle?.includes('n') ? -deltaY : 0);
		if ((e.shiftKey || maintainAspectRatio) && ['IMG', 'VIDEO'].includes(selectedElement.tagName)) {
			if (resizeHandle?.includes('e') || resizeHandle?.includes('w')) newHeight = newWidth / initialAspectRatio;
			else newWidth = newHeight * initialAspectRatio;
		}
		selectedElement.style.width = `${Math.max(50, newWidth)}px`;
		selectedElement.style.height = `${Math.max(20, newHeight)}px`;
		resizeDimension = { width: Math.round(newWidth), height: Math.round(newHeight) };
		updateOverlayPos();
	}

	function stopResize() {
		resizing = false; resizeHandle = null; resizeDimension = null;
		window.removeEventListener('mousemove', handleResize);
		saveAndNotify();
	}

	function deleteSelectedElement() {
		if (!selectedElement) return;
		selectedElement.remove(); selectedElement = null; overlayPos = null;
		saveAndNotify();
	}

	function setImageAlignment(align: 'left' | 'center' | 'right') {
		if (!selectedElement || selectedElement.tagName !== 'IMG') return;
		imageAlignment = align;
		// 親の figure 要素を取得または作成
		let figure = selectedElement.parentElement;
		if (!figure || figure.tagName !== 'FIGURE') {
			figure = document.createElement('figure');
			figure.className = 'image-wrapper';
			selectedElement.parentElement?.insertBefore(figure, selectedElement);
			figure.appendChild(selectedElement);
		}
		// クラスをリセットして新しい配置クラスを追加
		figure.classList.remove('image-align-left', 'image-align-center', 'image-align-right');
		figure.classList.add(`image-align-${align}`);
		
		// インラインスタイルもクリア（CSS クラスに任せる）
		figure.style.clear = '';
		figure.style.float = '';
		figure.style.display = '';
		figure.style.margin = '';
		figure.style.textAlign = '';
		
		// 画像自体のインラインスタイルもリセット（配置に影響するもの）
		selectedElement.style.display = '';
		selectedElement.style.margin = '';
		selectedElement.style.float = '';
		selectedElement.style.maxWidth = '';
		selectedElement.style.textAlign = '';
		
		// キャプションがない場合は追加
		if (!figure.querySelector('figcaption')) {
			const caption = document.createElement('figcaption');
			caption.contentEditable = 'true';
			caption.textContent = 'キャプション (オプション)';
			caption.style.cssText = 'text-align: center; font-size: 0.875rem; color: #94a3b8; margin-top: 0.5rem;';
			figure.appendChild(caption);
		}
		saveAndNotify();
	}

	function moveElementUp() {
		if (!selectedElement) return;
		const elementId = selectedElement.getAttribute('data-element-id');
		// 画像が figure でラップされている場合は figure を移動
		const elementToMove = selectedElement.tagName === 'IMG' && selectedElement.parentElement?.tagName === 'FIGURE'
			? selectedElement.parentElement
			: selectedElement;
		const prev = elementToMove.previousElementSibling;
		if (prev) {
			elementToMove.parentElement?.insertBefore(elementToMove, prev);
			// 選択状態を維持するために innerHTML 更新をスキップ
			if (autoSaveId) saveToLocalStorage(editorRef!.innerHTML);
			requestAnimationFrame(() => {
				if (elementId) {
					selectedElement = editorRef?.querySelector(`[data-element-id="${elementId}"]`) || null;
				}
				updateOverlayPos();
				selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			});
		}
	}

	function moveElementDown() {
		if (!selectedElement) return;
		const elementId = selectedElement.getAttribute('data-element-id');
		// 画像が figure でラップされている場合は figure を移動
		const elementToMove = selectedElement.tagName === 'IMG' && selectedElement.parentElement?.tagName === 'FIGURE'
			? selectedElement.parentElement
			: selectedElement;
		const next = elementToMove.nextElementSibling;
		if (next) {
			elementToMove.parentElement?.insertBefore(elementToMove, next.nextElementSibling);
			// 選択状態を維持するために innerHTML 更新をスキップ
			if (autoSaveId) saveToLocalStorage(editorRef!.innerHTML);
			requestAnimationFrame(() => {
				if (elementId) {
					selectedElement = editorRef?.querySelector(`[data-element-id="${elementId}"]`) || null;
				}
				updateOverlayPos();
				selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			});
		}
	}

	$effect(() => {
		if (!editorRef || !value || document.activeElement === editorRef) return;
		const sanitized = sanitizeHtml(value);
		if (sanitized !== editorRef.innerHTML) {
			editorRef.innerHTML = sanitized; innerHTML = sanitized; saveToHistory(sanitized);
		}
	});

	$effect(() => {
		const controller = new AbortController();
		window.addEventListener('click', handleGlobalClick, { signal: controller.signal });
		window.addEventListener('scroll', updateOverlayPos, { capture: true, passive: true, signal: controller.signal });
		window.addEventListener('resize', updateOverlayPos, { signal: controller.signal });
		document.addEventListener('selectionchange', handleSelectionChange, { signal: controller.signal });
		if (autoSaveId) autoSaveInterval = setInterval(() => editorRef && saveToLocalStorage(editorRef.innerHTML), AUTO_SAVE_INTERVAL);
		return () => { controller.abort(); if (autoSaveInterval) clearInterval(autoSaveInterval); };
	});

	async function handleImageUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		isUploading = true;
		const formData = new FormData(); formData.append('image', file);
		try {
			const res = await fetch('/api/upload?type=misc', { method: 'POST', body: formData });
			const result = await res.json();
			if (result.success) insertImageAtCursor(result.file.url);
		} catch (err) { alert('アップロード失敗'); } finally { isUploading = false; }
	}

	async function handleVideoUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		isUploading = true;
		const formData = new FormData(); formData.append('video', file);
		try {
			const res = await fetch('/api/upload?type=misc', { method: 'POST', body: formData });
			const result = await res.json();
			if (result.success) insertVideoAtCursor(result.file.url);
		} catch (err) { alert('アップロード失敗'); } finally { isUploading = false; }
	}

	function insertImageAtCursor(src: string) {
		if (!editorRef) return; editorRef.focus();
		const img = document.createElement('img'); img.src = src; img.style.maxWidth = '100%';
		window.getSelection()?.getRangeAt(0).insertNode(img);
		saveAndNotify();
	}

	function insertVideoAtCursor(src: string) {
		if (!editorRef) return; editorRef.focus();
		const video = document.createElement('video');
		video.src = src;
		video.style.maxWidth = '100%';
		video.controls = true;
		video.setAttribute('data-element-id', `el-${Date.now()}`);
		window.getSelection()?.getRangeAt(0).insertNode(video);
		saveAndNotify();
	}

	function format(command: string, val: string = '') {
		if (!editorRef) return; editorRef.focus();
		let res = { applied: false, removed: false };
		if (command === 'bold') res = applyInlineStyleToSelection('b', {}, true);
		else if (command === 'italic') res = applyInlineStyleToSelection('i', {}, true);
		else if (command === 'underline') res = applyInlineStyleToSelection('u', {}, true);
		else if (command === 'strikeThrough') res = applyInlineStyleToSelection('s', {}, true);
		else if (command.startsWith('justify')) {
			const alignType = command.replace('justify', '').toLowerCase() as 'left' | 'center' | 'right' | 'justify';
			alignText(alignType);
			res.applied = true;
		}
		if (res.applied || res.removed) saveAndNotify();
	}

	function setFontSize(size: string) {
		if (applyInlineStyleToSelection('span', { fontSize: size + 'px' }).applied) saveAndNotify();
		closeDropdowns();
	}

	function setTextColor(color: string, mode: 'auto' | 'fixed' = 'auto') {
		const sel = window.getSelection();
		if (!sel?.rangeCount) {
			showColorPicker = false;
			return;
		}

		const range = sel.getRangeAt(0);

		// 選択範囲がない場合は execCommand でフォアグラウンドカラーを設定（入力用）
		if (sel.isCollapsed) {
			document.execCommand('styleWithCSS', false, 'true' as any);
			document.execCommand('foreColor', false, color);
			currentColor = color;
			
			// 直後に span を見つけて data-color 属性を追加
			setTimeout(() => {
				const span = range.startContainer.parentElement?.closest('span[style*="color"]');
				if (span && !span.hasAttribute('data-color')) {
					span.setAttribute('data-color', color);
					span.setAttribute('data-color-mode', mode);
				}
			}, 10);
			
			saveAndNotify();
			showColorPicker = false;
			return;
		}

		// 選択範囲がある場合は span でラップ
		// 既存の color span をすべて削除（トグル動作を防止）
		const commonAncestor = range.commonAncestorContainer as HTMLElement;
		const existingSpans = commonAncestor.parentElement?.querySelectorAll('span[data-color], span[style*="color"]') || [];
		existingSpans.forEach(span => {
			const textNode = document.createTextNode(span.textContent || '');
			span.replaceWith(textNode);
		});

		// DocumentFragment を使用して選択範囲を span でラップ
		const fragment = range.extractContents();
		const span = document.createElement('span');
		span.setAttribute('data-color', color);
		span.setAttribute('data-color-mode', mode);
		span.style.color = color;
		span.appendChild(fragment);
		range.insertNode(span);

		// カーソルを span の後に移動
		range.setStartAfter(span);
		range.setEndAfter(span);
		sel.removeAllRanges();
		sel.addRange(range);

		currentColor = color;
		saveAndNotify();
		showColorPicker = false;
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLDivElement;
		clearTimeout(inputDebounceTimeout);
		inputDebounceTimeout = setTimeout(() => {
			innerHTML = target.innerHTML;
			if (onchange) onchange(innerHTML);
			saveToHistory(innerHTML);
		}, INPUT_DEBOUNCE_DELAY);

		const sel = window.getSelection();
		if (!sel || !sel.rangeCount) return;
		const range = sel.getRangeAt(0);
		const text = range.startContainer.textContent || '';
		if (text[range.startOffset - 1] === '/') {
			const rect = range.getBoundingClientRect();
			const outerRect = editorRef?.closest('.editor-outer')?.getBoundingClientRect();
			if (outerRect) {
				const x = Math.max(0, Math.min(rect.left - outerRect.left, outerRect.width - 240));
				const y = rect.bottom - outerRect.top + 4;
				menuState = { show: true, x, y };
			}
		} else menuState.show = false;

		// 入力された span に data-color 属性を付与（execCommand 用）
		if (currentColor) {
			const node = range.startContainer.parentElement;
			const span = node?.closest('span[style*="color"]');
			if (span && !span.hasAttribute('data-color')) {
				span.setAttribute('data-color', currentColor);
				span.setAttribute('data-color-mode', 'auto');
			}
		}
	}

	function handleEnterKey(e: KeyboardEvent) {
		if (e.shiftKey) return;
		if (menuState.show) return;
		setTimeout(() => saveAndNotify(), 0);
	}

	function executeCommand(id: string) {
		if (!editorRef) return;

		// '/' を削除
		const sel = window.getSelection();
		if (sel?.rangeCount) {
			const range = sel.getRangeAt(0);
			const node = range.startContainer;
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent || '';
				const slashIndex = text.lastIndexOf('/');
				if (slashIndex !== -1) {
					// '/' の直前のテキストノードを取得
					const beforeText = text.slice(0, slashIndex);
					const afterText = text.slice(slashIndex + 1);

					// テキストノードを分割
					node.textContent = beforeText;

					if (afterText) {
						const afterNode = document.createTextNode(afterText);
						node.parentNode?.insertBefore(afterNode, node.nextSibling);
					}

					// カーソル位置を調整
					range.setStart(node, beforeText.length);
					range.setEnd(node, beforeText.length);
					sel.removeAllRanges();
					sel.addRange(range);
				}
			}
		}

		// エディターにフォーカス
		editorRef.focus();

		// 選択範囲を再取得
		const currentSel = window.getSelection();
		if (!currentSel?.rangeCount) return;

		// テキスト系
		if (id.startsWith('h')) {
			formatBlock(id.toUpperCase());
		} else if (id === 'bullet') {
			toggleList('UL');
		} else if (id === 'number') {
			toggleList('OL');
		} else if (id === 'todo') {
			insertHtmlAtCursor('<div class="task-list-item"><input type="checkbox" contenteditable="false" /> <span>タスク</span></div>');
		} else if (id === 'quote') {
			toggleBlockquote();
		} else if (id === 'hr') {
			insertHorizontalRule();
		} else if (id === 'image') {
			fileInputRef?.click();
		} else if (id === 'code') {
			formatBlock('PRE');
		} else if (id === 'table') {
			insertTableElement(3, 3);
		}
		// コールアウト
		else if (id === 'callout-info') {
			insertHtmlAtCursor('<div class="callout callout-info"><strong>情報</strong><p>ここに情報を入力してください。</p></div>');
		} else if (id === 'callout-warning') {
			insertHtmlAtCursor('<div class="callout callout-warning"><strong>警告</strong><p>ここに警告内容を入力してください。</p></div>');
		} else if (id === 'callout-success') {
			insertHtmlAtCursor('<div class="callout callout-success"><strong>成功</strong><p>ここに成功内容を入力してください。</p></div>');
		}
		// メディア埋め込み
		else if (id === 'video') {
			openMediaDialog('video', new MouseEvent('click') as any);
		} else if (id === 'youtube') {
			insertEmbedPrompt('youtube');
		} else if (id === 'twitter') {
			insertEmbedPrompt('twitter');
		} else if (id === 'instagram') {
			insertEmbedPrompt('instagram');
		} else if (id === 'github') {
			insertEmbedPrompt('github');
		} else if (id === 'twitch') {
			insertEmbedPrompt('twitch');
		}
		// レイアウト
		else if (id === 'button') {
			insertHtmlAtCursor('<a href="#" class="editor-button">ボタン</a>');
		} else if (id === 'accordion') {
			insertHtmlAtCursor('<details class="accordion"><summary>タイトル</summary><div class="accordion-content"><p>内容を入力してください。</p></div></details>');
		} else if (id === 'progress') {
			insertHtmlAtCursor('<div class="progress-bar"><div class="progress-fill" style="width: 50%;"></div></div><p class="progress-label">50%</p>');
		} else if (id === 'toc') {
			insertHtmlAtCursor('<div class="table-of-contents"><h3>目次</h3><ul><li><a href="#heading">見出しへのリンク</a></li></ul></div>');
		} else if (id === 'tabs') {
			insertHtmlAtCursor('<div class="tabs-container"><div class="tab-buttons"><button class="tab-btn active">タブ 1</button><button class="tab-btn">タブ 2</button></div><div class="tab-content active"><p>タブ 1 の内容</p></div><div class="tab-content"><p>タブ 2 の内容</p></div></div>');
		} else if (id === 'timeline') {
			insertHtmlAtCursor('<div class="timeline"><div class="timeline-item"><div class="timeline-marker">1</div><div class="timeline-content"><h4>イベント 1</h4><p>内容を入力</p></div></div></div>');
		} else if (id === 'profile') {
			insertHtmlAtCursor('<div class="profile-card"><div class="profile-avatar"></div><div class="profile-info"><h3>名前</h3><p>自己紹介</p></div></div>');
		} else if (id === 'ranking') {
			insertHtmlAtCursor('<div class="ranking-box"><div class="rank-item rank-1"><span class="rank-num">1</span><span class="rank-content">1 位の内容</span></div></div>');
		} else if (id === 'footnote') {
			insertHtmlAtCursor('<sup class="footnote-ref"><a href="#fn-1">[1]</a></sup>');
		}
		
		menuState.show = false;
		saveAndNotify();
	}

	function insertEmbedPrompt(type: string) {
		const url = prompt(`${type === 'youtube' ? 'YouTube' : type === 'twitter' ? 'X (Twitter)' : type === 'instagram' ? 'Instagram' : type === 'github' ? 'GitHub' : type === 'twitch' ? 'Twitch' : type === 'spotify' ? 'Spotify' : type === 'soundcloud' ? 'SoundCloud' : 'Google Maps'} の URL または Embed ID を入力してください:`);
		if (!url) return;
		
		let embedHtml = '';
		
		if (type === 'youtube') {
			const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url;
			embedHtml = `<div class="video-embed youtube"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
		} else if (type === 'twitter') {
			embedHtml = `<div class="twitter-embed" data-tweet-url="${url}"><blockquote class="twitter-tweet"><a href="${url}">Tweet</a></blockquote></div>`;
		} else if (type === 'instagram') {
			embedHtml = `<div class="instagram-embed"><blockquote class="instagram-media" data-instgrm-permalink="${url}"></blockquote></div>`;
		} else if (type === 'github') {
			const gistId = url.split('/').pop();
			embedHtml = `<div class="github-gist" data-gist-id="${gistId}"></div>`;
		} else if (type === 'twitch') {
			const channelId = url.split('/').pop();
			embedHtml = `<div class="twitch-embed"><iframe src="https://player.twitch.tv/?channel=${channelId}&parent=localhost" frameborder="0" allowfullscreen></iframe></div>`;
		} else if (type === 'spotify') {
			embedHtml = `<div class="spotify-embed"><iframe src="https://open.spotify.com/embed/track/${url.split('/').pop()}" frameborder="0" allowfullscreen></iframe></div>`;
		} else if (type === 'soundcloud') {
			embedHtml = `<div class="soundcloud-embed"><iframe src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}" frameborder="0" allowfullscreen></iframe></div>`;
		} else if (type === 'map') {
			const query = prompt('住所または場所名を入力してください:');
			if (query) {
				embedHtml = `<div class="google-map-embed"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.0!2d${encodeURIComponent(query)}!3d35.6762!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDQwJzM0LjMiIEUgMTM5wrA0NScwMC4wIkU" frameborder="0" allowfullscreen></iframe></div>`;
			}
		}
		
		insertHtmlAtCursor(embedHtml);
	}

	function openLinkDialog() {
		const sel = window.getSelection();
		if (!sel?.rangeCount) return;
		const node = sel.getRangeAt(0).commonAncestorContainer as HTMLElement;
		editingLink = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest('a') as HTMLAnchorElement;
		linkUrl = editingLink?.href || '';
		linkTarget = editingLink?.target || '_blank';
		showLinkDialog = true;
	}

	function insertLink() {
		if (!linkUrl) return;
		if (editingLink) { editingLink.href = linkUrl; editingLink.target = linkTarget; }
		else createLink(linkUrl, linkTarget);
		saveAndNotify(); showLinkDialog = false;
	}

	function unlink() { removeLink(); saveAndNotify(); showLinkDialog = false; }

	function handleTableContextMenu(e: MouseEvent, cell: HTMLTableCellElement) {
		e.preventDefault();
		const outerRect = editorRef?.closest('.editor-outer')?.getBoundingClientRect();
		if (outerRect) tableContextMenu = { show: true, x: e.clientX - outerRect.left, y: e.clientY - outerRect.top, cell, table: cell.closest('table') };
	}

	function closeTableContextMenu() { tableContextMenu.show = false; }

	function handleInlineFormat(cmd: string) { format(cmd); updateInlineToolbar(); }

	function handleSelectionChange() {
		const sel = window.getSelection();
		if (!sel?.rangeCount || !editorRef?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
			showInlineToolbar = false; return;
		}
		isBold = hasInlineStyleInSelection('b') || hasInlineStyleInSelection('strong');
		isItalic = hasInlineStyleInSelection('i') || hasInlineStyleInSelection('em');
		isUnderline = hasInlineStyleInSelection('u');
		isStrikethrough = hasInlineStyleInSelection('s');
		if (sel.isCollapsed) showInlineToolbar = false;
		else updateInlineToolbar();
	}

	function updateInlineToolbar() {
		const bounds = getSelectionBounds();
		const wrapperRect = editorRef?.closest('.editor-outer')?.getBoundingClientRect();
		if (bounds && wrapperRect) {
			const toolbarWidth = 140;
			const toolbarHeight = 40;
			let x = bounds.left - wrapperRect.left + bounds.width / 2;
			let y = bounds.top - wrapperRect.top - toolbarHeight - 8;
			
			if (x < toolbarWidth / 2) x = toolbarWidth / 2;
			if (x > wrapperRect.width - toolbarWidth / 2) x = wrapperRect.width - toolbarWidth / 2;
			if (y < 0) y = bounds.bottom - wrapperRect.top + 8;
			
			inlineToolbarPos = { x, y };
			showInlineToolbar = true;
		}
	}

	function openMediaDialog(type: 'video' | 'audio', event: MouseEvent) {
		mediaType = type;
		mediaUrl = '';
		showMediaDialog = true;
		const button = (event.target as HTMLElement).closest('.toolbar-btn') as HTMLElement;
		if (button) {
			const rect = button.getBoundingClientRect();
			const outerRect = editorRef?.closest('.editor-outer')?.getBoundingClientRect();
			if (outerRect) mediaPosition = { x: rect.left - outerRect.left, y: rect.bottom - outerRect.top + 4 };
		}
	}

	function closeMediaDialog() { showMediaDialog = false; }
	function insertMedia() {
		if (!mediaUrl) return;
		insertHtmlAtCursor(mediaType === 'video' ? `<video controls src="${mediaUrl}" style="max-width: 100%;"></video>` : `<audio controls src="${mediaUrl}"></audio>`);
		saveAndNotify(); closeMediaDialog();
	}

	function openMarkdownExport() {
		markdownContent = htmlToMarkdown(editorRef?.innerHTML || '');
		showMarkdownDialog = true;
	}
	function closeMarkdownExport() { showMarkdownDialog = false; }
	function copyMarkdown() {
		navigator.clipboard.writeText(markdownContent).then(() => alert('コピーしました'));
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (selectedElement && ['Backspace', 'Delete'].includes(e.key)) { e.preventDefault(); deleteSelectedElement(); return; }
		if (e.key === 'Enter') { handleEnterKey(e); return; }
		if (e.key === 'Escape') { closeDropdowns(); menuState.show = false; showColorPicker = false; selectedElement = null; return; }
		if ((e.ctrlKey || e.metaKey)) {
			if (e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
			else if (e.key === 'y') { e.preventDefault(); redo(); }
			else if (e.key === 'b') { e.preventDefault(); format('bold'); }
			else if (e.key === 'i') { e.preventDefault(); format('italic'); }
			else if (e.key === 'u') { e.preventDefault(); format('underline'); }
			else if (e.key === 'k') { e.preventDefault(); openLinkDialog(); }
		}
	}
</script>

<div class="editor-outer">
	<div class="editor-container">
		<div class="toolbar" role="toolbar">
			<!-- 履歴管理 -->
			<div class="toolbar-group">
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); undo(); }} disabled={historyIndex <= 0} title="元に戻す (Ctrl+Z)">
					<Undo size={18} />
				</button>
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); redo(); }} disabled={historyIndex >= history.length - 1} title="やり直し (Ctrl+Y)">
					<Redo size={18} />
				</button>
			</div>

			<div class="v-divider"></div>

			<!-- テキスト装飾 -->
			<div class="toolbar-group">
				<button type="button" class="toolbar-btn" class:active={isBold} onmousedown={(e) => { e.preventDefault(); format('bold'); }} title="太字 (Ctrl+B)">
					<Bold size={18} />
				</button>
				<button type="button" class="toolbar-btn" class:active={isItalic} onmousedown={(e) => { e.preventDefault(); format('italic'); }} title="イタリック (Ctrl+I)">
					<Italic size={18} />
				</button>
				<button type="button" class="toolbar-btn" class:active={isUnderline} onmousedown={(e) => { e.preventDefault(); format('underline'); }} title="下線 (Ctrl+U)">
					<Underline size={18} />
				</button>
				<button type="button" class="toolbar-btn" class:active={isStrikethrough} onmousedown={() => format('strikeThrough')} title="取り消し線">
					<Strikethrough size={18} />
				</button>
				<button type="button" class="toolbar-btn" onclick={(e) => {
					e.preventDefault();
					showColorPicker = !showColorPicker;
					activeDropdown = null;
					if (showColorPicker && editorRef) {
						const button = (e.target as HTMLElement).closest('.toolbar-btn') as HTMLElement;
						const rect = button.getBoundingClientRect();
						const outerRect = editorRef.closest('.editor-outer')?.getBoundingClientRect();
						if (outerRect) {
							colorPickerPosition = {
								x: Math.min(rect.left - outerRect.left, outerRect.width - 200),
								y: rect.bottom - outerRect.top + 4
							};
						}
					}
				}} title="文字色">
					<Palette size={18} />
				</button>
			</div>

			<div class="v-divider"></div>

			<!-- スタイル・フォント (ドロップダウン化) -->
			<div class="toolbar-group">
				<div class="dropdown-wrapper">
					<button type="button" class="toolbar-dropdown-btn" onmousedown={(e) => { e.preventDefault(); toggleDropdown('style', e); }}>
						<Type size={18} />
						<span>スタイル</span>
						<ChevronDown size={14} />
					</button>
					{#if activeDropdown === 'style'}
						<div class="dropdown-menu">
							<button onmousedown={(e) => { e.preventDefault(); executeCommand('h1'); closeDropdowns(); }}><h1>見出し 1</h1></button>
							<button onmousedown={(e) => { e.preventDefault(); executeCommand('h2'); closeDropdowns(); }}><h2>見出し 2</h2></button>
							<button onmousedown={(e) => { e.preventDefault(); executeCommand('h3'); closeDropdowns(); }}><h3>見出し 3</h3></button>
							<button onmousedown={(e) => { e.preventDefault(); formatBlock('P'); closeDropdowns(); }}><p>標準テキスト</p></button>
						</div>
					{/if}
				</div>

				<div class="dropdown-wrapper">
					<button type="button" class="toolbar-dropdown-btn" onmousedown={(e) => { e.preventDefault(); toggleDropdown('size', e); }}>
						<span>{currentFontSize}px</span>
						<ChevronDown size={14} />
					</button>
					{#if activeDropdown === 'size'}
						<div class="dropdown-menu scrollable">
							{#each [12, 14, 16, 18, 20, 24, 28, 32, 36, 48] as size}
								<button onmousedown={(e) => { e.preventDefault(); currentFontSize = size.toString(); setFontSize(size.toString()); }}>{size}px</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="v-divider"></div>

			<!-- 配置・リスト -->
			<div class="toolbar-group">
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); format('justifyLeft'); }} title="左揃え">
					<AlignLeft size={18} />
				</button>
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); toggleDropdown('align', e); }} title="配置">
					<MoreHorizontal size={18} />
				</button>
				{#if activeDropdown === 'align'}
					<div class="dropdown-menu compact">
						<button onmousedown={(e) => { e.preventDefault(); format('justifyCenter'); closeDropdowns(); }}><AlignCenter size={18} /></button>
						<button onmousedown={(e) => { e.preventDefault(); format('justifyRight'); closeDropdowns(); }}><AlignRight size={18} /></button>
						<button onmousedown={(e) => { e.preventDefault(); format('justifyFull'); closeDropdowns(); }}><AlignJustify size={18} /></button>
					</div>
				{/if}

				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); executeCommand('bullet'); }} title="箇条書き">
					<List size={18} />
				</button>
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); executeCommand('number'); }} title="番号付きリスト">
					<ListOrdered size={18} />
				</button>
			</div>

			<div class="v-divider"></div>

			<!-- 挿入系 -->
			<div class="toolbar-group">
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); openLinkDialog(); }} title="リンク (Ctrl+K)">
					<LinkIcon size={18} />
				</button>
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); fileInputRef?.click(); }} title="画像">
					<ImageIcon size={18} />
				</button>
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); videoInputRef?.click(); }} title="動画をアップロード">
					<Video size={18} />
				</button>
				<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); toggleDropdown('insert', e); }} title="さらに挿入">
					<MoreHorizontal size={18} />
				</button>
				{#if activeDropdown === 'insert'}
					<div class="dropdown-menu">
						<button onmousedown={(e) => { e.preventDefault(); executeCommand('table'); closeDropdowns(); }}><TableIcon size={16} /> テーブル</button>
						<button onmousedown={(e) => { e.preventDefault(); executeCommand('quote'); closeDropdowns(); }}><Quote size={16} /> 引用</button>
						<button onmousedown={(e) => { e.preventDefault(); executeCommand('code'); closeDropdowns(); }}><Code size={16} /> コードブロック</button>
						<button onmousedown={(e) => { e.preventDefault(); executeCommand('hr'); closeDropdowns(); }}><Minus size={16} /> 区切り線</button>
						<div class="v-divider" style="width: 100%; height: 1px; margin: 4px 0;"></div>
						<button onmousedown={(e) => { e.preventDefault(); openMediaDialog('video', e); closeDropdowns(); }}><Video size={16} /> 動画 (URL)</button>
						<button onmousedown={(e) => { e.preventDefault(); openMediaDialog('audio', e); closeDropdowns(); }}><Mic size={16} /> 音声 (URL)</button>
					</div>
				{/if}
			</div>

			<div class="v-divider"></div>

			<!-- エクスポート -->
			<button type="button" class="toolbar-btn" onmousedown={(e) => { e.preventDefault(); openMarkdownExport(); }} title="Markdown">
				<Maximize size={18} />
			</button>

			<input type="file" bind:this={fileInputRef} onchange={handleImageUpload} accept="image/*" style="display: none;" />
			<input type="file" bind:this={videoInputRef} onchange={handleVideoUpload} accept="video/*" style="display: none;" />
		</div>

		<div class="editor-wrapper">
			<div
				bind:this={editorRef}
				class="rich-editor"
				contenteditable="true"
				role="textbox"
				aria-multiline="true"
				tabindex="0"
				oninput={handleInput}
				onkeydown={handleKeyDown}
				oncontextmenu={handleGlobalContextMenu}
			></div>

			{#if !innerHTML || innerHTML === '<br>'}
				<div class="placeholder">{placeholder}</div>
			{/if}

			{#if selectedElement && overlayPos}
				<div class="image-resizer-overlay {['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'UL', 'OL'].includes(selectedElement.tagName) ? 'text-only' : ''}" style="left: {overlayPos.left}px; top: {overlayPos.top}px; width: {overlayPos.width}px; height: {overlayPos.height}px;">
					<div class="overlay-controls">
						{#if selectedElement.tagName === 'IMG'}
							<button class="overlay-control align {imageAlignment === 'left' ? 'active' : ''}" onclick={() => setImageAlignment('left')} title="左寄せ">
								<AlignLeft size={18} />
							</button>
							<button class="overlay-control align {imageAlignment === 'center' ? 'active' : ''}" onclick={() => setImageAlignment('center')} title="中央揃え">
								<AlignCenter size={18} />
							</button>
							<button class="overlay-control align {imageAlignment === 'right' ? 'active' : ''}" onclick={() => setImageAlignment('right')} title="右寄せ">
								<AlignRight size={18} />
							</button>
						{/if}
						<button class="overlay-control move-up" onclick={moveElementUp} title="上に移動"><ChevronDown size={18} style="transform: rotate(180deg);" /></button>
						<button class="overlay-control move-down" onclick={moveElementDown} title="下に移動"><ChevronDown size={18} /></button>
						<button class="overlay-control delete" onclick={deleteSelectedElement} title="削除"><Trash2 size={18} /></button>
					</div>
					{#if !['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'UL', 'OL'].includes(selectedElement.tagName)}
						<div class="resize-handle nw" role="button" tabindex="0" aria-label="左上隅をリサイズ" onmousedown={(e) => startResize(e, 'nw')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startResize(e, 'nw'); }}></div>
						<div class="resize-handle ne" role="button" tabindex="0" aria-label="右上隅をリサイズ" onmousedown={(e) => startResize(e, 'ne')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startResize(e, 'ne'); }}></div>
						<div class="resize-handle se" role="button" tabindex="0" aria-label="右下隅をリサイズ" onmousedown={(e) => startResize(e, 'se')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startResize(e, 'se'); }}></div>
						<div class="resize-handle sw" role="button" tabindex="0" aria-label="左下隅をリサイズ" onmousedown={(e) => startResize(e, 'sw')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startResize(e, 'sw'); }}></div>
					{/if}
				</div>
			{/if}

			{#if showColorPicker}
				<ColorPicker
					position={colorPickerPosition}
					onSelect={setTextColor}
					onClose={() => showColorPicker = false}
				/>
			{/if}
		</div>
	</div>

	{#if menuState.show}
		<SlashMenu x={menuState.x} y={menuState.y} onSelect={executeCommand} onClose={() => menuState.show = false} />
	{/if}

	{#if showInlineToolbar}
		<div class="inline-toolbar" style="left: {inlineToolbarPos.x}px; top: {inlineToolbarPos.y}px;">
			<button onclick={() => handleInlineFormat('bold')}><Bold size={16} /></button>
			<button onclick={() => handleInlineFormat('italic')}><Italic size={16} /></button>
			<button onclick={() => handleInlineFormat('underline')}><Underline size={16} /></button>
			<div class="v-divider" style="background: rgba(255,255,255,0.2); margin: 0 4px;"></div>
			<button onclick={openLinkDialog}><LinkIcon size={16} /></button>
		</div>
	{/if}

	<!-- モーダルダイアログ群 -->
	{#if showLinkDialog}
		<div class="modal-overlay" role="button" tabindex="0" onclick={() => showLinkDialog = false} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') showLinkDialog = false; }}>
			<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="link-dialog-title" tabindex="0" onclick={e => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
				<h3 id="link-dialog-title">リンクを挿入/編集</h3>
				<input type="url" bind:value={linkUrl} placeholder="https://..." class="modal-input" />
				<div class="modal-actions">
					{#if editingLink}
						<button class="btn-danger" onclick={unlink}>削除</button>
					{/if}
					<button onclick={() => showLinkDialog = false}>キャンセル</button>
					<button class="btn-primary" onclick={insertLink}>保存</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showMediaDialog}
		<div class="modal-overlay" role="button" tabindex="0" onclick={closeMediaDialog} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeMediaDialog(); }}>
			<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="media-dialog-title" tabindex="0" onclick={e => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
				<h3 id="media-dialog-title">{mediaType === 'video' ? '動画' : '音声'}を埋め込む</h3>
				<input type="url" bind:value={mediaUrl} placeholder="URL を入力..." class="modal-input" />
				<div class="modal-actions">
					<button onclick={closeMediaDialog}>キャンセル</button>
					<button class="btn-primary" onclick={insertMedia}>挿入</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showMarkdownDialog}
		<div class="modal-overlay" role="button" tabindex="0" onclick={closeMarkdownExport} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeMarkdownExport(); }}>
			<div class="modal-card large" role="dialog" aria-modal="true" aria-labelledby="markdown-dialog-title" tabindex="0" onclick={e => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
				<h3 id="markdown-dialog-title">Markdown エクスポート</h3>
				<textarea bind:value={markdownContent} readonly class="modal-textarea"></textarea>
				<div class="modal-actions">
					<button onclick={copyMarkdown}>コピー</button>
					<button class="btn-primary" onclick={closeMarkdownExport}>閉じる</button>
				</div>
			</div>
		</div>
	{/if}

	{#if tableContextMenu.show && tableContextMenu.cell}
		<div class="table-menu" role="menu" tabindex="0" style="left: {tableContextMenu.x}px; top: {tableContextMenu.y}px;" onclick={closeTableContextMenu} onkeydown={(e) => { if (e.key === 'Escape') closeTableContextMenu(); }}>
			<button onclick={() => {
				if (tableContextMenu.table && tableContextMenu.cell) {
					const row = tableContextMenu.cell.parentElement as HTMLTableRowElement;
					if (row) addTableRow(tableContextMenu.table, row.rowIndex);
					saveAndNotify();
				}
			}}>下に行を追加</button>
			<button onclick={() => {
				if (tableContextMenu.table && tableContextMenu.cell) {
					addTableColumn(tableContextMenu.table, tableContextMenu.cell.cellIndex);
					saveAndNotify();
				}
			}}>右に列を追加</button>
			<div class="v-divider" style="width: 100%; height: 1px; margin: 4px 0;"></div>
			<button class="text-danger" onclick={() => {
				if (tableContextMenu.table && tableContextMenu.cell) {
					const row = tableContextMenu.cell.parentElement as HTMLTableRowElement;
					if (row) deleteTableRow(tableContextMenu.table, row.rowIndex);
					saveAndNotify();
				}
			}}>行を削除</button>
			<button class="text-danger" onclick={() => {
				if (tableContextMenu.table && tableContextMenu.cell) {
					deleteTableColumn(tableContextMenu.table, tableContextMenu.cell.cellIndex);
					saveAndNotify();
				}
			}}>列を削除</button>
		</div>
	{/if}
</div>

<style>
	.editor-outer { position: relative; width: 100%; font-family: sans-serif; }
	.editor-container { border: 1px solid #e2e8f0; border-radius: 12px; background: white; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
	:global(.dark) .editor-container { background: #1e293b; border-color: #334155; }

	.toolbar {
		display: flex; align-items: center; gap: 4px; padding: 6px 12px;
		background: #f8fafc; border-bottom: 1px solid #e2e8f0;
		position: sticky; top: 0; z-index: 100; flex-wrap: wrap;
	}
	:global(.dark) .toolbar { background: #0f172a; border-color: #334155; }

	.toolbar-group { display: flex; align-items: center; gap: 2px; }

	.toolbar-btn, .toolbar-dropdown-btn {
		display: flex; align-items: center; justify-content: center;
		height: 32px; padding: 0 6px; border: none; border-radius: 6px;
		background: transparent; color: #475569; cursor: pointer; transition: all 0.2s;
	}
	:global(.dark) .toolbar-btn,
	:global(.dark) .toolbar-dropdown-btn { color: #e2e8f0; }

	.toolbar-btn:hover, .toolbar-dropdown-btn:hover { background: #e2e8f0; color: #1e293b; }
	:global(.dark) .toolbar-btn:hover,
	:global(.dark) .toolbar-dropdown-btn:hover { background: #334155; color: #f1f5f9; }
	
	.toolbar-btn.active { background: #3b82f6; color: white; }

	.toolbar-dropdown-btn { gap: 4px; font-size: 13px; font-weight: 500; }

	.v-divider { width: 1px; height: 20px; background: #e2e8f0; margin: 0 6px; }
	:global(.dark) .v-divider { background: #334155; }

	.dropdown-wrapper { position: relative; }
	.dropdown-menu {
		position: absolute; top: 100%; left: 0; margin-top: 4px;
		background: white; border: 1px solid #e2e8f0; border-radius: 8px;
		box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 4px; min-width: 160px; z-index: 110;
	}
	:global(.dark) .dropdown-menu { background: #1e293b; border-color: #334155; }
	
	.dropdown-menu button {
		display: flex; align-items: center; width: 100%; padding: 8px 12px;
		border: none; background: transparent; text-align: left; border-radius: 4px; cursor: pointer;
	}
	:global(.dark) .dropdown-menu button { color: #e2e8f0; }
	
	.dropdown-menu button:hover { background: #f1f5f9; }
	:global(.dark) .dropdown-menu button:hover { background: #334155; }
	
	.dropdown-menu.scrollable { max-height: 240px; overflow-y: auto; }
	.dropdown-menu.compact { display: flex; gap: 4px; min-width: auto; padding: 4px; }
	.dropdown-menu.compact button { width: 36px; height: 36px; padding: 0; justify-content: center; }
	
	.editor-wrapper { position: relative; padding: 24px; min-height: 400px; }
	.rich-editor { outline: none; min-height: 400px; line-height: 1.6; font-size: 16px; color: #334155; }
	:global(.dark) .rich-editor { color: #e2e8f0; }
	
	.placeholder { position: absolute; top: 24px; left: 24px; color: #94a3b8; pointer-events: none; }
	
	.image-resizer-overlay {
		position: absolute; border: 1px solid #3b82f6; pointer-events: none; z-index: 50;
	}
	/* テキスト要素は青枠のみでリサイズハンドル非表示 */
	.image-resizer-overlay.text-only .resize-handle {
		display: none;
	}
	.overlay-controls {
		position: absolute; top: -44px; left: 50%; transform: translateX(-50%);
		display: flex; gap: 6px; pointer-events: auto;
		user-select: none;
		-webkit-user-select: none;
	}
	.overlay-control {
		background: #3b82f6; color: white; border: none; border-radius: 8px;
		width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(0,0,0,0.2);
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}
	.overlay-control:hover {
		background: #2563eb;
		transform: scale(1.1);
	}
	.overlay-control.move-up { background: #10b981; }
	.overlay-control.move-up:hover { background: #059669; }
	.overlay-control.move-down { background: #10b981; }
	.overlay-control.move-down:hover { background: #059669; }
	.overlay-control.delete { background: #ef4444; }
	.overlay-control.delete:hover { background: #dc2626; }

	.overlay-control.align { background: #64748b; }
	.overlay-control.align:hover { background: #475569; }
	.overlay-control.align.active { background: #3b82f6; }

	.resize-handle {
		position: absolute; width: 10px; height: 10px; background: white; border: 2px solid #3b82f6;
		pointer-events: auto; border-radius: 50%;
	}
	.resize-handle.nw { left: -5px; top: -5px; cursor: nwse-resize; }
	.resize-handle.ne { right: -5px; top: -5px; cursor: nesw-resize; }
	.resize-handle.se { right: -5px; bottom: -5px; cursor: nwse-resize; }
	.resize-handle.sw { left: -5px; bottom: -5px; cursor: nesw-resize; }
	
	.inline-toolbar {
		position: absolute; display: flex; background: #1e293b; color: white;
		padding: 4px; border-radius: 8px; transform: translate(-50%, 0);
	}
	.inline-toolbar button {
		background: transparent; border: none; color: white; padding: 4px 8px; cursor: pointer; border-radius: 4px;
	}
	.inline-toolbar button:hover { background: #334155; }

	/* モーダル・ダイアログ */
	.modal-overlay {
		position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
		display: flex; align-items: center; justify-content: center; z-index: 2000;
	}
	.modal-card {
		background: white; padding: 24px; border-radius: 12px; width: 400px; max-width: 90vw;
		box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
	}
	:global(.dark) .modal-card {
		background: #1e293b;
	}
	.modal-card h3 { margin: 0 0 16px; font-size: 18px; color: #1e293b; }
	:global(.dark) .modal-card h3 { color: #e2e8f0; }
	
	.modal-input {
		width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; outline: none;
	}
	:global(.dark) .modal-input {
		background: #0f172a;
		border-color: #334155;
		color: #e2e8f0;
	}
	
	.modal-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
	.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
	.modal-actions button {
		padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s;
	}
	.btn-primary { background: #3b82f6; color: white; }
	.btn-primary:hover { background: #2563eb; }
	.btn-danger { background: #fee2e2; color: #dc2626; }
	.btn-danger:hover { background: #fecaca; }

	.modal-card.large { width: 800px; }
	.modal-textarea {
		width: 100%; height: 300px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;
		font-family: monospace; font-size: 14px; margin-bottom: 16px; resize: none;
	}
	:global(.dark) .modal-textarea {
		background: #0f172a;
		border-color: #334155;
		color: #e2e8f0;
	}

	/* テーブルメニュー */
	.table-menu {
		position: absolute; background: white; border: 1px solid #e2e8f0; border-radius: 8px;
		box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 4px; z-index: 1000; min-width: 160px;
	}
	:global(.dark) .table-menu {
		background: #1e293b;
		border-color: #334155;
	}
	.table-menu button {
		display: block; width: 100%; padding: 8px 12px; border: none; background: transparent;
		text-align: left; font-size: 14px; border-radius: 4px; cursor: pointer;
	}
	:global(.dark) .table-menu button { color: #e2e8f0; }
	
	.table-menu button:hover { background: #f1f5f9; }
	:global(.dark) .table-menu button:hover { background: #334155; }
	
	.table-menu .text-danger { color: #ef4444; }

	:global(.rich-editor img) { max-width: 100%; border-radius: 8px; }
	:global(.rich-editor video) { max-width: 100%; border-radius: 8px; }

	/* Image Alignment Styles */
	:global(.image-wrapper) {
		margin: 2rem 0;
		display: block;
	}
	:global(.image-align-left) {
		float: left !important;
		margin-right: 2rem !important;
		max-width: 50% !important;
		clear: none !important;
		display: block !important;
	}
	:global(.image-align-center) {
		margin-left: auto !important;
		margin-right: auto !important;
		text-align: center !important;
		float: none !important;
		clear: both !important;
		display: block !important;
		width: fit-content !important;
	}
	:global(.image-align-right) {
		float: right !important;
		margin-left: 2rem !important;
		max-width: 50% !important;
		clear: none !important;
		display: block !important;
	}
	:global(.image-wrapper img) {
		max-width: 100%;
		height: auto;
		border-radius: 2.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}
	:global(.image-wrapper figcaption) {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 900;
		margin-top: 1rem;
		opacity: 0.6;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	/* Float clear fix */
	:global(.rich-editor > p:not(.image-align-left):not(.image-align-right):not([style*="float"]):not(.image-align-center)),
	:global(.rich-editor > h1:not(.image-align-left):not(.image-align-right):not([style*="float"]):not(.image-align-center)),
	:global(.rich-editor > h2:not(.image-align-left):not(.image-align-right):not([style*="float"]):not(.image-align-center)),
	:global(.rich-editor > h3:not(.image-align-left):not(.image-align-right):not([style*="float"]):not(.image-align-center)),
	:global(.rich-editor > ul:not(.image-align-left):not(.image-align-right):not([style*="float"]):not(.image-align-center)),
	:global(.rich-editor > ol:not(.image-align-left):not(.image-align-right):not([style*="float"]):not(.image-align-center)) {
		clear: both;
	}
</style>

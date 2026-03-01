<script lang="ts">
	import { onMount } from 'svelte';
	import SlashMenu from './SlashMenu.svelte';
	import { replaceTextWithBlock, setCursorToEnd, getSelectionRange } from './utils/selection';
	import { htmlToMarkdown, markdownToHtml } from './utils/converter';
	import {
		Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon,
		Undo, Redo, Move, List, ListOrdered, Quote, Code, Minus, Table as TableIcon,
		AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Palette, Trash2,
		Heading1, Heading2, Heading3
	} from 'lucide-svelte';

	interface Props {
		value?: string;
		placeholder?: string;
		onchange?: (html: string) => void;
	}

	let {
		value = '',
		placeholder = '内容を入力するか、 "/" でコマンドを表示...',
		onchange
	}: Props = $props();

	let editorRef: HTMLDivElement | undefined = $state();
	let fileInputRef: HTMLInputElement | undefined = $state();
	let menuState = $state({ show: false, x: 0, y: 0 });
	let innerHTML = $state('');

	// History State for Undo/Redo
	let history = $state<string[]>([]);
	let historyIndex = $state(-1);
	const MAX_HISTORY = 50;
	let historyTimeout: ReturnType<typeof setTimeout>;

	// Element Resizing & Moving State
	let selectedElement = $state<HTMLElement | null>(null);
	let resizing = $state(false);
	let startX = 0;
	let startY = 0;
	let startWidth = 0;
	let startHeight = 0;
	let overlayPos = $state<{left: number, top: number, width: number, height: number} | null>(null);

	// Drag and Drop State
	let draggedElement = $state<HTMLElement | null>(null);
	let dragPlaceholder = $state<HTMLElement | null>(null);
	let dragOverElement = $state<HTMLElement | null>(null);

	// Color Picker State
	let showColorPicker = $state(false);
	let showBgColorPicker = $state(false);
	let colorPickerPosition = $state({ x: 0, y: 0 });
	let currentColor = $state('#000000');

	// Font Size State
	let currentFontSize = $state('16');

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
		if (editorRef) {
			document.execCommand('defaultParagraphSeparator', false, 'p');
			// value は既に HTML のため直接セット
			editorRef.innerHTML = value || '<p><br></p>';
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
		}
	});

	function saveToHistory(html: string) {
		if (history[historyIndex] === html) return;
		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push(html);
		if (newHistory.length > MAX_HISTORY) {
			newHistory.shift();
		} else {
			historyIndex++;
		}
		history = newHistory;
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
			editorRef.innerHTML = html;
			innerHTML = html;
			if (onchange) onchange(html);
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
			updateOverlayPos();
		} else if (!target.closest('.resize-handle') && !target.closest('.rich-editor') &&
			!target.closest('.move-handle') && !target.closest('.color-picker')) {
			if (selectedElement) {
				selectedElement.removeAttribute('draggable');
			}
			selectedElement = null;
			overlayPos = null;
			showColorPicker = false;
			showBgColorPicker = false;
		}
	}

	// キーボードでドラッグ（アクセシビリティ）
	function handleDragKeydown(e: KeyboardEvent) {
		if (!selectedElement) return;

		if (e.key === 'ArrowUp' && e.altKey) {
			e.preventDefault();
			const prev = selectedElement.previousElementSibling;
			if (prev && editorRef?.contains(prev)) {
				selectedElement.parentElement?.insertBefore(selectedElement, prev);
				saveAndNotify();
			}
		} else if (e.key === 'ArrowDown' && e.altKey) {
			e.preventDefault();
			const next = selectedElement.nextElementSibling;
			if (next && editorRef?.contains(next)) {
				selectedElement.parentElement?.insertBefore(selectedElement, next.nextElementSibling);
				saveAndNotify();
			}
		}
	}

	function saveAndNotify() {
		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
		}
		updateOverlayPos();
	}

	function startResize(e: MouseEvent) {
		if (!selectedElement) return;
		resizing = true;
		startX = e.clientX;
		startY = e.clientY;
		
		// テキスト要素の場合は現在の表示サイズ、それ以外は clientSize
		const isTextElement = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'HR', 'BLOCKQUOTE', 'PRE'].includes(selectedElement.tagName);
		startWidth = isTextElement ? selectedElement.offsetWidth : selectedElement.clientWidth;
		startHeight = isTextElement ? selectedElement.offsetHeight : selectedElement.clientHeight;

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
		const minWidth = isTextElement ? 100 : 50;
		const minHeight = isTextElement ? 30 : 20;

		const newWidth = Math.max(minWidth, startWidth + deltaX);
		const newHeight = Math.max(minHeight, startHeight + deltaY);

		selectedElement.style.width = `${newWidth}px`;
		selectedElement.style.height = `${newHeight}px`;

		updateOverlayPos();
	}

	function stopResize() {
		resizing = false;
		window.removeEventListener('mousemove', handleResize);
		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
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
		}
	}

	// value が外部から変更されたらエディターを更新
	$effect(() => {
		if (!editorRef || !value) return;
		
		// 編集中は更新しない
		if (document.activeElement === editorRef) return;
		
		// 内容が異なる場合のみ更新
		if (value !== editorRef.innerHTML) {
			editorRef.innerHTML = value;
			innerHTML = value;
			saveToHistory(value);
		}
	});

	$effect(() => {
		window.addEventListener('click', handleGlobalClick);
		window.addEventListener('scroll', updateOverlayPos, { capture: true, passive: true });
		window.addEventListener('resize', updateOverlayPos, { passive: true });

		return () => {
			window.removeEventListener('click', handleGlobalClick);
			window.removeEventListener('scroll', updateOverlayPos, { capture: true });
			window.removeEventListener('resize', updateOverlayPos);
		};
	});

	// ドラッグ開始
	function handleDragStart(e: DragEvent) {
		const target = e.target as HTMLElement;
		if (!editorRef?.contains(target)) return;

		draggedElement = target;
		target.style.opacity = '0.4';

		// プレースホルダー作成
		dragPlaceholder = document.createElement('div');
		dragPlaceholder.className = 'drag-placeholder';
		dragPlaceholder.style.cssText = 'height: 100px; background: rgba(59, 130, 246, 0.2); border: 2px dashed #3b82f6; border-radius: 8px; margin: 1rem 0;';

		e.dataTransfer?.setData('text/plain', target.tagName);
		e.dataTransfer!.effectAllowed = 'move';
	}

	// ドラッグ中
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';

		if (!draggedElement) return;

		// ドロップ先の要素を探す
		const elements = document.elementsFromPoint(e.clientX, e.clientY);
		const dropTarget = elements.find(el => {
			const parent = el.parentElement;
			return parent && editorRef?.contains(parent) &&
				['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'DIV'].includes(parent.tagName);
		});

		if (dropTarget && dropTarget !== draggedElement && dragPlaceholder) {
			const parent = dropTarget.parentElement as HTMLElement;
			if (dragPlaceholder.parentElement !== parent) {
				parent.insertBefore(dragPlaceholder, dropTarget);
			}
		}
	}

	// ドロップ
	function handleDragEnd(e: DragEvent) {
		if (!draggedElement || !dragPlaceholder) return;

		const placeholderParent = dragPlaceholder.parentElement;
		if (placeholderParent && placeholderParent.contains(dragPlaceholder)) {
			// ドラッグ元の位置を保存
			const originalParent = draggedElement.parentElement;
			const originalNext = draggedElement.nextElementSibling;

			// プレースホルダーの位置に移動
			placeholderParent.insertBefore(draggedElement, dragPlaceholder);

			// プレースホルダー削除
			dragPlaceholder.remove();

			// 変更を保存
			if (editorRef) {
				innerHTML = editorRef.innerHTML;
				saveToHistory(innerHTML);
				if (onchange) onchange(innerHTML);
			}
		}

		// クリーンアップ
		if (draggedElement) {
			draggedElement.style.opacity = '1';
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
		document.execCommand(command, false, value);
		if (editorRef) {
			innerHTML = editorRef.innerHTML;
			saveToHistory(innerHTML);
			if (onchange) onchange(innerHTML);
		}
	}

	function setFontSize(size: string) {
		if (!editorRef) return;
		document.execCommand('fontSize', false, '7');
		const fontElements = editorRef.querySelectorAll('font[size="7"]');
		fontElements.forEach(el => {
			const span = document.createElement('span');
			span.style.fontSize = size + 'px';
			span.innerHTML = el.innerHTML;
			el.replaceWith(span);
		});
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function setTextColor(color: string) {
		if (!editorRef) return;
		document.execCommand('foreColor', false, color);
		currentColor = color;
		showColorPicker = false;
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function setBackgroundColor(color: string) {
		if (!editorRef) return;
		const selection = window.getSelection();
		if (!selection || !selection.rangeCount) return;

		const range = selection.getRangeAt(0);
		const selectedText = range.toString();

		if (selectedText) {
			const span = document.createElement('span');
			span.style.backgroundColor = color;
			range.surroundContents(span);
		}

		showBgColorPicker = false;
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function toggleColorPicker(isBg: boolean, event: MouseEvent) {
		const button = (event.target as HTMLElement).closest('.toolbar-btn') as HTMLElement;
		const rect = button.getBoundingClientRect();
		const outer = editorRef?.closest('.editor-outer');

		if (outer) {
			const outerRect = outer.getBoundingClientRect();
			colorPickerPosition = {
				x: rect.left - outerRect.left,
				y: rect.bottom - outerRect.top + 4
			};
		}

		if (isBg) {
			showBgColorPicker = !showBgColorPicker;
			showColorPicker = false;
		} else {
			showColorPicker = !showColorPicker;
			showBgColorPicker = false;
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLDivElement;
		innerHTML = target.innerHTML;

		if (onchange) {
			onchange(innerHTML);
		}

		clearTimeout(historyTimeout);
		historyTimeout = setTimeout(() => {
			saveToHistory(innerHTML);
		}, 1000);

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
					document.execCommand('insertUnorderedList');
					const sel = window.getSelection();
					if (sel && sel.anchorNode) {
						const li = sel.anchorNode.parentElement?.closest('li');
						if (li) li.textContent = '';
					}
				} else if (tag === 'hr') {
					document.execCommand('insertHorizontalRule');
					if (node.parentElement) node.parentElement.innerHTML = '';
				} else if (tag === 'pre') {
					document.execCommand('formatBlock', false, 'PRE');
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
			case 'h1': document.execCommand('formatBlock', false, 'H1'); break;
			case 'h2': document.execCommand('formatBlock', false, 'H2'); break;
			case 'h3': document.execCommand('formatBlock', false, 'H3'); break;
			case 'bullet': document.execCommand('insertUnorderedList'); break;
			case 'number': document.execCommand('insertOrderedList'); break;
			case 'quote': document.execCommand('formatBlock', false, 'BLOCKQUOTE'); break;
			case 'hr': document.execCommand('insertHorizontalRule'); break;
			case 'image': fileInputRef?.click(); break;
			case 'code':
				document.execCommand('formatBlock', false, 'PRE');
				break;
			case 'table': insertTable(); break;
		}

		menuState.show = false;
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function insertTable() {
		if (!editorRef) return;

		const rows = 3;
		const cols = 3;

		let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">';
		for (let i = 0; i < rows; i++) {
			tableHtml += '<tr>';
			for (let j = 0; j < cols; j++) {
				tableHtml += '<td style="border: 1px solid #d1d5db; padding: 0.75rem; min-width: 80px;">&nbsp;</td>';
			}
			tableHtml += '</tr>';
		}
		tableHtml += '</table><p><br></p>';

		document.execCommand('insertHTML', false, tableHtml);
		innerHTML = editorRef.innerHTML;
		saveToHistory(innerHTML);
		if (onchange) onchange(innerHTML);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (selectedElement && (e.key === 'Backspace' || e.key === 'Delete')) {
			e.preventDefault();
			deleteSelectedElement();
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

		if (e.key === 'Tab') {
			e.preventDefault();
			document.execCommand('indent');
		}
	}
</script>

<div class="editor-outer">
	<div class="editor-container">
		<div class="toolbar">
			<button type="button" class="toolbar-btn" onclick={undo} disabled={historyIndex <= 0} title="元に戻す (Ctrl+Z)">
				<Undo size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={redo} disabled={historyIndex >= history.length - 1} title="やり直し (Ctrl+Y)">
				<Redo size={18} />
			</button>
			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={() => format('bold')} title="太字 (Ctrl+B)">
				<Bold size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => format('italic')} title="斜体 (Ctrl+I)">
				<Italic size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => format('underline')} title="下線 (Ctrl+U)">
				<Underline size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => format('strikeThrough')} title="取り消し線">
				<Strikethrough size={18} />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={(e) => toggleColorPicker(false, e)} title="文字色">
				<Palette size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={(e) => toggleColorPicker(true, e)} title="背景色">
				<div style="width: 18px; height: 18px; border-radius: 2px; background: #fbbf24; border: 2px solid #d1d5db;"></div>
			</button>

			<div class="v-divider"></div>

			<select onchange={(e) => {
				const size = (e.target as HTMLSelectElement).value;
				if (size) setFontSize(size);
			}} class="toolbar-select" value={currentFontSize}>
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

			<button type="button" class="toolbar-btn" onclick={() => executeCommand('h1')} title="見出し 1">
				<Heading1 size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('h2')} title="見出し 2">
				<Heading2 size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('h3')} title="見出し 3">
				<Heading3 size={18} />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={() => format('justifyLeft')} title="左揃え">
				<AlignLeft size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => format('justifyCenter')} title="中央揃え">
				<AlignCenter size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => format('justifyRight')} title="右揃え">
				<AlignRight size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => format('justifyFull')} title="両端揃え">
				<AlignJustify size={18} />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={() => executeCommand('bullet')} title="箇条書き">
				<List size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('number')} title="番号付きリスト">
				<ListOrdered size={18} />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={() => executeCommand('quote')} title="引用">
				<Quote size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('code')} title="コードブロック">
				<Code size={18} />
			</button>

			<div class="v-divider"></div>

			<button type="button" class="toolbar-btn" onclick={() => {
				const url = prompt('リンク先 URL を入力してください:');
				if (url) format('createLink', url);
			}} title="リンク">
				<LinkIcon size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => fileInputRef?.click()} title="画像">
				<ImageIcon size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('table')} title="テーブル">
				<TableIcon size={18} />
			</button>
			<button type="button" class="toolbar-btn" onclick={() => executeCommand('hr')} title="区切り線">
				<Minus size={18} />
			</button>

			<input
				type="file"
				bind:this={fileInputRef}
				onchange={handleImageUpload}
				accept="image/*"
				style="display: none;"
			/>

			{#if selectedElement}
				<div class="v-divider"></div>
				<button type="button" class="toolbar-btn" onclick={deleteSelectedElement} title="削除" style="color: #ef4444;">
					<Trash2 size={18} />
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
					<div class="move-handle">
						<Move size={14} />
					</div>
					<div
						class="resize-handle se"
						onmousedown={startResize}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startResize(e as any); }}
						onclick={(e) => e.stopPropagation()}
						role="button"
						tabindex="0"
						aria-label="Resize element"
					></div>
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
								onclick={() => setTextColor(color)}
								title={color}
							></button>
						{/each}
					</div>
				</div>
			{/if}

			{#if showBgColorPicker}
				<div class="color-picker" style="left: {colorPickerPosition.x}px; top: {colorPickerPosition.y}px;">
					<div class="color-picker-title">背景色を選択</div>
					<div class="color-grid">
						{#each colorPalette as color}
							<button
								type="button"
								class="color-swatch"
								style="background: {color};"
								onclick={() => setBackgroundColor(color)}
								title={color}
							></button>
						{/each}
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
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
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
		z-index: 1000;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		padding: 12px;
		min-width: 280px;
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
	}

	.move-handle {
		position: absolute;
		top: -28px;
		left: 0;
		background: #3b82f6;
		color: white;
		padding: 4px 8px;
		border-radius: 6px 6px 0 0;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
	}

	.resize-handle {
		position: absolute;
		width: 14px;
		height: 14px;
		background: #3b82f6;
		border: 2px solid white;
		pointer-events: auto;
		cursor: nwse-resize;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		border-radius: 2px;
	}

	.resize-handle.se {
		right: -7px;
		bottom: -7px;
	}

	/* Drag and Drop Styles */
	:global(.rich-editor [draggable="true"]) {
		cursor: grab;
		outline: 2px solid transparent;
		transition: outline-color 0.15s;
	}

	:global(.rich-editor [draggable="true"]:hover) {
		outline-color: rgba(59, 130, 246, 0.3);
	}

	:global(.rich-editor [draggable="true"]:active) {
		cursor: grabbing;
	}

	:global(.drag-placeholder) {
		height: 100px;
		background: rgba(59, 130, 246, 0.2);
		border: 2px dashed #3b82f6;
		border-radius: 8px;
		margin: 1rem 0;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 1; }
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
</style>

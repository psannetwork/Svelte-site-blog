/**
 * Selection and Range utilities for the custom rich text editor.
 */

/**
 * Gets the current selection and range.
 */
export function getSelectionRange() {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;
	return selection.getRangeAt(0);
}

/**
 * Sets the cursor position to the end of a given element.
 */
export function setCursorToEnd(element: HTMLElement) {
	const range = document.createRange();
	const selection = window.getSelection();
	if (!selection) return;

	range.selectNodeContents(element);
	range.collapse(false);
	selection.removeAllRanges();
	selection.addRange(range);
	element.focus();
}

/**
 * Sets the cursor after a specific node.
 */
export function setCursorAfter(node: Node) {
	const range = document.createRange();
	const selection = window.getSelection();
	if (!selection) return;

	range.setStartAfter(node);
	range.setEndAfter(node);
	selection.removeAllRanges();
	selection.addRange(range);
}

/**
 * Replace the current text node's content with a new element (for Markdown shortcuts).
 */
export function replaceTextWithBlock(pattern: RegExp, tagName: string) {
	const selection = window.getSelection();
	if (!selection || !selection.rangeCount) return;

	const range = selection.getRangeAt(0);
	const node = range.startContainer;

	if (node.nodeType !== Node.TEXT_NODE) return;

	const text = node.textContent || '';
	const match = text.match(pattern);

	if (match) {
		const parent = node.parentElement;
		if (!parent || parent.getAttribute('contenteditable') === 'true' || parent.tagName === 'DIV') {
			const newBlock = document.createElement(tagName);
			newBlock.textContent = text.replace(pattern, '') || '\u200B';

			const targetToReplace = parent && parent.tagName === 'DIV' && parent.getAttribute('contenteditable') !== 'true'
				? parent
				: node;

			if (targetToReplace === node && parent) {
				const blockContainer = node.parentElement;
				if (blockContainer && blockContainer.getAttribute('contenteditable') !== 'true') {
					(blockContainer as any).replaceWith(newBlock);
				} else {
					(node as any).replaceWith(newBlock);
				}
			} else {
				(targetToReplace as any).replaceWith(newBlock);
			}

			setCursorToEnd(newBlock);
			return true;
		}
	}
	return false;
}

/**
 * Gets the current selection bounds.
 */
export function getSelectionBounds() {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	const rects = range.getClientRects();
	if (!rects || rects.length === 0) return null;

	const firstRect = rects[0];
	const lastRect = rects[rects.length - 1];

	return {
		top: Math.min(firstRect.top, lastRect.top),
		bottom: Math.max(firstRect.bottom, lastRect.bottom),
		left: Math.min(firstRect.left, lastRect.left),
		right: Math.max(firstRect.right, lastRect.right),
		width: lastRect.right - firstRect.left,
		height: lastRect.bottom - firstRect.top
	};
}

/**
 * Checks if the current selection is collapsed (no selection).
 */
export function isSelectionCollapsed() {
	const selection = window.getSelection();
	return !selection || selection.isCollapsed;
}

/**
 * Gets the selected text.
 */
export function getSelectedText() {
	const selection = window.getSelection();
	return selection ? selection.toString() : '';
}

/**
 * Wraps the selected text with a given tag.
 */
export function wrapSelectionWithTag(tagName: string, style: Record<string, string> = {}) {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	if (range.collapsed) return null;

	const selectedText = range.toString();
	if (!selectedText.trim()) return null;

	const wrapper = document.createElement(tagName);
	Object.entries(style).forEach(([key, value]) => {
		wrapper.style[key as any] = value;
	});

	try {
		range.surroundContents(wrapper);
		selection.removeAllRanges();
		selection.addRange(range);
		return wrapper;
	} catch {
		const fragment = range.extractContents();
		wrapper.appendChild(fragment);
		range.insertNode(wrapper);
		selection.removeAllRanges();
		selection.addRange(range);
		return wrapper;
	}
}

/**
 * Applies inline style to the selection.
 */
export function applyInlineStyleToSelection(
	tagName: string,
	style: Record<string, string> = {},
	toggle = false
) {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return { applied: false, removed: false, allMatch: false };

	const range = selection.getRangeAt(0);
	if (range.collapsed) return { applied: false, removed: false, allMatch: false };

	const selectedText = range.toString();
	if (!selectedText.trim()) return { applied: false, removed: false, allMatch: false };

	// 指定されたスタイルがすでに適用されているかチェック
	const hasStyle = hasInlineStyleInRange(range, tagName, style);

	if (toggle && hasStyle) {
		// すでに適用されている場合は解除
		removeInlineStyleFromSelection(range, tagName, style);
		return { applied: false, removed: true, allMatch: false };
	}

	// execCommand を使用して複数選択を正しく処理
	if (style.color) {
		document.execCommand('styleWithCSS', false, 'true' as any);
		document.execCommand('foreColor', false, style.color);
	} else if (style.fontSize) {
		document.execCommand('styleWithCSS', false, 'true' as any);
		const fontSize = style.fontSize;
		// fontSize は span でラップ
		document.execCommand('fontName', false, '__custom_font__');
		// 直後に fontName を元に戻す
		const commonAncestor = range.commonAncestorContainer as Element | Node;
		if ('querySelectorAll' in commonAncestor) {
			const fontElements = commonAncestor.querySelectorAll('span[style*="font-family"]');
			fontElements.forEach((el: Element) => {
				(el as HTMLElement).style.fontFamily = '';
				(el as HTMLElement).style.fontSize = fontSize;
				if (!(el as HTMLElement).style.cssText) {
					el.removeAttribute('style');
				}
			});
		}
	} else {
		wrapSelectionWithTag(tagName, style);
	}

	return { applied: true, removed: false, allMatch: false };
}

/**
 * Checks if the range has the specified style.
 */
function hasInlineStyleInRange(range: Range, tagName: string, style: Record<string, string>): boolean {
	const textNodes = getTextNodesInRange(range);
	if (textNodes.length === 0) return false;

	return textNodes.some(node => {
		const parent = node.parentElement;
		if (!parent) return false;

		let current: HTMLElement | null = parent;
		while (current && current.tagName !== 'DIV' && !current.hasAttribute('contenteditable')) {
			if (current.tagName.toLowerCase() === tagName.toLowerCase()) {
				return Object.entries(style).every(([key, value]) => {
					// color の場合、RGB 形式も考慮して比較
					if (key === 'color') {
						const computedColor = current?.style.color;
						if (computedColor === value) return true;
						// HEX と RGB の相互変換を考慮
						if (computedColor && rgbToHex(computedColor) === value) return true;
						if (value && hexToRgb(value) === computedColor) return true;
						return false;
					}
					return current!.style[key as any] === value || current!.getAttribute(key) === value;
				});
			}
			current = current.parentElement;
		}

		// インラインスタイルもチェック
		return Object.entries(style).every(([key, value]) => {
			if (key === 'color') {
				const computedColor = parent.style.color;
				if (computedColor === value) return true;
				if (computedColor && rgbToHex(computedColor) === value) return true;
				if (value && hexToRgb(value) === computedColor) return true;
				return false;
			}
			return parent.style[key as any] === value;
		});
	});
}

/**
 * RGB → HEX 変換
 */
function rgbToHex(rgb: string): string {
	if (rgb.startsWith('#')) return rgb;
	const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	if (!match) return rgb;
	const r = parseInt(match[1]);
	const g = parseInt(match[2]);
	const b = parseInt(match[3]);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * HEX → RGB 変換
 */
function hexToRgb(hex: string): string {
	if (!hex.startsWith('#')) return hex;
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgb(${r}, ${g}, ${b})`;
}

function toHex(v: number): string {
	return v.toString(16).padStart(2, '0');
}

/**
 * Gets all text nodes in a range.
 */
function getTextNodesInRange(range: Range): Text[] {
	const textNodes: Text[] = [];
	const walker = document.createTreeWalker(
		range.commonAncestorContainer,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode: (node) => {
				const parent = node.parentElement;
				if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
					return NodeFilter.FILTER_REJECT;
				}
				if (range.intersectsNode(node)) {
					return NodeFilter.FILTER_ACCEPT;
				}
				return NodeFilter.FILTER_REJECT;
			}
		}
	);

	let node: Node | null = walker.nextNode();
	while (node) {
		textNodes.push(node as Text);
		node = walker.nextNode();
	}

	return textNodes;
}

/**
 * Checks if a text node has the specified inline style.
 */
function hasInlineStyle(node: Text, tagName: string, style: Record<string, string>): boolean {
	const parent = node.parentElement;
	if (!parent) return false;

	// 直接の親が指定されたタグかチェック
	if (parent.tagName.toLowerCase() === tagName.toLowerCase()) {
		// スタイルもチェック
		return Object.entries(style).every(([key, value]) => {
			return parent.style[key as any] === value || parent.getAttribute(key) === value;
		});
	}

	// 祖先をたどってチェック
	let current: HTMLElement | null = parent;
	while (current && current.tagName !== 'DIV' && !current.hasAttribute('contenteditable')) {
		if (current.tagName.toLowerCase() === tagName.toLowerCase()) {
			return Object.entries(style).every(([key, value]) => {
				return current!.style[key as any] === value || current!.getAttribute(key) === value;
			});
		}
		current = current.parentElement;
	}

	return false;
}

/**
 * Removes inline style from selection.
 */
function removeInlineStyleFromSelection(range: Range, tagName: string, style: Record<string, string>) {
	const textNodes = getTextNodesInRange(range);

	textNodes.forEach(node => {
		const parent = node.parentElement;
		if (!parent) return;

		// スタイルが一致する要素を探す
		let current: HTMLElement | null = parent;
		while (current && current.tagName !== 'DIV' && !current.hasAttribute('contenteditable')) {
			if (current.tagName.toLowerCase() === tagName.toLowerCase()) {
				const styleMatches = Object.entries(style).every(([key, value]) => {
					return current!.style[key as any] === value || current!.getAttribute(key) === value;
				});

				if (styleMatches || Object.keys(style).length === 0) {
					// 要素をアンラップ
					const fragment = document.createDocumentFragment();
					while (current.firstChild) {
						fragment.appendChild(current.firstChild);
					}
					current.parentNode?.replaceChild(fragment, current);
					break;
				}
			}
			current = current.parentElement;
		}
	});
}

/**
 * Checks if the selection has the specified inline style.
 */
export function hasInlineStyleInSelection(tagName: string, style: Record<string, string> = {}): boolean {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return false;

	const range = selection.getRangeAt(0);
	if (range.collapsed) return false;

	const textNodes = getTextNodesInRange(range);
	if (textNodes.length === 0) return false;
	
	// 一部のテキストノードでもスタイルを持っていれば true
	return textNodes.some(node => hasInlineStyle(node, tagName, style));
}

/**
 * Checks if all text in selection has the specified inline style.
 */
export function hasAllInlineStyleInSelection(tagName: string, style: Record<string, string> = {}): boolean {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return false;

	const range = selection.getRangeAt(0);
	if (range.collapsed) return false;

	const textNodes = getTextNodesInRange(range);
	if (textNodes.length === 0) return false;
	
	// すべてのテキストノードがスタイルを持っていれば true
	return textNodes.every(node => hasInlineStyle(node, tagName, style));
}

/**
 * Creates a link at the current selection.
 */
export function createLink(url: string, target = '_blank') {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	if (range.collapsed) return null;

	const link = document.createElement('a');
	link.href = url;
	link.target = target;
	link.rel = target === '_blank' ? 'noopener noreferrer' : '';

	try {
		range.surroundContents(link);
	} catch {
		const fragment = range.extractContents();
		link.appendChild(fragment);
		range.insertNode(link);
	}

	selection.removeAllRanges();
	selection.addRange(range);
	return link;
}

/**
 * Removes link from the current selection.
 */
export function removeLink() {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	const node = range.commonAncestorContainer as HTMLElement;
	const link = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement?.closest('a');

	if (link) {
		const parent = link.parentNode;
		while (link.firstChild) {
			parent?.insertBefore(link.firstChild, link);
		}
		link.remove();
	}
}

/**
 * Gets the parent block element.
 */
export function getBlockElement(element: HTMLElement | null): HTMLElement | null {
	const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'TD', 'TH'];
	let current: HTMLElement | null = element;

	while (current && !current.hasAttribute('contenteditable')) {
		if (blockTags.includes(current.tagName)) {
			return current;
		}
		current = current.parentElement;
	}

	return null;
}

/**
 * Inserts HTML at the current cursor position.
 */
export function insertHtmlAtCursor(html: string) {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	range.deleteContents();

	const div = document.createElement('div');
	div.innerHTML = html;
	const fragment = document.createDocumentFragment();
	let lastNode: Node | null = null;

	while (div.firstChild) {
		lastNode = div.firstChild;
		fragment.appendChild(div.firstChild);
	}

	range.insertNode(fragment);

	if (lastNode) {
		const newRange = document.createRange();
		newRange.setStartAfter(lastNode);
		newRange.collapse(true);
		selection.removeAllRanges();
		selection.addRange(newRange);
	}
}

/**
 * Inserts text at the current cursor position.
 */
export function insertTextAtCursor(text: string) {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	range.deleteContents();
	range.insertNode(document.createTextNode(text));

	const newRange = document.createRange();
	newRange.setStartAfter(range.endContainer);
	newRange.collapse(true);
	selection.removeAllRanges();
	selection.addRange(newRange);
}

/**
 * Formats a block element (e.g., change P to H1).
 * Replaces the native execCommand with a manual implementation for better control.
 */
export function formatBlock(newTagName: string) {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	const node = range.commonAncestorContainer;
	const block = getBlockElement(node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement));

	if (!block) {
		const newBlock = document.createElement(newTagName);
		newBlock.innerHTML = range.toString() || '<br>';
		range.deleteContents();
		range.insertNode(newBlock);
		setCursorToEnd(newBlock);
		return newBlock;
	}

	// 1. 中身をフラットなテキスト/インライン構造にする (pタグなどを抽出)
	const tempContainer = document.createElement('div');
	tempContainer.innerHTML = block.innerHTML;
	
	// 子要素の P タグなどを除去して中身を抽出
	const cleanContent = Array.from(tempContainer.childNodes).map(child => {
		if (child.nodeName === 'P' || child.nodeName === 'DIV') {
			return (child as HTMLElement).innerHTML;
		}
		return (child as HTMLElement).outerHTML || child.textContent;
	}).join('');

	// 2. 新しいタグを作成
	const newBlock = document.createElement(newTagName);
	newBlock.innerHTML = cleanContent;
	
	// id などの属性を引き継ぐ必要があるならここでコピー
	if (block.hasAttribute('data-element-id')) {
		newBlock.setAttribute('data-element-id', block.getAttribute('data-element-id')!);
	}

	block.replaceWith(newBlock);
	setCursorToEnd(newBlock);
	return newBlock;
}

/**
 * Checks if a node is a block element.
 */
function isBlockElement(node: Node): boolean {
	if (node.nodeType !== Node.ELEMENT_NODE) return false;
	const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'];
	return blockTags.includes((node as HTMLElement).tagName);
}

/**
 * Formats a single block element.
 */
function formatSingleBlock(
	block: HTMLElement | null,
	newTagName: string,
	range: Range
) {
	if (!block) {
		const newBlock = document.createElement(newTagName);
		newBlock.textContent = '\u200B';
		range.insertNode(newBlock);
		setCursorToEnd(newBlock);
		return newBlock;
	}

	if (block.tagName === newTagName.toUpperCase()) {
		// 既存のタグを P に戻す
		const p = document.createElement('p');
		p.innerHTML = block.innerHTML;
		block.replaceWith(p);
		setCursorToEnd(p);
		return p;
	}

	// 新しいタグに置き換え
	const newBlock = document.createElement(newTagName);
	newBlock.innerHTML = block.innerHTML;
	block.replaceWith(newBlock);
	setCursorToEnd(newBlock);
	return newBlock;
}

/**
 * Toggles list (UL/OL).
 */
export function toggleList(listType: 'UL' | 'OL') {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	const node = range.startContainer;
	const block = getBlockElement(node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement));

	if (!block) return;

	const parentList = block.closest(listType === 'UL' ? 'ol' : 'ul');
	if (parentList) {
		const listItems = Array.from(parentList.children);
		const fragment = document.createDocumentFragment();
		listItems.forEach(li => {
			const p = document.createElement('p');
			p.innerHTML = li.innerHTML;
			fragment.appendChild(p);
		});
		parentList.replaceWith(fragment);
	} else {
		const list = document.createElement(listType.toLowerCase());
		const li = document.createElement('li');
		li.innerHTML = block.innerHTML;
		list.appendChild(li);
		block.replaceWith(list);
		setCursorToEnd(li);
	}
}

/**
 * Toggles blockquote.
 */
export function toggleBlockquote() {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	const node = range.startContainer;
	const block = getBlockElement(node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement));

	if (!block) return;

	if (block.tagName === 'BLOCKQUOTE') {
		const p = document.createElement('p');
		p.innerHTML = block.innerHTML;
		block.replaceWith(p);
		setCursorToEnd(p);
	} else {
		const blockquote = document.createElement('blockquote');
		blockquote.innerHTML = block.innerHTML;
		block.replaceWith(blockquote);
		setCursorToEnd(blockquote);
	}
}

/**
 * Inserts a horizontal rule.
 */
export function insertHorizontalRule() {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	const hr = document.createElement('hr');
	range.insertNode(hr);

	const p = document.createElement('p');
	p.innerHTML = '<br>';
	hr.after(p);

	const newRange = document.createRange();
	newRange.setStart(p, 0);
	newRange.collapse(true);
	selection.removeAllRanges();
	selection.addRange(newRange);
}

/**
 * Inserts a table.
 */
export function insertTableElement(rows = 3, cols = 3) {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);

	let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">';
	for (let i = 0; i < rows; i++) {
		tableHtml += '<tr>';
		for (let j = 0; j < cols; j++) {
			tableHtml += '<td style="border: 1px solid #d1d5db; padding: 0.75rem; min-width: 80px;">&nbsp;</td>';
		}
		tableHtml += '</tr>';
	}
	tableHtml += '</table>';

	const div = document.createElement('div');
	div.innerHTML = tableHtml + '<p><br></p>';
	const fragment = document.createDocumentFragment();
	while (div.firstChild) {
		fragment.appendChild(div.firstChild);
	}

	range.deleteContents();
	range.insertNode(fragment);

	const p = range.endContainer.parentElement?.querySelector('p');
	if (p) {
		const newRange = document.createRange();
		newRange.setStart(p, 0);
		newRange.collapse(true);
		selection.removeAllRanges();
		selection.addRange(newRange);
	}
}

/**
 * Aligns text in a block element.
 */
export function alignText(alignment: 'left' | 'center' | 'right' | 'justify') {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);
	const node = range.startContainer;
	const block = getBlockElement(node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement));

	if (!block) return;

	block.style.textAlign = alignment;
}

/**
 * Table manipulation utilities.
 */

/**
 * Adds a row to a table.
 */
export function addTableRow(table: HTMLTableElement, afterIndex = -1) {
	const cols = table.rows[0]?.cells.length || 3;
	const newRow = table.insertRow(afterIndex + 1);
	for (let i = 0; i < cols; i++) {
		const cell = newRow.insertCell();
		cell.style.border = '1px solid #d1d5db';
		cell.style.padding = '0.75rem';
		cell.style.minWidth = '80px';
		cell.innerHTML = '&nbsp;';
	}
}

/**
 * Adds a column to a table.
 */
export function addTableColumn(table: HTMLTableElement, afterIndex = -1) {
	for (let i = 0; i < table.rows.length; i++) {
		const row = table.rows[i];
		const cell = row.insertCell(afterIndex + 1);
		cell.style.border = '1px solid #d1d5db';
		cell.style.padding = '0.75rem';
		cell.style.minWidth = '80px';
		cell.innerHTML = '&nbsp;';
	}
}

/**
 * Deletes a row from a table.
 */
export function deleteTableRow(table: HTMLTableElement, rowIndex: number) {
	if (table.rows.length > 1) {
		table.deleteRow(rowIndex);
	} else {
		// If only one row left, delete the table
		table.remove();
	}
}

/**
 * Deletes a column from a table.
 */
export function deleteTableColumn(table: HTMLTableElement, colIndex: number) {
	for (let i = 0; i < table.rows.length; i++) {
		const row = table.rows[i];
		if (row.cells.length > 1) {
			row.deleteCell(colIndex);
		} else {
			// If only one column left, delete the table
			table.remove();
			break;
		}
	}
}

/**
 * Merges selected cells horizontally.
 */
export function mergeTableCellsHorizontally(cell: HTMLTableCellElement) {
	const row = cell.parentElement as HTMLTableRowElement;
	const table = row.parentElement as HTMLTableElement;
	const rowIndex = row.rowIndex;
	const cellIndex = cell.cellIndex;

	// Check if there's a next cell to merge with
	const nextCell = row.cells[cellIndex + 1];
	if (!nextCell) return;

	// Merge cells
	cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
	cell.innerHTML += nextCell.innerHTML;
	nextCell.remove();
}

/**
 * Merges selected cells vertically.
 */
export function mergeTableCellsVertically(cell: HTMLTableCellElement) {
	const row = cell.parentElement as HTMLTableRowElement;
	const table = row.parentElement as HTMLTableElement;
	const rowIndex = row.rowIndex;
	const cellIndex = cell.cellIndex;

	// Check if there's a row below
	const nextRow = table.rows[rowIndex + 1];
	if (!nextRow) return;

	const nextCell = nextRow.cells[cellIndex];
	if (!nextCell) return;

	// Merge cells
	cell.rowSpan = (cell.rowSpan || 1) + (nextCell.rowSpan || 1);
	cell.innerHTML += '<br>' + nextCell.innerHTML;
	nextCell.remove();
}

/**
 * Splits merged cell.
 */
export function splitTableCell(cell: HTMLTableCellElement) {
	const colSpan = cell.colSpan;
	const rowSpan = cell.rowSpan;
	const content = cell.innerHTML;

	if (colSpan === 1 && rowSpan === 1) return;

	const row = cell.parentElement as HTMLTableRowElement;
	const table = row.parentElement as HTMLTableElement;
	const rowIndex = row.rowIndex;
	const cellIndex = cell.cellIndex;

	// Clear current cell
	cell.innerHTML = content;
	cell.colSpan = 1;
	cell.rowSpan = 1;

	// Add cells for colSpan
	for (let i = 1; i < colSpan; i++) {
		const newCell = row.insertCell(cellIndex + i);
		newCell.style.border = '1px solid #d1d5db';
		newCell.style.padding = '0.75rem';
		newCell.innerHTML = '&nbsp;';
	}

	// Add rows for rowSpan
	for (let i = 1; i < rowSpan; i++) {
		const newRow = table.insertRow(rowIndex + i);
		for (let j = 0; j < colSpan; j++) {
			const newCell = newRow.insertCell(j);
			newCell.style.border = '1px solid #d1d5db';
			newCell.style.padding = '0.75rem';
			newCell.innerHTML = '&nbsp;';
		}
	}
}

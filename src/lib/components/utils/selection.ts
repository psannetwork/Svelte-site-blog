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

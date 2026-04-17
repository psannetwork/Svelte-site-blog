/**
 * Editor Selection Management Hook
 * Handles text selection and cursor position tracking
 */

export interface SelectionState {
    startOffset: number;
    endOffset: number;
    collapsed: boolean;
    rangeCount: number;
}

export class SelectionManager {
    private savedSelection: SelectionState | null = null;

    /**
     * Save current selection state
     */
    save(): void {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            this.savedSelection = {
                startOffset: range.startOffset,
                endOffset: range.endOffset,
                collapsed: range.collapsed,
                rangeCount: selection.rangeCount
            };
        }
    }

    /**
     * Restore saved selection state
     */
    restore(container: HTMLElement): boolean {
        if (!this.savedSelection || !container) {
            return false;
        }

        try {
            const selection = window.getSelection();
            if (!selection) return false;

            const range = document.createRange();
            
            // Handle empty container
            if (!container.firstChild) {
                range.setStart(container, 0);
                range.setEnd(container, 0);
            } else {
                // Clamp offsets to valid range
                const maxOffset = container.textContent?.length || 0;
                const startOffset = Math.min(this.savedSelection.startOffset, maxOffset);
                const endOffset = Math.min(this.savedSelection.endOffset, maxOffset);

                range.setStart(container.firstChild || container, startOffset);
                range.setEnd(container.firstChild || container, endOffset);
            }

            selection.removeAllRanges();
            selection.addRange(range);
            return true;
        } catch (error) {
            console.warn('Failed to restore selection:', error);
            return false;
        }
    }

    /**
     * Get current selection as text
     */
    getSelectedText(): string {
        const selection = window.getSelection();
        return selection ? selection.toString() : '';
    }

    /**
     * Check if there's an active selection
     */
    hasSelection(): boolean {
        const selection = window.getSelection();
        return selection ? !selection.isCollapsed : false;
    }

    /**
     * Clear selection
     */
    clear(): void {
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
        }
    }

    /**
     * Select all content in container
     */
    selectAll(container: HTMLElement): boolean {
        if (!container) return false;

        try {
            const selection = window.getSelection();
            if (!selection) return false;

            const range = document.createRange();
            range.selectNodeContents(container);

            selection.removeAllRanges();
            selection.addRange(range);
            return true;
        } catch (error) {
            console.warn('Failed to select all:', error);
            return false;
        }
    }

    /**
     * Get selection state info
     */
    getState(): SelectionState | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);
        return {
            startOffset: range.startOffset,
            endOffset: range.endOffset,
            collapsed: range.collapsed,
            rangeCount: selection.rangeCount
        };
    }
}

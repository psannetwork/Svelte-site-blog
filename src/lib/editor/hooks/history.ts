/**
 * Editor History Management Hook
 * Handles undo/redo functionality with memory limits
 */

export interface HistoryEntry {
    html: string;
    timestamp: number;
    size: number;
}

export interface HistoryOptions {
    maxSize: number;
    maxEntries: number;
    debounceMs: number;
}

const DEFAULT_OPTIONS: HistoryOptions = {
    maxSize: 1024 * 1024, // 1MB per entry
    maxEntries: 50,       // Maximum 50 entries
    debounceMs: 300       // Debounce time in ms
};

export class HistoryManager {
    private history: HistoryEntry[] = [];
    private currentIndex: number = -1;
    private options: HistoryOptions;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingChange: string | null = null;

    constructor(options: Partial<HistoryOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Add a new state to history
     */
    push(html: string, immediate: boolean = false): void {
        const size = new Blob([html]).size;
        
        // Skip if exceeds max size
        if (size > this.options.maxSize) {
            console.warn('History entry exceeds maximum size, skipping');
            return;
        }

        const entry: HistoryEntry = {
            html,
            timestamp: Date.now(),
            size
        };

        if (immediate) {
            this.addToHistory(entry);
        } else {
            // Debounce rapid changes
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            this.pendingChange = html;
            this.debounceTimer = setTimeout(() => {
                if (this.pendingChange) {
                    this.addToHistory({
                        html: this.pendingChange!,
                        timestamp: Date.now(),
                        size: new Blob([this.pendingChange!]).size
                    });
                    this.pendingChange = null;
                }
            }, this.options.debounceMs);
        }
    }

    private addToHistory(entry: HistoryEntry): void {
        // Remove future history if we're not at the end
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Add new entry
        this.history.push(entry);
        this.currentIndex = this.history.length - 1;

        // Enforce max entries limit (remove oldest)
        while (this.history.length > this.options.maxEntries) {
            this.history.shift();
            this.currentIndex--;
        }
    }

    /**
     * Undo to previous state
     */
    undo(): string | null {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.history[this.currentIndex].html;
        }
        return null;
    }

    /**
     * Redo to next state
     */
    redo(): string | null {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            return this.history[this.currentIndex].html;
        }
        return null;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.currentIndex > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Get current state
     */
    getCurrent(): string | null {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return this.history[this.currentIndex].html;
        }
        return null;
    }

    /**
     * Clear history
     */
    clear(): void {
        this.history = [];
        this.currentIndex = -1;
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.pendingChange = null;
    }

    /**
     * Get history stats
     */
    getStats(): { count: number; totalSize: number; currentIndex: number } {
        return {
            count: this.history.length,
            totalSize: this.history.reduce((sum, entry) => sum + entry.size, 0),
            currentIndex: this.currentIndex
        };
    }
}

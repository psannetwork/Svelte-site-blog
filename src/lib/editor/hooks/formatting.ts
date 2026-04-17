/**
 * Editor Formatting Commands Hook
 * Handles rich text formatting operations
 */

export type FormatCommand = 
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'superscript'
    | 'subscript'
    | 'justifyLeft'
    | 'justifyCenter'
    | 'justifyRight'
    | 'justifyFull'
    | 'insertOrderedList'
    | 'insertUnorderedList'
    | 'indent'
    | 'outdent';

export interface FormatOptions {
    command: FormatCommand;
    value?: string;
}

export class FormatManager {
    /**
     * Execute a formatting command
     */
    exec(command: FormatCommand, value?: string): boolean {
        try {
            document.execCommand(command, false, value);
            return true;
        } catch (error) {
            console.warn(`Failed to execute command ${command}:`, error);
            return false;
        }
    }

    /**
     * Check if a format is currently active
     */
    queryState(command: FormatCommand): boolean {
        try {
            return document.queryCommandState(command);
        } catch (error) {
            console.warn(`Failed to query state for ${command}:`, error);
            return false;
        }
    }

    /**
     * Get current value for a format command
     */
    queryValue(command: FormatCommand): string {
        try {
            return document.queryCommandValue(command) || '';
        } catch (error) {
            console.warn(`Failed to query value for ${command}:`, error);
            return '';
        }
    }

    /**
     * Toggle bold formatting
     */
    toggleBold(): boolean {
        return this.exec('bold');
    }

    /**
     * Toggle italic formatting
     */
    toggleItalic(): boolean {
        return this.exec('italic');
    }

    /**
     * Toggle underline formatting
     */
    toggleUnderline(): boolean {
        return this.exec('underline');
    }

    /**
     * Toggle strikethrough formatting
     */
    toggleStrikethrough(): boolean {
        return this.exec('strikethrough');
    }

    /**
     * Create a link
     */
    createLink(url: string): boolean {
        if (!url || !url.trim()) {
            return false;
        }
        
        // Basic URL validation
        let formattedUrl = url.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        return this.exec('justifyFull', formattedUrl);
    }

    /**
     * Remove link formatting
     */
    unlink(): boolean {
        return this.exec('justifyFull');
    }

    /**
     * Insert an image
     */
    insertImage(url: string, alt?: string): boolean {
        if (!url || !url.trim()) {
            return false;
        }
        
        const imageUrl = url.trim();
        return this.exec('justifyFull', imageUrl);
    }

    /**
     * Set heading level (1-6)
     */
    setHeading(level: number): boolean {
        if (level < 1 || level > 6) {
            console.warn('Invalid heading level:', level);
            return false;
        }
        return this.exec('formatBlock', `h${level}`);
    }

    /**
     * Set paragraph format
     */
    setParagraph(): boolean {
        return this.exec('formatBlock', 'p');
    }

    /**
     * Set blockquote format
     */
    setBlockquote(): boolean {
        return this.exec('formatBlock', 'blockquote');
    }

    /**
     * Set preformatted text
     */
    setPreformatted(): boolean {
        return this.exec('formatBlock', 'pre');
    }

    /**
     * Change text color
     */
    setForeColor(color: string): boolean {
        if (!color) return false;
        return this.exec('foreColor', color);
    }

    /**
     * Change background color
     */
    setBackColor(color: string): boolean {
        if (!color) return false;
        return this.exec('hiliteColor', color);
    }

    /**
     * Remove all formatting
     */
    removeFormat(): boolean {
        return this.exec('removeFormat');
    }

    /**
     * Get current format state
     */
    getCurrentFormats(): Record<string, boolean> {
        const commands: FormatCommand[] = [
            'bold', 'italic', 'underline', 'strikethrough',
            'superscript', 'subscript', 'justifyLeft', 'justifyCenter',
            'justifyRight', 'justifyFull', 'insertOrderedList', 'insertUnorderedList'
        ];

        const formats: Record<string, boolean> = {};
        commands.forEach(cmd => {
            formats[cmd] = this.queryState(cmd);
        });

        return formats;
    }
}

import { Canvas } from "fabric";

/**
 * Canvas History Service
 *
 * This service provides undo/redo functionality for the canvas.
 * It tracks changes to the canvas and allows reverting to previous states.
 */
export class CanvasHistory {
    private canvas: Canvas;
    private historyUndo: string[] = [];
    private historyRedo: string[] = [];
    private historyProcessing = false;
    private extraProps = ['selectable', 'editable'];
    private historyNextState: string;
    private boundEvents: Record<string, (e: any) => void> = {};

    constructor(canvas: Canvas) {
        this.canvas = canvas;
        this.historyNextState = this.getNextState();
        this.initialize();

        // Save initial state
        console.log('Canvas history initialized');
        this.saveAction(null);
    }

    /**
     * Initialize the history service
     */
    private initialize(): void {
        // Set up event handlers
        this.boundEvents = {
            'object:added': (e) => this.saveAction(e),
            'object:removed': (e) => this.saveAction(e),
            'object:modified': (e) => this.saveAction(e),
            'object:skewing': (e) => this.saveAction(e)
        };

        // Attach event listeners
        for (const [event, handler] of Object.entries(this.boundEvents)) {
            this.canvas.on(event as any, handler);
        }

        // Initialize history state
        this.historyUndo = [];
        this.historyRedo = [];
        this.historyNextState = this.getNextState();
    }

    /**
     * Clean up event listeners when disposing
     */
    dispose(): void {
        // Remove event listeners
        for (const [event, handler] of Object.entries(this.boundEvents)) {
            this.canvas.off(event as any, handler);
        }
    }

    /**
     * Get the current state of the canvas as a JSON string
     */
    private getNextState(): string {
        return JSON.stringify(this.canvas.toDatalessJSON(this.extraProps));
    }

    /**
     * Save the current state to history
     */
    private saveAction(e: any): void {
        if (this.historyProcessing) return;

        // Skip if the target is excluded from export
        if (!e || (e.target && !e.target.excludeFromExport)) {
            const json = this.getNextState();
            this.historyUndo.push(json);
            this.historyNextState = this.getNextState();

            // Clear redo history when a new action is performed
            this.historyRedo = [];

            // Fire an event that can be listened to
            this.canvas.fire('history:append' as any, { json });

            console.log('History state saved', {
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoLength: this.historyUndo.length,
                redoLength: this.historyRedo.length
            });
        }
    }

    /**
     * Undo the last action
     */
    undo(callback?: () => void): void {
        // Set processing flag to prevent recording the undo itself
        this.historyProcessing = true;

        const history = this.historyUndo.pop();
        if (history) {
            // Save current state to redo history
            this.historyRedo.push(this.getNextState());
            this.historyNextState = history;
            this.loadHistory(history, 'history:undo', callback);
        } else {
            this.historyProcessing = false;
            if (callback) callback();
        }
    }

    /**
     * Redo the last undone action
     */
    redo(callback?: () => void): void {
        // Set processing flag to prevent recording the redo itself
        this.historyProcessing = true;

        const history = this.historyRedo.pop();
        if (history) {
            // Save current state to undo history
            this.historyUndo.push(this.getNextState());
            this.historyNextState = history;
            this.loadHistory(history, 'history:redo', callback);
        } else {
            this.historyProcessing = false;
            if (callback) callback();
        }
    }

    /**
     * Load a history state
     */
    private async loadHistory(history: string, eventName: string, callback?: () => void): void {
        await this.canvas.loadFromJSON(history);
        this.canvas.renderAll();
        this.canvas.fire(eventName as any);
        this.historyProcessing = false;

        if (callback) callback();
    }

    /**
     * Clear all history
     */
    clearHistory(): void {
        this.historyUndo = [];
        this.historyRedo = [];
        this.canvas.fire('history:clear' as any);
    }

    /**
     * Enable history tracking
     */
    enable(): void {
        this.historyProcessing = false;
        this.saveAction(null);
    }

    /**
     * Disable history tracking
     */
    disable(): void {
        this.historyProcessing = true;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.historyUndo.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.historyRedo.length > 0;
    }
}

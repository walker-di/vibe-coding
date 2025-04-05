import Phaser from 'phaser';
import type GameScene from '../../scenes/GameScene'; // Use 'type' for Scene import if only used for type hints
import type CardStack from '../CardStack'; // Use 'type' import

// Define possible card types
export type CardType = 'Resource' | 'Character' | 'ProducedContent' | 'Unknown';

export default abstract class BaseCard {
    public id: string; // Unique identifier for this card instance
    public cardName: string;
    public description: string;
    public abstract cardType: CardType; // Must be defined by subclasses

    // Visual representation in Phaser
    // Using 'any' for now, but ideally replace with a specific Container type if you create one
    public phaserGameObject: Phaser.GameObjects.Container | null = null;
    protected scene: GameScene; // Reference to the scene the card is in

    constructor(scene: GameScene, id: string, name: string, description: string) {
        this.scene = scene;
        this.id = id;
        this.cardName = name;
        this.description = description;
    }

    // Abstract method: Subclasses must implement how to create their visuals
    abstract createVisuals(x: number, y: number): Phaser.GameObjects.Container;

    // Method to destroy the visual representation
    public destroyVisuals(): void {
        if (this.phaserGameObject) {
            this.phaserGameObject.destroy();
            this.phaserGameObject = null;
        }
    }

    // --- Common Methods ---

    public setPosition(x: number, y: number): void {
        if (this.phaserGameObject) {
            this.phaserGameObject.setPosition(x, y);
        }
    }

    public getPosition(): { x: number; y: number } {
        if (this.phaserGameObject) {
            return { x: this.phaserGameObject.x, y: this.phaserGameObject.y };
        }
        return { x: 0, y: 0 }; // Default or throw error?
    }

    public setVisible(visible: boolean): void {
        if (this.phaserGameObject) {
            this.phaserGameObject.setVisible(visible);
        }
    }

    public getBounds(): Phaser.Geom.Rectangle | null {
        if (this.phaserGameObject) {
            // Note: getBounds might need adjustment depending on container contents
            return this.phaserGameObject.getBounds();
        }
        return null;
    }

    // --- Stack Interaction Hooks (to be overridden by subclasses if needed) ---

    public onAddedToStack(stack: CardStack): void {
        // Default implementation does nothing
        console.log(`Card ${this.cardName} (${this.id}) added to stack.`);
    }

    public onRemovedFromStack(stack: CardStack): void {
        // Default implementation does nothing
        console.log(`Card ${this.cardName} (${this.id}) removed from stack.`);
    }

    // --- Drag and Drop Setup ---
    // Call this after creating visuals
    protected makeDraggable(): void {
        if (!this.phaserGameObject) return;

        this.phaserGameObject.setInteractive({ useHandCursor: true }); // Make it interactive
        this.scene.input.setDraggable(this.phaserGameObject); // Enable dragging

        // Optional: Visual feedback on drag start/stop
        this.phaserGameObject.on('dragstart', (pointer: Phaser.Input.Pointer) => {
            if (this.phaserGameObject) {
                this.phaserGameObject.setDepth(1); // Bring to top while dragging
                // Maybe add a slight scale or tint
            }
        });

        this.phaserGameObject.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (this.phaserGameObject) {
                this.phaserGameObject.setPosition(dragX, dragY);
            }
        });

        this.phaserGameObject.on('dragend', (pointer: Phaser.Input.Pointer, dropped: boolean) => {
            if (this.phaserGameObject) {
                this.phaserGameObject.setDepth(0); // Reset depth
                // Reset visual changes if any
                if (!dropped) {
                    // Optional: Snap back to original position if not dropped on a valid target
                    // This requires storing the original position on dragstart
                }
            }
        });
    }
}

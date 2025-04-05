import Phaser from 'phaser';
import type BaseCard from './cards/BaseCard'; // Use 'type' import
import type GameState from './GameState'; // Use 'type' import
import type GameScene from '../scenes/GameScene'; // Use 'type' import

export default class CardStack {
    public id: string; // Unique ID for the stack
    public cards: BaseCard[] = []; // Array of cards in the stack
    public phaserContainer: Phaser.GameObjects.Container; // Visual container for the stack
    protected scene: GameScene;

    // Define how much cards overlap visually when stacked
    private static readonly STACK_OFFSET_Y = 30; // Pixels to offset each card vertically

    constructor(scene: GameScene, initialCard: BaseCard) {
        this.scene = scene;
        this.id = `stack-${Phaser.Math.RND.uuid()}`; // Generate a unique ID

        // Ensure initial card has visuals before creating stack container
        if (!initialCard.phaserGameObject) {
            throw new Error(`Cannot create CardStack: Initial card ${initialCard.cardName} has no phaserGameObject.`);
        }

        // Create a container for the stack visuals at the initial card's position
        const initialPos = initialCard.getPosition();
        this.phaserContainer = scene.add.container(initialPos.x, initialPos.y);

        // --- Set size and interaction BEFORE adding children ---
        // Set initial size based on the first card
        const initialWidth = initialCard.phaserGameObject.width;
        const initialHeight = initialCard.phaserGameObject.height;
        this.phaserContainer.setSize(initialWidth, initialHeight);

        // --- Restore Interaction Setup for the container itself ---
        const hitArea = new Phaser.Geom.Rectangle(0, 0, initialWidth, initialHeight);
        this.phaserContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        scene.input.setDraggable(this.phaserContainer); // Make the container draggable
        this.phaserContainer.setData('stackInstance', this); // Link container back to stack instance
        // --- End Interaction Setup ---


        // Add the first card
        this.addCard(initialCard);
        // Explicitly update size/hitArea *after* adding the first card
        this.updateContainerSize();
    }

    public addCard(card: BaseCard): void {
        if (!card.phaserGameObject) {
            console.error(`Card ${card.cardName} has no phaserGameObject! Cannot add to stack.`);
            return;
        }

        // Add card to internal array
        this.cards.push(card);

        // Add card's visual to the stack container
        const newY = (this.cards.length - 1) * CardStack.STACK_OFFSET_Y;
        card.phaserGameObject.setPosition(0, newY); // Position relative to container
        this.phaserContainer.add(card.phaserGameObject); // Add visual to container
        // --- Disable input on the card now that it's in the stack ---
        card.phaserGameObject.disableInteractive();
        // --- End disable input ---

        // Adjust container size
        this.updateContainerSize();

        // Notify the card it was added
        card.onAddedToStack(this);
    }

    public removeCard(): BaseCard | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }
        const card = this.cards.pop();
        if (card && card.phaserGameObject) {
            this.phaserContainer.remove(card.phaserGameObject, false); // false = don't destroy child yet
            card.onRemovedFromStack(this);
            this.updateContainerSize();
        }
        return card;
    }

    public getTopCard(): BaseCard | undefined {
        return this.cards.length > 0 ? this.cards[this.cards.length - 1] : undefined;
    }

    // Helper to get the visual bounds of the top card relative to the scene
    public getTopCardBounds(): Phaser.Geom.Rectangle | null {
         const topCard = this.getTopCard();
         if (topCard && topCard.phaserGameObject) {
             const cardLocalBounds = new Phaser.Geom.Rectangle(
                 topCard.phaserGameObject.x - (topCard.phaserGameObject.width * topCard.phaserGameObject.originX),
                 topCard.phaserGameObject.y - (topCard.phaserGameObject.height * topCard.phaserGameObject.originY),
                 topCard.phaserGameObject.width,
                 topCard.phaserGameObject.height
             );
             Phaser.Geom.Rectangle.Offset(cardLocalBounds, this.phaserContainer.x, this.phaserContainer.y);
             return cardLocalBounds;
         }
         return null;
     }


    public getCardsOfType(type: string): BaseCard[] {
        return this.cards.filter(card => card.cardType === type);
    }

    public containsResourceCombination(resourceTypes: string[]): boolean {
        const stackResourceTypes = this.getCardsOfType('Resource').map(card => (card as any).resourceType);
        return resourceTypes.every(type => stackResourceTypes.includes(type));
    }

    public updateContainerSize(): void {
        if (this.cards.length === 0) {
            this.phaserContainer.setSize(0, 0);
            // Disable interaction if the stack is empty
            this.phaserContainer.disableInteractive();
            return;
        }

        // Ensure the first card's visual exists for dimensions
        const firstCardVisual = this.cards[0]?.phaserGameObject;
        if (!firstCardVisual) {
            console.error(`Stack ${this.id}: Cannot update size, first card has no visual.`);
            this.phaserContainer.setSize(0, 0).disableInteractive();
            return;
        }

        const cardWidth = firstCardVisual.width;
        const cardHeight = firstCardVisual.height;
        const totalHeight = (this.cards.length - 1) * CardStack.STACK_OFFSET_Y + cardHeight;

        // Set the container size
        this.phaserContainer.setSize(cardWidth, totalHeight);

        // Explicitly re-set the interactive hit area every time
        // This ensures interaction is enabled and the hit area matches the size
        const hitArea = new Phaser.Geom.Rectangle(0, 0, cardWidth, totalHeight);
        this.phaserContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        // Ensure it remains draggable (might be redundant if set reliably in constructor, but safer)
        this.scene.input.setDraggable(this.phaserContainer);

        // Optional: Log if input was missing before reset (for debugging)
        // if (!this.phaserContainer.input) {
        //     console.log(`Stack ${this.id}: Re-initialized input during updateContainerSize.`);
        // }
    }

    public triggerAbilities(gameState: GameState): void {
        // Implementation removed for brevity in revert, needs original logic if used
    }

    public splitAtIndex(index: number): BaseCard[] {
        if (index <= 0 || index >= this.cards.length) return [];
        const removedCards = this.cards.splice(index);
        removedCards.forEach(card => {
            if (card.phaserGameObject) {
                this.phaserContainer.remove(card.phaserGameObject, false);
                card.onRemovedFromStack(this);
            }
        });
        this.updateContainerSize();
        return removedCards;
    }

    public destroy(): void {
        this.phaserContainer.destroy();
        this.cards = [];
    }
}

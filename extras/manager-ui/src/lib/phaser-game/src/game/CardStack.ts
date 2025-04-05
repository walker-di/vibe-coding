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
        // REMOVED: Explicitly set origin (default is 0,0)
        // this.phaserContainer.setOrigin(0, 0);

        // --- Set size and interaction BEFORE adding children ---
        // Set initial size based on the first card
        const initialWidth = initialCard.phaserGameObject.width;
        const initialHeight = initialCard.phaserGameObject.height;
        this.phaserContainer.setSize(initialWidth, initialHeight);

        // Make the container interactive for dragging the whole stack
        // Define the hit area explicitly using the calculated size, relative to top-left (0,0) origin
        const hitArea = new Phaser.Geom.Rectangle(0, 0, initialWidth, initialHeight);
        this.phaserContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains); // Use the rectangle for hit detection

        scene.input.setDraggable(this.phaserContainer); // Should work now
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

        // Remove card from its old stack/scene if necessary (logic might be needed elsewhere)

        // Add card to internal array
        this.cards.push(card);

        // Add card's visual to the stack container
        // Calculate position within the stack container
        const newY = (this.cards.length - 1) * CardStack.STACK_OFFSET_Y;
        card.phaserGameObject.setPosition(0, newY); // Position relative to container
        this.phaserContainer.add(card.phaserGameObject); // Add visual to container
        // --- Disable input on the card now that it's in the stack ---
        card.phaserGameObject.disableInteractive();
        // --- End disable input ---

        // Adjust container size (optional, might be needed for interaction bounds)
        this.updateContainerSize();

        // Notify the card it was added
        card.onAddedToStack(this);

        // Trigger ability checks? (Maybe called externally after adding)
        // this.triggerAbilities();
    }

    public removeCard(): BaseCard | undefined {
        if (this.cards.length === 0) {
            return undefined;
        }

        const card = this.cards.pop();
        if (card && card.phaserGameObject) {
            // Remove visual from container
            this.phaserContainer.remove(card.phaserGameObject, false); // false = don't destroy child yet

            // Notify card
            card.onRemovedFromStack(this);

            // Update container size
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
            // Calculate world bounds based on container position and card position/size
            const cardBounds = topCard.phaserGameObject.getBounds(); // Bounds relative to card's origin
            // Adjust for container position and card position within container
            cardBounds.setPosition(
                this.phaserContainer.x - (topCard.phaserGameObject.width * topCard.phaserGameObject.originX) + topCard.phaserGameObject.x,
                this.phaserContainer.y - (topCard.phaserGameObject.height * topCard.phaserGameObject.originY) + topCard.phaserGameObject.y
            );
            return cardBounds;
        }
        return null;
    }

    public getCardsOfType(type: string): BaseCard[] {
        return this.cards.filter(card => card.cardType === type);
    }

    // Example: Check if stack contains specific resource types
    public containsResourceCombination(resourceTypes: string[]): boolean {
        const stackResourceTypes = this.getCardsOfType('Resource').map(card => (card as any).resourceType); // Cast needed until ResourceCard defined
        return resourceTypes.every(type => stackResourceTypes.includes(type));
    }

    // Update the visual size of the container (important for interaction bounds)
    public updateContainerSize(): void { // Changed from private to public
        if (this.cards.length === 0) {
            this.phaserContainer.setSize(0, 0); // Or maybe a default card size?
            return;
        }
        // Assuming all cards have roughly the same width
        const cardWidth = this.cards[0].phaserGameObject?.width ?? 100; // Default width
        const totalHeight = (this.cards.length - 1) * CardStack.STACK_OFFSET_Y + (this.cards[0].phaserGameObject?.height ?? 140); // Default height
        this.phaserContainer.setSize(cardWidth, totalHeight);
        // Update hit area when size changes, relative to top-left (0,0) origin
        if (this.phaserContainer.input?.hitArea instanceof Phaser.Geom.Rectangle) {
             this.phaserContainer.input.hitArea.setTo(0, 0, cardWidth, totalHeight);
        } else {
             // If input was somehow removed or hitArea is not a Rectangle, log error.
             console.warn(`Stack ${this.id} container lost input settings during updateContainerSize.`);
             // Re-apply interactive settings if needed:
             // const hitArea = new Phaser.Geom.Rectangle(0, 0, cardWidth, totalHeight);
             // this.phaserContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        }
    }

    // Method to check and trigger abilities (might be called from GameScene)
    public triggerAbilities(gameState: GameState): void {
        console.log(`Checking abilities for stack ${this.id}`);
        for (const card of this.cards) {
            if ('abilities' in card && Array.isArray((card as any).abilities)) { // Check if card has abilities (needs CharacterCard type)
                for (const ability of (card as any).abilities) {
                    if (ability.checkTrigger({ stack: this, gameState: gameState })) {
                        ability.execute({ stack: this, gameState: gameState });
                        // Potentially break if only one ability can trigger per update?
                    }
                }
            }
        }
    }

    /**
     * Removes cards from the specified index to the top of the stack.
     * Updates the container and returns the removed cards.
     * @param index The index of the first card to remove (inclusive).
     * @returns An array of the removed BaseCard instances, in their original order.
     */
    public splitAtIndex(index: number): BaseCard[] {
        if (index <= 0 || index >= this.cards.length) {
            // Cannot split at the base card (index 0) or beyond the top
            return [];
        }

        const removedCards = this.cards.splice(index); // Removes cards from index to end

        console.log(`Splitting stack ${this.id} at index ${index}. Removed:`, removedCards.map(c => c.cardName));

        // Remove visuals from the container
        removedCards.forEach(card => {
            if (card.phaserGameObject) {
                this.phaserContainer.remove(card.phaserGameObject, false); // Don't destroy yet
                card.onRemovedFromStack(this); // Notify card
            }
        });

        // Update the size of the remaining stack container
        this.updateContainerSize();

        return removedCards;
    }


    public destroy(): void {
        // Remove all cards first (optional, depends if they should be destroyed with stack)
        // We should probably let GameState handle card removal/destruction

        this.phaserContainer.destroy(); // Destroy the visual container
        this.cards = []; // Clear internal array
    }
}

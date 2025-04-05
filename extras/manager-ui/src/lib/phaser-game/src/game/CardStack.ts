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

        // Make the container interactive for dragging the whole stack
        this.phaserContainer.setInteractive(); // Now size is set
        scene.input.setDraggable(this.phaserContainer); // Should work now
        this.phaserContainer.setData('stackInstance', this); // Link container back to stack instance
        // --- End Interaction Setup ---


        // Add the first card (which will also update container size if needed)
        this.addCard(initialCard);
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
        // Note: setSize on container might not automatically adjust hit area, may need custom shape
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

    public destroy(): void {
        // Remove all cards first (optional, depends if they should be destroyed with stack)
        // while(this.removeCard()){}

        this.phaserContainer.destroy(); // Destroy the visual container
        this.cards = []; // Clear internal array
    }
}

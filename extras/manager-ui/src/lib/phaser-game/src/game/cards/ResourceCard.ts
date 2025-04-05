import Phaser from 'phaser';
import BaseCard, { type CardType } from './BaseCard';
import type GameScene from '../../scenes/GameScene';

// Define specific resource types (can be expanded)
export type ResourceType = 'Money' | 'VideoIdea' | 'Thumbnail' | 'EditedVideo' | 'Generic';

export default class ResourceCard extends BaseCard {
    public readonly cardType: CardType = 'Resource';
    public resourceType: ResourceType;
    public quantity: number;

    // Define visual properties (adjust as needed)
    private static readonly CARD_WIDTH = 80;
    private static readonly CARD_HEIGHT = 100;
    private static readonly COLOR = 0x88dd88; // Greenish for resources

    constructor(scene: GameScene, id: string, name: string, description: string, resourceType: ResourceType, quantity: number = 1) {
        super(scene, id, name, description);
        this.resourceType = resourceType;
        this.quantity = quantity;
    }

    // Implement the visual creation for this card type
    createVisuals(x: number, y: number): Phaser.GameObjects.Container {
        // Destroy existing visuals if they exist
        this.destroyVisuals();

        const container = this.scene.add.container(x, y);
        container.setSize(ResourceCard.CARD_WIDTH, ResourceCard.CARD_HEIGHT); // Set container size for interaction

        // Card background
        const background = this.scene.add.rectangle(
            0,
            0,
            ResourceCard.CARD_WIDTH,
            ResourceCard.CARD_HEIGHT,
            ResourceCard.COLOR
        );
        background.setOrigin(0.5, 0.5); // Center the rectangle within the container
        background.setStrokeStyle(2, 0x000000); // Black border

        // Card Name Text
        const nameText = this.scene.add.text(
            0,
            -ResourceCard.CARD_HEIGHT / 2 + 10, // Position near top
            `${this.cardName} (${this.resourceType})`,
            { fontSize: '10px', color: '#000000', wordWrap: { width: ResourceCard.CARD_WIDTH - 10 } }
        );
        nameText.setOrigin(0.5, 0.5);

        // Quantity Text (if applicable)
        const quantityText = this.scene.add.text(
            0,
            ResourceCard.CARD_HEIGHT / 2 - 15, // Position near bottom
            `Qty: ${this.quantity}`,
            { fontSize: '12px', color: '#000000' }
        );
        quantityText.setOrigin(0.5, 0.5);

        // Add elements to container
        container.add([background, nameText, quantityText]);

        // Store reference and make draggable
        this.phaserGameObject = container;
        this.makeDraggable(); // Call the method from BaseCard

        // Associate the BaseCard instance with the Phaser GameObject for easy lookup during interactions
        container.setData('cardInstance', this);

        return container;
    }

    // Override stack interaction hooks if needed
    // public onAddedToStack(stack: CardStack): void { ... }
    // public onRemovedFromStack(stack: CardStack): void { ... }
}

import Phaser from 'phaser';
import BaseCard, { type CardType } from './BaseCard';
import type GameScene from '../../scenes/GameScene';

export default class YouTubeVideoCard extends BaseCard {
    public readonly cardType: CardType = 'ProducedContent';
    public title: string;
    public rating: number; // Example: 0-100 rating based on production quality?

    // Define visual properties
    private static readonly CARD_WIDTH = 80;
    private static readonly CARD_HEIGHT = 100;
    private static readonly COLOR = 0xadd8e6; // Light blue for produced content

    constructor(scene: GameScene, id: string, title: string, description: string, rating: number) {
        super(scene, id, title, description); // Use title for cardName
        this.title = title;
        this.rating = rating;
    }

    // Implement the visual creation for this card type
    createVisuals(x: number, y: number): Phaser.GameObjects.Container {
        this.destroyVisuals();

        const container = this.scene.add.container(x, y);
        container.setSize(YouTubeVideoCard.CARD_WIDTH, YouTubeVideoCard.CARD_HEIGHT);

        // Card background
        const background = this.scene.add.rectangle(
            0,
            0,
            YouTubeVideoCard.CARD_WIDTH,
            YouTubeVideoCard.CARD_HEIGHT,
            YouTubeVideoCard.COLOR
        );
        background.setOrigin(0.5, 0.5);
        background.setStrokeStyle(2, 0x000000); // Black border

        // Card Title Text (using this.title)
        const titleText = this.scene.add.text(
            0,
            -YouTubeVideoCard.CARD_HEIGHT / 2 + 10, // Position near top
            this.title,
            { fontSize: '10px', color: '#000000', wordWrap: { width: YouTubeVideoCard.CARD_WIDTH - 10 } }
        );
        titleText.setOrigin(0.5, 0.5);

        // Rating Text
        const ratingText = this.scene.add.text(
            0,
            YouTubeVideoCard.CARD_HEIGHT / 2 - 15, // Position near bottom
            `Rating: ${this.rating}/100`,
            { fontSize: '12px', color: '#000000' }
        );
        ratingText.setOrigin(0.5, 0.5);

        // Add elements to container
        container.add([background, titleText, ratingText]);

        // Store reference and make draggable (or maybe produced cards aren't draggable?)
        this.phaserGameObject = container;
        // Decide if produced content should be draggable
        // this.makeDraggable();

        // Associate the BaseCard instance with the Phaser GameObject
        container.setData('cardInstance', this);

        return container;
    }
}

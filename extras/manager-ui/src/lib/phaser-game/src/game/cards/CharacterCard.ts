import Phaser from 'phaser';
import BaseCard, { type CardType } from './BaseCard';
import type GameScene from '../../scenes/GameScene';
import type Ability from '../abilities/Ability'; // Import the Ability interface

// Define specific character types
export type CharacterType = 'Worker' | 'Client';

export default class CharacterCard extends BaseCard {
    public readonly cardType: CardType = 'Character';
    public characterType: CharacterType;
    public abilities: Ability[]; // Characters can have multiple abilities

    // Define visual properties
    private static readonly CARD_WIDTH = 80;
    private static readonly CARD_HEIGHT = 100;
    private static readonly COLOR = 0xfff8dc; // Cornsilk (yellowish) for characters

    constructor(scene: GameScene, id: string, name: string, description: string, characterType: CharacterType, abilities: Ability[] = []) {
        super(scene, id, name, description);
        this.characterType = characterType;
        this.abilities = abilities;
    }

    // Implement the visual creation for this card type
    createVisuals(x: number, y: number): Phaser.GameObjects.Container {
        this.destroyVisuals(); // Clean up old visuals

        const container = this.scene.add.container(x, y);
        container.setSize(CharacterCard.CARD_WIDTH, CharacterCard.CARD_HEIGHT);

        // Card background
        const background = this.scene.add.rectangle(
            0,
            0,
            CharacterCard.CARD_WIDTH,
            CharacterCard.CARD_HEIGHT,
            CharacterCard.COLOR
        );
        background.setOrigin(0.5, 0.5);
        background.setStrokeStyle(2, 0x000000); // Black border

        // Card Name Text
        const nameText = this.scene.add.text(
            0,
            -CharacterCard.CARD_HEIGHT / 2 + 10, // Position near top
            `${this.cardName} (${this.characterType})`,
            { fontSize: '10px', color: '#000000', wordWrap: { width: CharacterCard.CARD_WIDTH - 10 } }
        );
        nameText.setOrigin(0.5, 0.5);

        // Abilities Text (simple list for now)
        const abilitiesDesc = this.abilities.map(a => a.name).join(', ');
        const abilitiesText = this.scene.add.text(
            0,
            0, // Position in the middle
            `Abilities: ${abilitiesDesc || 'None'}`,
            { fontSize: '9px', color: '#333333', wordWrap: { width: CharacterCard.CARD_WIDTH - 10 } }
        );
        abilitiesText.setOrigin(0.5, 0.5);

        // Add elements to container
        container.add([background, nameText, abilitiesText]);

        // Store reference and make draggable
        this.phaserGameObject = container;
        this.makeDraggable(); // From BaseCard

        // Associate the BaseCard instance with the Phaser GameObject
        container.setData('cardInstance', this);

        return container;
    }

    // Add a method to add abilities dynamically if needed
    public addAbility(ability: Ability): void {
        this.abilities.push(ability);
        // TODO: Update visuals if necessary
    }
}

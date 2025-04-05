import Phaser from 'phaser';
// Import classes
import GameState from '../game/GameState';
import ResourceCard from '../game/cards/ResourceCard';
import CharacterCard from '../game/cards/CharacterCard';
import ProduceVideoAbility from '../game/abilities/ProduceVideoAbility';
import CardStack from '../game/CardStack'; // Needed for type checks later
import BaseCard from '../game/cards/BaseCard'; // Needed for type checks later

export default class GameScene extends Phaser.Scene {
    private gameState!: GameState; // Use definite assignment assertion

    constructor() {
        super('GameScene');
    }

    preload() {
        // Assets should be loaded in PreloadScene
    }

    create() {
        console.log('GameScene create method called.');
        // Initialize GameState
        this.gameState = new GameState();

        // Add some placeholder text (can be removed later)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const gameText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: 'Game Scene - Ready!',
            style: {
                font: '30px monospace',
                color: '#ffffff' // Use 'fill' instead of 'color'
            }
        });
        gameText.setOrigin(0.5, 0.5);

        // --- Create Initial Cards ---
        console.log("Creating initial cards...");

        // Worker
        const workerAbility = new ProduceVideoAbility();
        const worker = new CharacterCard(this, `worker-${Phaser.Math.RND.uuid()}`, 'Worker', 'Produces content', 'Worker', [workerAbility]);
        worker.createVisuals(100, 100);
        this.gameState.addCard(worker);

        // Resources
        const videoIdea = new ResourceCard(this, `res-${Phaser.Math.RND.uuid()}`, 'Video Idea', 'Concept for a video', 'VideoIdea');
        videoIdea.createVisuals(100, 250);
        this.gameState.addCard(videoIdea);

        const thumbnail = new ResourceCard(this, `res-${Phaser.Math.RND.uuid()}`, 'Thumbnail', 'Clickbait image', 'Thumbnail');
        thumbnail.createVisuals(200, 250);
        this.gameState.addCard(thumbnail);

        const editedVideo = new ResourceCard(this, `res-${Phaser.Math.RND.uuid()}`, 'Edited Video', 'Footage ready for upload', 'EditedVideo');
        editedVideo.createVisuals(300, 250);
        this.gameState.addCard(editedVideo);

        // Money (visual representation might be different, e.g., just text UI)
        const moneyCard = new ResourceCard(this, `res-${Phaser.Math.RND.uuid()}`, 'Money', 'Starting cash', 'Money', this.gameState.getResource('Money'));
        // For now, let's just place it visually too
        moneyCard.createVisuals(100, 400);
        this.gameState.addCard(moneyCard);


        // Setup input listeners
        this.setupDragAndDrop();

    }

    // --- Drag and Drop Handling (Simplified) ---
    setupDragAndDrop(): void {

        this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

            // Check if dragging a stack container OR an individual card container
            const stackInstance = gameObject.getData('stackInstance') as CardStack;
            const cardInstance = gameObject.getData('cardInstance') as BaseCard;

            if (stackInstance) { // Dragging the stack container directly
                console.log(`Start dragging stack container ${stackInstance.id}`);
                gameObject.setData('dragType', 'stack');
                gameObject.setData('startPos', { x: gameObject.x, y: gameObject.y });
                this.children.bringToTop(gameObject);
            } else if (cardInstance) { // Dragging an individual card container
                 // Check if this card is ALREADY in a stack (it shouldn't be interactive if so, but double check)
                 const parentStack = this.gameState.findStackContainingCard(cardInstance.id);
                 if (!parentStack) {
                     console.log('Start dragging individual card:', cardInstance.cardName);
                     gameObject.setData('dragType', 'card');
                     gameObject.setData('startPos', { x: gameObject.x, y: gameObject.y });
                     this.children.bringToTop(gameObject);
                 } else {
                     console.log(`Attempted drag on card ${cardInstance.cardName} which is already in stack ${parentStack.id}. Ignoring.`);
                 }
            }
        });

        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            // Move the gameObject directly (either stack container or individual card container)
             if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

             // Use simplified clamping
             const halfWidth = gameObject.width > 0 ? gameObject.width / 2 : 50;
             const halfHeight = gameObject.height > 0 ? gameObject.height / 2 : 50;
             const clampedX = Phaser.Math.Clamp(dragX, halfWidth, this.cameras.main.width - halfWidth);
             const clampedY = Phaser.Math.Clamp(dragY, halfHeight, this.cameras.main.height - halfHeight);

             gameObject.setPosition(clampedX, clampedY);
        });

        this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

            const dragType = gameObject.getData('dragType');
            const startPos = gameObject.getData('startPos');

            console.log(`Drag end - Type: ${dragType}`);

            if (dragType === 'card') {
                // Handle potential stacking for an individual card drop
                this.handlePotentialStack(gameObject as Phaser.GameObjects.Container);
            } else if (dragType === 'stack') {
                 // Just finished dragging a whole stack
                 if (!dropped && startPos) { // Snap back if not dropped on anything (if drop zones existed)
                     gameObject.setPosition(startPos.x, startPos.y);
                 }
            }
            // REMOVED split/unstack logic from dragend

            // Clear drag data
            gameObject.setData('dragType', null);
            gameObject.setData('startPos', null);
        });
    }

    // Handles dropping an individual card onto another card or stack
    handlePotentialStack(droppedObject: Phaser.GameObjects.Container): void {
        const droppedCard = droppedObject.getData('cardInstance') as BaseCard;
        if (!droppedCard) return;

        let targetFound: BaseCard | CardStack | null = null;
        const droppedBounds = droppedObject.getBounds();

        // Check overlap with other INDIVIDUAL cards (not in stacks)
        for (const card of this.gameState.allCards.values()) {
            if (card === droppedCard || !card.phaserGameObject || this.gameState.findStackContainingCard(card.id)) continue;
            if (Phaser.Geom.Intersects.RectangleToRectangle(droppedBounds, card.phaserGameObject.getBounds())) {
                targetFound = card; break;
            }
        }
        // Check overlap with existing STACKS
        if (!targetFound) {
            for (const stack of this.gameState.cardStacks.values()) {
                // Target the stack container for drops
                if (stack.phaserContainer && stack.phaserContainer !== droppedObject && Phaser.Geom.Intersects.RectangleToRectangle(droppedBounds, stack.phaserContainer.getBounds())) {
                    targetFound = stack; break;
                }
            }
        }

        if (targetFound) {
            console.log(`Dropped ${droppedCard.cardName} onto target`, targetFound);
            if (targetFound instanceof BaseCard) {
                console.log(`Creating new stack with ${targetFound.cardName} and ${droppedCard.cardName}`);
                // Target card's visual is adopted by stack, disable its input
                targetFound.phaserGameObject?.disableInteractive();
                // Dropped card's visual is adopted by stack, disable its input
                droppedObject.disableInteractive();
                const newStack = new CardStack(this, targetFound); // Creates stack container, adds target card
                newStack.addCard(droppedCard); // Adds dropped card (and disables its input)
                this.gameState.addStack(newStack);
                this.checkStackAbilities(newStack);
            } else if (targetFound instanceof CardStack) {
                console.log(`Adding ${droppedCard.cardName} to existing stack ${targetFound.id}`);
                 // Dropped card's visual is adopted by stack, disable its input
                droppedObject.disableInteractive();
                targetFound.addCard(droppedCard); // Adds dropped card (and disables its input)
                this.checkStackAbilities(targetFound);
            }
        } else {
             console.log(`No valid stack target found for ${droppedCard.cardName}, leaving at drop position.`);
        }
    }

    // REMOVED: handleUnstack function (needs different trigger now)
    // REMOVED: handleSplitStack function (needs different trigger now)


    // Helper to check abilities on a stack
    checkStackAbilities(stack: CardStack): void {
        if (!stack) return;
        const workerCard = stack.cards.find(c => c.cardType === 'Character' && (c as CharacterCard).characterType === 'Worker') as CharacterCard;
        if (workerCard && workerCard.abilities) {
            for (const ability of workerCard.abilities) {
                const context = { stack: stack, gameState: this.gameState, card: workerCard };
                if (ability.checkTrigger(context)) {
                    console.log(`Triggering ability '${ability.name}' on stack ${stack.id}`);
                    ability.execute(context);
                    break;
                }
            }
        }
    }

    update(time: number, delta: number) {
        // No drag logic needed here anymore
    }
}

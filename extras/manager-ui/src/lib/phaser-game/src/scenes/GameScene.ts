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

    // --- Drag and Drop Handling with Stack Splitting ---
    setupDragAndDrop(): void {

        this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

            const stackInstance = gameObject.getData('stackInstance') as CardStack; // Is it a stack container?
            const cardInstance = gameObject.getData('cardInstance') as BaseCard; // Is it a card container?

            if (cardInstance) { // Drag started on a CARD's container
                const parentStack = this.gameState.findStackContainingCard(cardInstance.id);

                if (parentStack) { // Card is in a stack - attempt split
                    const cardIndex = parentStack.cards.findIndex(card => card.id === cardInstance.id);

                    // Allow splitting if not the bottom card (index 0)
                    if (cardIndex > 0) {
                        console.log(`Attempting to split stack ${parentStack.id} at card ${cardInstance.cardName} (index ${cardIndex})`);
                        const splitCards = parentStack.splitAtIndex(cardIndex);

                        if (splitCards.length > 0) {
                            // Create the new stack for the split part
                            const newStack = new CardStack(this, splitCards[0]); // Uses the clicked card as the base
                            for (let i = 1; i < splitCards.length; i++) {
                                newStack.addCard(splitCards[i]);
                            }
                            this.gameState.addStack(newStack); // Register the new stack

                            // Position the new stack relative to the pointer click offset
                            const dragOffsetX = pointer.x - gameObject.getBounds().x; // Offset within the original card container
                            const dragOffsetY = pointer.y - gameObject.getBounds().y;
                            // Calculate new stack's top-left based on pointer and offset
                            const newStackX = pointer.x - dragOffsetX;
                            const newStackY = pointer.y - dragOffsetY;
                            newStack.phaserContainer.setPosition(newStackX, newStackY);


                            // Prepare for dragging the NEW stack
                            // Store the new container reference on the *original* dragged object (the card container)
                            gameObject.setData('dragType', 'split-stack');
                            gameObject.setData('newStackContainer', newStack.phaserContainer);
                            gameObject.setData('startPos', { x: newStack.phaserContainer.x, y: newStack.phaserContainer.y }); // Store new stack's start pos

                            this.children.bringToTop(newStack.phaserContainer); // Bring new stack visuals to top

                            // Hide the original card container that triggered the drag, as its visual is now in the new stack
                            gameObject.setVisible(false);

                            console.log(`Split successful. Created new stack ${newStack.id}. Dragging new stack.`);

                        } else {
                            console.log(`Splitting stack ${parentStack.id} failed.`);
                            // Prevent drag if split failed? For now, do nothing.
                        }

                    } else {
                        // Drag started on the bottom card (index 0)
                        // For simplicity, ignore drags starting on the bottom card of a stack for now.
                        console.log(`Drag started on bottom card ${cardInstance.cardName} of stack ${parentStack.id}. Ignoring drag.`);
                        // We need to prevent the drag operation from continuing for this gameObject
                        // Setting dragType to null might work, or we might need a more robust way.
                        gameObject.setData('dragType', null); // Try preventing drag continuation
                    }

                } else { // Card is NOT in a stack - drag individual card (original logic)
                    console.log('Start dragging individual card:', cardInstance.cardName);
                    gameObject.setData('dragType', 'card');
                    gameObject.setData('startPos', { x: gameObject.x, y: gameObject.y });
                    this.children.bringToTop(gameObject);
                }

            } else if (stackInstance) { // Drag started directly on a STACK container (original logic)
                console.log(`Start dragging stack container ${stackInstance.id}`);
                gameObject.setData('dragType', 'stack');
                gameObject.setData('startPos', { x: gameObject.x, y: gameObject.y });
                this.children.bringToTop(gameObject);
            }
        });

        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            // The gameObject here is the one drag STARTED on (could be original card container)
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

            const dragType = gameObject.getData('dragType');
            let containerToMove: Phaser.GameObjects.Container | null = null;

            if (dragType === 'split-stack') {
                // We are dragging a newly split stack, move its container
                containerToMove = gameObject.getData('newStackContainer') as Phaser.GameObjects.Container;
            } else if (dragType === 'stack' || dragType === 'card') {
                // We are dragging the original stack container or an individual card container
                containerToMove = gameObject;
            }

            if (containerToMove) {
                // Use simplified clamping - apply to the container being moved
                const halfWidth = containerToMove.width > 0 ? containerToMove.width / 2 : 50;
                const halfHeight = containerToMove.height > 0 ? containerToMove.height / 2 : 50;
                // dragX/dragY are the pointer coordinates, which is what setPosition expects
                const clampedX = Phaser.Math.Clamp(dragX, halfWidth, this.cameras.main.width - halfWidth);
                const clampedY = Phaser.Math.Clamp(dragY, halfHeight, this.cameras.main.height - halfHeight);

                containerToMove.setPosition(clampedX, clampedY);
            }
        });

        this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
            // The gameObject here is the one drag STARTED on
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

            const dragType = gameObject.getData('dragType');
            const startPos = gameObject.getData('startPos'); // May refer to original card or original stack pos
            const newStackContainer = gameObject.getData('newStackContainer') as Phaser.GameObjects.Container;

            console.log(`Drag end - Type: ${dragType}`);

            if (dragType === 'card') {
                // Handle potential stacking for an individual card drop
                // The handlePotentialStack function needs the card's container (gameObject)
                this.handlePotentialStack(gameObject); // Pass the original card container
                // Ensure visibility is restored if it wasn't stacked
                 const cardInstance = gameObject.getData('cardInstance') as BaseCard;
                 if (cardInstance && !this.gameState.findStackContainingCard(cardInstance.id)) {
                    gameObject.setVisible(true);
                 }


            } else if (dragType === 'stack') {
                 // Just finished dragging a whole stack
                 console.log(`Finished dragging stack ${gameObject.getData('stackInstance')?.id}`);
                 // Future: Handle dropping stack onto something

            } else if (dragType === 'split-stack' && newStackContainer) {
                // Just finished dragging a newly split stack
                const newStackInstance = newStackContainer.getData('stackInstance') as CardStack;
                console.log(`Finished dragging split stack ${newStackInstance?.id}`);
                // Future: Handle dropping this new stack onto something

                // The original card container (gameObject) that initiated the drag is now obsolete
                // Its visual representation is managed by the newStackContainer. Destroy the original.
                gameObject.destroy();

            } else if (dragType === null) {
                 console.log('Drag end for ignored drag (e.g., bottom card)');
                 // Ensure original card container is visible if it exists and wasn't destroyed
                 if (gameObject.active) { // Check if not destroyed
                    gameObject.setVisible(true);
                 }
            }


            // Clear drag data from the object that *initiated* the drag
            // Check if gameObject still exists before clearing data
             if (gameObject.active) {
                gameObject.setData('dragType', null);
                gameObject.setData('startPos', null);
                gameObject.setData('newStackContainer', null);
             }


            // Also clear data from the new stack container if it exists and wasn't destroyed
            if (newStackContainer && newStackContainer.active) {
                 newStackContainer.setData('dragType', null); // Should not have drag data anyway
                 newStackContainer.setData('startPos', null);
            }
        });
    }

    // Handles dropping an individual card OR a newly split stack onto another card or stack
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
                // Let addCard handle disabling droppedObject input
                const newStack = new CardStack(this, targetFound); // Creates stack container, adds target card
                newStack.addCard(droppedCard); // Adds dropped card (and disables its input)
                this.gameState.addStack(newStack);
                this.checkStackAbilities(newStack);
                 // Destroy the original individual container of the dropped card
                 // droppedObject.destroy(); // Cline: Commented out to prevent potential visual issues
            } else if (targetFound instanceof CardStack) {
                console.log(`Adding ${droppedCard.cardName} to existing stack ${targetFound.id}`);
                 // Let addCard handle disabling droppedObject input
                targetFound.addCard(droppedCard); // Adds dropped card (and disables its input)
                this.checkStackAbilities(targetFound);
                 // Destroy the original individual container of the dropped card
                 // droppedObject.destroy(); // Cline: Commented out to prevent potential visual issues
            }
        } else {
             console.log(`No valid stack target found for ${droppedCard.cardName}, leaving at drop position.`);
             // Re-enable input if not stacked? No, BaseCard handles its own input setup.
        }
    }

    // REMOVED: handleUnstack function
    // REMOVED: handleSplitStack function


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

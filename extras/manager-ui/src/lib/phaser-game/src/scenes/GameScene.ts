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

    // --- Drag and Drop Handling ---
    setupDragAndDrop(): void {

        this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return; // Only handle containers

            const stackInstance = gameObject.getData('stackInstance') as CardStack;
            const cardInstance = gameObject.getData('cardInstance') as BaseCard;
            const startPos = { x: gameObject.x, y: gameObject.y };
            gameObject.setData('startPos', startPos);

            if (stackInstance) {
                // Dragging a stack container
                const topCardBounds = stackInstance.getTopCardBounds();
                // Check if the pointer started on the top card of the stack
                if (stackInstance.cards.length > 1 && topCardBounds && Phaser.Geom.Rectangle.Contains(topCardBounds, pointer.worldX, pointer.worldY)) {
                    // --- Start Unstack Drag ---
                    console.log('Start dragging top card from stack:', stackInstance.getTopCard()?.cardName);
                    gameObject.setData('dragType', 'unstack');
                    // Temporarily disable dragging on the main stack container?
                    // stackInstance.phaserContainer.disableInteractive(); // Re-enable on dragend
                } else {
                    // --- Start Stack Drag ---
                    console.log('Start dragging whole stack:', stackInstance.id);
                    gameObject.setData('dragType', 'stack');
                    this.children.bringToTop(gameObject);
                }
            } else if (cardInstance) {
                // --- Start Individual Card Drag ---
                console.log('Start dragging individual card:', cardInstance.cardName);
                gameObject.setData('dragType', 'card');
                this.children.bringToTop(gameObject);
            }
        });

        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

            // Clamp drag position within screen bounds
            const halfWidth = gameObject.width / 2;
            const halfHeight = gameObject.height / 2;
            const clampedX = Phaser.Math.Clamp(dragX, halfWidth, this.cameras.main.width - halfWidth);
            const clampedY = Phaser.Math.Clamp(dragY, halfHeight, this.cameras.main.height - halfHeight);

            gameObject.setPosition(clampedX, clampedY);

            // Note: The 'unstack' dragType logic was previously just moving the whole stack visually.
            // This clamping applies to all drag types ('card', 'stack', 'unstack' visual movement).
            // The actual unstack logic still happens on dragend.
        });

        this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
            // This is the start of the CORRECT dragend handler
            if (!(gameObject instanceof Phaser.GameObjects.Container)) return;

            const dragType = gameObject.getData('dragType');
            const startPos = gameObject.getData('startPos');

            console.log(`Drag end - Type: ${dragType}`);

            if (dragType === 'unstack') {
                this.handleUnstack(pointer, gameObject as Phaser.GameObjects.Container);
                // Re-enable stack container interaction if disabled
                // gameObject.setInteractive();
            } else if (dragType === 'card') {
                // Handle potential stacking for an individual card drop
                this.handlePotentialStack(gameObject as Phaser.GameObjects.Container);
            } else if (dragType === 'stack') {
                // Just finished dragging a whole stack, no stacking logic needed here
                // Snap back if necessary (e.g., if dropped out of bounds)
                 if (!dropped && startPos) { // Example: snap back if not dropped on anything specific
                     gameObject.setPosition(startPos.x, startPos.y);
                 }
            }

            // Clear drag data
            gameObject.setData('dragType', null);
            gameObject.setData('startPos', null);
        });
    }

    // Handles dropping an individual card onto another card or stack
    handlePotentialStack(droppedObject: Phaser.GameObjects.Container): void {
        const droppedCard = droppedObject.getData('cardInstance') as BaseCard;
        if (!droppedCard) {
            console.warn("Dropped object has no cardInstance data");
            return;
        }

        let targetFound: BaseCard | CardStack | null = null;
        const droppedBounds = droppedObject.getBounds();

        // Check overlap with other INDIVIDUAL cards (not in stacks)
        for (const card of this.gameState.allCards.values()) {
            // Skip self, cards without visuals, or cards already in a stack
            if (card === droppedCard || !card.phaserGameObject || this.gameState.findStackContainingCard(card.id)) {
                continue;
            }

            if (Phaser.Geom.Intersects.RectangleToRectangle(droppedBounds, card.phaserGameObject.getBounds())) {
                targetFound = card;
                console.log(`Overlap with individual card: ${card.cardName}`);
                break;
            }
        }

        // Check overlap with existing STACKS
        if (!targetFound) {
            for (const stack of this.gameState.cardStacks.values()) {
                // Ensure the stack container itself is interactive and check bounds
                if (stack.phaserContainer && Phaser.Geom.Intersects.RectangleToRectangle(droppedBounds, stack.phaserContainer.getBounds())) {
                    targetFound = stack;
                     console.log(`Overlap with stack: ${stack.id}`);
                    break;
                }
            }
        }


        if (targetFound) {
            console.log(`Dropped ${droppedCard.cardName} onto target`, targetFound);

            // --- Stacking Logic ---
            // Note: We assume the dropped card is currently an individual visual on the scene

            if (targetFound instanceof BaseCard) { // Target is an individual card
                console.log(`Creating new stack with ${targetFound.cardName} and ${droppedCard.cardName}`);

                // Remove individual visuals from the scene's display list
                this.children.remove(targetFound.phaserGameObject!);
                this.children.remove(droppedObject);

                // Create the stack, which adds its own container to the scene
                const newStack = new CardStack(this, targetFound); // Stack starts with the target card
                newStack.addCard(droppedCard); // Add the dropped card
                this.gameState.addStack(newStack); // Add stack to game state
                this.checkStackAbilities(newStack); // Check abilities

            } else if (targetFound instanceof CardStack) { // Target is an existing stack
                console.log(`Adding ${droppedCard.cardName} to existing stack ${targetFound.id}`);

                // Remove the dropped card's individual visual from the scene
                this.children.remove(droppedObject);

                // Add card to the stack instance (which handles adding visual to stack container)
                targetFound.addCard(droppedCard);
                this.checkStackAbilities(targetFound); // Check abilities
            }

        } else {
             // No target found, leave the card at its current (clamped) position.
             console.log(`No valid stack target found for ${droppedCard.cardName}, leaving at drop position.`);
             // No snapping back needed: droppedObject.setPosition(startPos.x, startPos.y);
        }
    }

    // Handles logic when unstacking (dragging top card off a stack)
    handleUnstack(pointer: Phaser.Input.Pointer, stackContainer: Phaser.GameObjects.Container): void {
        const stack = stackContainer.getData('stackInstance') as CardStack;
        const startPos = stackContainer.getData('startPos'); // Original position of the stack container

        if (!stack || stack.cards.length <= 1) {
             console.log("Cannot unstack - stack not found or has only one card.");
             if(startPos) stackContainer.setPosition(startPos.x, startPos.y); // Snap stack back
             return; // Cannot unstack if only one card left
        }

        // Define a threshold - how far away must the card be dragged to unstack?
        const unstackThreshold = 100; // Pixels
        const distance = Phaser.Math.Distance.Between(stackContainer.x, stackContainer.y, startPos.x, startPos.y);

        if (distance > unstackThreshold) {
            // --- Execute Unstack ---
            console.log(`Unstacking top card from ${stack.id}`);
            const topCard = stack.removeCard(); // Removes from stack array and stack container visuals

            if (topCard) {
                // Recreate the individual card visual at the drop position
                topCard.createVisuals(stackContainer.x, stackContainer.y); // Use final drag position
                // Ensure it's added back to the main scene's display list
                // (createVisuals should handle adding to scene via this.scene.add)

                console.log(`Unstacked ${topCard.cardName}`);

                // If stack becomes empty after removal, destroy it
                if (stack.cards.length === 0) {
                    console.log(`Stack ${stack.id} is now empty, removing.`);
                    this.gameState.removeStack(stack.id); // This should call stack.destroy()
                } else {
                     // If stack still has cards, snap the stack container back to its original position
                     if(startPos) stackContainer.setPosition(startPos.x, startPos.y);
                }

            } else {
                 console.error("Failed to get top card during unstack.");
                 if(startPos) stackContainer.setPosition(startPos.x, startPos.y); // Snap stack back
            }
        } else {
            // Didn't drag far enough, snap stack back
            console.log("Drag distance too short, snapping stack back.");
            if(startPos) stackContainer.setPosition(startPos.x, startPos.y);
        }
    }


    // Helper to check abilities on a stack
    checkStackAbilities(stack: CardStack): void {
        if (!stack) return;
        // Find the card with the ability (e.g., the Worker)
        const workerCard = stack.cards.find(c => c.cardType === 'Character' && (c as CharacterCard).characterType === 'Worker') as CharacterCard;
        if (workerCard && workerCard.abilities) {
            for (const ability of workerCard.abilities) {
                // Pass the worker card itself as part of the context if needed by the ability
                const context = { stack: stack, gameState: this.gameState, card: workerCard };
                if (ability.checkTrigger(context)) {
                    console.log(`Triggering ability '${ability.name}' on stack ${stack.id}`);
                    ability.execute(context);
                    // Potentially break if only one ability triggers per interaction?
                    break;
                }
            }
        }
    }

    update(time: number, delta: number) {
        // Main game loop - runs continuously
        // Check timers (Phaser's time events handle themselves)
        // Update card states, UI elements etc.

        // Example: Update money display (needs a UI text element)
        // this.moneyText.setText(`Money: ${this.gameState.getResource('Money')}`);
        // Main game loop - runs continuously
        // Check timers, update card states, etc.
    }
}

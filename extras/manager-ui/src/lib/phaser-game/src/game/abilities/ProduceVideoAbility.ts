import type Ability from './Ability';
import type { AbilityContext } from './Ability';
import type CardStack from '../CardStack';
import type GameState from '../GameState';
import type CharacterCard from '../cards/CharacterCard';
import type ResourceCard from '../cards/ResourceCard'; // Separate default import
import type { ResourceType } from '../cards/ResourceCard'; // Separate named import
// Import YouTubeVideoCard
import YouTubeVideoCard from '../cards/YouTubeVideoCard'; // Uncommented
import Phaser from 'phaser'; // Needed for TimerEvent
import type GameScene from '../../scenes/GameScene'; // Need GameScene type for casting scene

export default class ProduceVideoAbility implements Ability {
    public name = 'Produce YouTube Video';
    public description = 'Combines Video Idea, Thumbnail, and Edited Video with a Worker to produce a YouTube Video.';

    // Define required resources with the correct type
    private requiredResources: ResourceType[] = ['VideoIdea', 'Thumbnail', 'EditedVideo'];
    private productionTime: number = 5000; // Milliseconds (5 seconds)

    checkTrigger(context: AbilityContext): boolean {
        const { stack, gameState } = context;

        if (!stack || !gameState) {
            return false; // Needs a stack and game state
        }

        // 1. Check if stack contains a 'Worker' CharacterCard
        const worker = stack.cards.find(card => card.cardType === 'Character' && (card as CharacterCard).characterType === 'Worker');
        if (!worker) {
            return false;
        }

        // 2. Check if stack contains all required ResourceCards
        const resourceCards = stack.getCardsOfType('Resource') as ResourceCard[];
        const availableResourceTypes = resourceCards.map(card => card.resourceType);

        const hasAllResources = this.requiredResources.every(reqType =>
            availableResourceTypes.includes(reqType)
        );

        return hasAllResources;
    }

    execute(context: AbilityContext): void {
        const { stack, gameState, card } = context; // 'card' here would be the Worker card triggering this

        if (!stack || !gameState || !card || card.cardType !== 'Character') {
            console.error('Invalid context for ProduceVideoAbility execute.');
            return;
        }

        console.log(`Executing ProduceVideoAbility on stack ${stack.id} triggered by ${card.cardName}`);

        // --- Consume Resources ---
        const consumedCardIds: string[] = [];
        this.requiredResources.forEach(resType => {
            const resourceCardIndex = stack.cards.findIndex(c => c.cardType === 'Resource' && (c as ResourceCard).resourceType === resType);
            if (resourceCardIndex > -1) {
                const consumedCard = stack.cards[resourceCardIndex];
                consumedCardIds.push(consumedCard.id);
                // Remove card from stack visually and logically (this might need refinement in CardStack)
                // For now, let's just mark them for removal after production
                console.log(`Marking ${consumedCard.cardName} for consumption.`);
            } else {
                console.error(`Required resource ${resType} not found in stack during execution! Should not happen if checkTrigger worked.`);
                return; // Stop execution if a resource is missing unexpectedly
            }
        });

        // Disable interaction on the stack during production?
        // stack.phaserContainer.disableInteractive(); // Or just the worker?

        // --- Start Timer ---
        const scene = (card as CharacterCard).phaserGameObject?.scene; // Get scene reference
        if (!scene) {
            console.error("Cannot get scene reference from worker card.");
            return;
        }

        console.log(`Starting video production timer (${this.productionTime}ms)...`);
        scene.time.delayedCall(this.productionTime, () => {
            console.log('Video production timer finished!');

            // --- Remove Consumed Cards ---
            consumedCardIds.forEach(id => {
                const cardToRemove = stack.cards.find(c => c.id === id);
                if (cardToRemove && cardToRemove.phaserGameObject) { // Add null check here
                    // Proper removal needs careful handling: remove from stack.cards, destroy visuals, remove from gameState.allCards
                    console.log(`Actually consuming ${cardToRemove.cardName}`);
                    stack.phaserContainer.remove(cardToRemove.phaserGameObject, true); // Remove and destroy visual
                    stack.cards = stack.cards.filter(c => c.id !== id); // Remove from stack array
                    gameState.removeCard(id); // Remove from global state
                } else if (cardToRemove) {
                    console.warn(`Card ${id} found in stack array but visual missing, removing from state.`);
                    stack.cards = stack.cards.filter(c => c.id !== id); // Remove from stack array
                    gameState.removeCard(id); // Remove from global state
                }
            });
            stack.updateContainerSize(); // Update stack visuals after removal

            // --- Create Produced Card ---
            console.log("Creating YouTubeVideoCard...");
            // Example rating calculation (can be more complex)
            const rating = Phaser.Math.Between(50, 95);
            const videoCard = new YouTubeVideoCard(scene as GameScene, `video-${Phaser.Math.RND.uuid()}`, 'New Video', 'A freshly produced video.', rating);
            // Position the new card slightly offset from the stack's origin
            const cardVisuals = videoCard.createVisuals(stack.phaserContainer.x + 10, stack.phaserContainer.y - 40);
            gameState.addCard(videoCard); // Add to game state
            console.log(`Created video card ${videoCard.id} with rating ${rating}`);

            // Re-enable interaction?
            // stack.phaserContainer.setInteractive();

            // Check if stack is now empty or invalid and remove it?
            if (stack.cards.length === 0) {
                 gameState.removeStack(stack.id);
            }

        }, [], this); // Pass scope if needed
    }
}

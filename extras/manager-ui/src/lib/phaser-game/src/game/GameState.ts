import type BaseCard from './cards/BaseCard';
import type CardStack from './CardStack';

export default class GameState {
    // Example: Using a Map for resources like Money
    public playerResources: Map<string, number>;
    // Keep track of all cards currently in the game, mapped by their ID
    public allCards: Map<string, BaseCard>;
    // Keep track of all active stacks on the board
    public cardStacks: Map<string, CardStack>; // Use Map for easy lookup/removal by ID

    // Potentially track active timers for productions, etc.
    // public activeTimers: Map<string, Phaser.Time.TimerEvent>;

    constructor() {
        this.playerResources = new Map<string, number>();
        this.allCards = new Map<string, BaseCard>();
        this.cardStacks = new Map<string, CardStack>();
        // this.activeTimers = new Map<string, Phaser.Time.TimerEvent>();

        // Initialize default resources (e.g., starting money)
        this.playerResources.set('Money', 10); // Example starting money
    }

    // --- Resource Management ---

    public getResource(type: string): number {
        return this.playerResources.get(type) ?? 0;
    }

    public updateResource(type: string, amount: number): void {
        const currentAmount = this.getResource(type);
        this.playerResources.set(type, currentAmount + amount);
        console.log(`Resource ${type} updated to: ${this.getResource(type)}`);
        // TODO: Add event emitter to notify UI of changes
    }

    public canAfford(cost: Map<string, number>): boolean {
        for (const [resourceType, amount] of cost.entries()) {
            if (this.getResource(resourceType) < amount) {
                return false;
            }
        }
        return true;
    }

    // --- Card Management ---

    public addCard(card: BaseCard): void {
        if (this.allCards.has(card.id)) {
            console.warn(`Card with ID ${card.id} already exists in game state.`);
            return;
        }
        this.allCards.set(card.id, card);
        console.log(`Card ${card.cardName} (${card.id}) added to game state.`);
    }

    public removeCard(cardId: string): void {
        const card = this.allCards.get(cardId);
        if (card) {
            card.destroyVisuals(); // Ensure Phaser object is destroyed
            this.allCards.delete(cardId);
            console.log(`Card ${card.cardName} (${cardId}) removed from game state.`);
        }
    }

    public findCardById(cardId: string): BaseCard | undefined {
        return this.allCards.get(cardId);
    }

    // --- Stack Management ---

    public addStack(stack: CardStack): void {
        if (this.cardStacks.has(stack.id)) {
            console.warn(`Stack with ID ${stack.id} already exists.`);
            return;
        }
        this.cardStacks.set(stack.id, stack);
        console.log(`Stack ${stack.id} added to game state.`);
    }

    public removeStack(stackId: string): void {
        const stack = this.cardStacks.get(stackId);
        if (stack) {
            stack.destroy(); // Ensure stack container and cards are handled
            this.cardStacks.delete(stackId);
            console.log(`Stack ${stackId} removed from game state.`);
        }
    }

    public findStackById(stackId: string): CardStack | undefined {
        return this.cardStacks.get(stackId);
    }

    // --- Utility ---

    // Find the stack that contains a specific card ID
    public findStackContainingCard(cardId: string): CardStack | undefined {
        for (const stack of this.cardStacks.values()) {
            if (stack.cards.some(card => card.id === cardId)) {
                return stack;
            }
        }
        return undefined;
    }
}

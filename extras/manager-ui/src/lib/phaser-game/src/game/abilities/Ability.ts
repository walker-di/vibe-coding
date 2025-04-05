import type CardStack from '../CardStack';
import type GameState from '../GameState';
import type BaseCard from '../cards/BaseCard';

// Context object passed to ability methods
export interface AbilityContext {
    stack?: CardStack;      // The stack the ability might be operating on
    card?: BaseCard;        // The card triggering the ability (if not stack-based)
    gameState: GameState;   // Access to the overall game state
    // Add other relevant context if needed, e.g., pointer position, target object
}

export default interface Ability {
    name: string; // Human-readable name for the ability
    description: string; // Description of what it does

    /**
     * Checks if the conditions are met for this ability to trigger.
     * @param context - The current game context.
     * @returns True if the ability can be executed, false otherwise.
     */
    checkTrigger(context: AbilityContext): boolean;

    /**
     * Executes the ability's action.
     * Should only be called after checkTrigger returns true.
     * @param context - The current game context.
     */
    execute(context: AbilityContext): void;
}

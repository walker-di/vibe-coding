import Phaser from 'phaser';
// Import scenes
import PreloadScene from './scenes/PreloadScene';
import GameScene from './scenes/GameScene';
// import SelectScene from './scenes/SelectScene'; // If we add this later

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO, // Automatically choose WebGL or Canvas
    width: 800, // Game width in pixels
    height: 600, // Game height in pixels
    parent: 'phaser-container', // ID of the DOM element to inject the canvas into
    backgroundColor: '#2d2d2d', // A dark grey background
    physics: {
        default: 'arcade', // Using Arcade Physics for simplicity if needed later
        arcade: {
            gravity: { x: 0, y: 0 }, // No gravity needed for a card game
            debug: false // Set to true for physics debugging visuals
        }
    },
    scene: [
        // Add scenes here in the order they should load/run
        PreloadScene,
        // SelectScene, // Optional: Add if needed
        GameScene
    ]
};

// Function to launch the game
const launch = (containerId: string) => {
    // Update the parent container ID if provided
    const gameConfig = { ...config, parent: containerId };
    const game = new Phaser.Game(gameConfig);
    return game;
};

// Export the launch function and config if needed elsewhere
export { launch, config };
// Export the Game type for potential use in Svelte
export type { Game } from 'phaser';

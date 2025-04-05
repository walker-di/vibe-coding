import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        // Scene key
        super('PreloadScene');
    }

    preload() {
        // Load assets here
        // Example: this.load.image('card-back', 'assets/images/card-back.png');
        // Example: this.load.image('worker-card', 'assets/images/worker.png');
        console.log('Preloading assets...');

        // For now, we don't have assets, just show a loading message
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                color: '#ffffff' // Use 'fill' instead of 'color'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // Display progress bar (optional but good practice)
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
        });

        this.load.on('complete', () => {
            console.log('Asset loading complete.');
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            this.scene.start('GameScene'); // Start the main game scene
        });

        // --- Add asset loading calls here ---
        // Since we have no assets yet, the 'complete' event will fire immediately.
    }

    create() {
        // This function runs once after preload() completes
        // We are starting the next scene in the 'complete' event handler,
        // so this function might not be strictly necessary for simple transitions.
        console.log('PreloadScene create: Starting GameScene...');
        // Redundant call, but safe: this.scene.start('GameScene');
    }
}

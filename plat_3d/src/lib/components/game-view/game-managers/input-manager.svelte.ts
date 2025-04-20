
export class InputManager {
    constructor() {
      this.keysPressed = {};
      this.keyJustPressed = {};
      // No longer adding event listeners here - using svelte:window instead
    }

    onKeyDown(e) {
      const key = e.key.toLowerCase();
      if (!this.keysPressed[key]) {
        this.keyJustPressed[key] = true;
      }
      this.keysPressed[key] = true;
    }

    onKeyUp(e) {
      this.keysPressed[e.key.toLowerCase()] = false;
    }

    update() {
      // Atualiza o estado de "acabou de pressionar"
      for (const key in this.keyJustPressed) {
        if (this.keyJustPressed[key]) {
          this.keyJustPressed[key] = false;
        }
      }
    }

    isKeyJustPressed(key) {
      return this.keyJustPressed[key.toLowerCase()];
    }
  }
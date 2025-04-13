import { Circle, Rect, Textbox, type Canvas } from "fabric";

type Constructor<T> = new (...args: any[]) => T;

export class CanvasService {
    canvas = $state<Canvas>(undefined as any);
    constructor(lib: Constructor<Canvas>) {
        this.canvas = new lib('canvas', {
            width: 800,
            height: 600,
            backgroundColor: '#f0f0f0',
            renderOnAddRemove: true,
            stateful: true,
            preserveObjectStacking: true // Add this to prevent layer shuffling
        });
    }

}
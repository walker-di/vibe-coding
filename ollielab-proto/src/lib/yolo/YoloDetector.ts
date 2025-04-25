export interface YoloDetection {
    bbox: [number, number, number, number]; // [x, y, width, height]
    class: string;
    confidence: number;
    keypoints?: Array<{
        name: string;
        x: number;
        y: number;
        confidence?: number;
    }>;
}

// Import the ONNX implementation
import { getYoloOnnxDetector } from './YoloOnnxDetector';

export class YoloDetector {
    private modelSize: string;
    private modelLoaded: boolean = false;
    private modelLoading: boolean = false;
    private onnxDetector: ReturnType<typeof getYoloOnnxDetector>;

    constructor(modelSize: string = 'n') {
        this.modelSize = modelSize;
        this.onnxDetector = getYoloOnnxDetector(modelSize);
    }

    public async loadModel(): Promise<boolean> {
        if (this.modelLoaded) {
            return true;
        }

        if (this.modelLoading) {
            // Wait for model to load if already in progress
            return new Promise<boolean>((resolve) => {
                const checkLoaded = setInterval(() => {
                    if (this.modelLoaded) {
                        clearInterval(checkLoaded);
                        resolve(true);
                    }
                }, 100);
            });
        }

        this.modelLoading = true;

        try {
            // Log the model being loaded
            console.log(`Loading YOLO model: yolo11${this.modelSize}-pose.onnx`);

            // Try different model sizes if the current one fails
            const modelSizes = ['n', 's', 'm', 'l', 'x'];
            let success = false;

            // First try the selected model size
            try {
                success = await this.onnxDetector.loadModel();
                if (success) {
                    console.log(`YOLO model ${this.modelSize} loaded successfully`);
                }
            } catch (initialError) {
                console.warn(`Failed to load YOLO model ${this.modelSize}:`, initialError);
            }

            // If the selected model failed, try other sizes
            if (!success) {
                console.log('Trying alternative model sizes...');

                // Try each model size in order of smallest to largest
                for (const size of modelSizes) {
                    // Skip the size we already tried
                    if (size === this.modelSize) continue;

                    try {
                        console.log(`Trying alternative model size: ${size}`);
                        this.modelSize = size;
                        this.onnxDetector.setModelSize(size);
                        success = await this.onnxDetector.loadModel();

                        if (success) {
                            console.log(`Successfully loaded alternative model size: ${size}`);
                            break;
                        }
                    } catch (fallbackError) {
                        console.warn(`Failed to load alternative model ${size}:`, fallbackError);
                    }
                }
            }

            this.modelLoaded = success;
            this.modelLoading = false;

            if (success) {
                console.log('YOLO model loaded successfully');
            } else {
                console.error('Failed to load any YOLO model');
            }

            return success;
        } catch (error) {
            console.error('Failed to load YOLO model:', error);
            this.modelLoading = false;
            return false;
        }
    }

    public isLoaded(): boolean {
        return this.modelLoaded;
    }

    public async detect(imageElement: HTMLImageElement | HTMLVideoElement): Promise<YoloDetection[]> {
        if (!this.modelLoaded) {
            throw new Error('Model not loaded');
        }

        try {
            // Use the ONNX implementation for detection
            return await this.onnxDetector.detect(imageElement);
        } catch (error) {
            console.error('Error during YOLO detection:', error);
            return [];
        }
    }



    public setModelSize(size: string): void {
        if (this.modelSize !== size) {
            this.modelSize = size;
            this.modelLoaded = false;
            this.onnxDetector.setModelSize(size);
        }
    }
}

// Create a singleton instance
let yoloDetector: YoloDetector | null = null;

export function getYoloDetector(modelSize: string = 'n'): YoloDetector {
    // Create a new detector only in browser environment or if it doesn't exist yet
    if (!yoloDetector && typeof window !== 'undefined') {
        yoloDetector = new YoloDetector(modelSize);
    } else if (yoloDetector && yoloDetector.isLoaded()) {
        yoloDetector.setModelSize(modelSize);
    } else if (!yoloDetector) {
        // Create a dummy detector for SSR
        yoloDetector = new YoloDetector(modelSize);
    }
    return yoloDetector;
}

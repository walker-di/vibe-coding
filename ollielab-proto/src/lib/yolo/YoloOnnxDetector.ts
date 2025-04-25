import * as ort from 'onnxruntime-web';
import type { YoloDetection } from './YoloDetector';

// YOLO keypoint names for pose models
const YOLO_KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle"
];

export class YoloOnnxDetector {
    private modelSize: string;
    private modelLoaded: boolean = false;
    private modelLoading: boolean = false;
    private session: ort.InferenceSession | null = null;
    private inputName: string = '';
    private outputNames: string[] = [];
    private inputWidth: number = 640;
    private inputHeight: number = 640;

    constructor(modelSize: string = 'n') {
        this.modelSize = modelSize;

        // Only set ONNX environment variables in browser context
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
            // Use the global ONNX runtime configuration if available
            if (window.ort && typeof window.initOnnxRuntime === 'function') {
                window.initOnnxRuntime();
            } else {
                // Fallback configuration if global init is not available
                console.log('Using fallback ONNX runtime configuration');
                ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
                ort.env.wasm.simd = true;

                // Use CDN for WASM files instead of local files
                ort.env.wasm.wasmPaths = {
                    'ort-wasm.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm.wasm',
                    'ort-wasm-simd.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd.wasm',
                    'ort-wasm-threaded.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-threaded.wasm',
                    'ort-wasm-simd-threaded.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm'
                };
            }
        }
    }

    public async loadModel(): Promise<boolean> {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
            console.log('Not in browser environment, skipping model loading');
            return false;
        }

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
            const modelPath = `/mediapipe/yolo11${this.modelSize}-pose.onnx`;
            console.log(`Loading YOLO model: ${modelPath}`);

            // First check if the model file exists
            try {
                const response = await fetch(modelPath, { method: 'HEAD' });
                if (!response.ok) {
                    console.error(`Model file not found: ${modelPath}. Status: ${response.status}`);
                    throw new Error(`Model file not found: ${modelPath}. Status: ${response.status}`);
                }
                console.log(`Model file exists: ${modelPath}`);
            } catch (fetchError) {
                console.error('Error checking model file:', fetchError);
                throw new Error(`Error checking model file: ${fetchError.message}`);
            }

            // Create ONNX session with the model
            console.log('Creating ONNX session...');
            this.session = await ort.InferenceSession.create(
                modelPath,
                {
                    executionProviders: ['wasm'],
                    graphOptimizationLevel: 'all'
                }
            );

            // Get input and output names
            this.inputName = this.session.inputNames[0];
            this.outputNames = this.session.outputNames;

            console.log(`YOLO model loaded successfully. Input: ${this.inputName}, Outputs: ${this.outputNames.join(', ')}`);

            this.modelLoaded = true;
            this.modelLoading = false;
            return true;
        } catch (error) {
            console.error('Failed to load YOLO model:', error);

            // Try to load a smaller model as fallback
            if (this.modelSize !== 'n') {
                console.log('Trying to load smaller model as fallback...');
                const originalSize = this.modelSize;
                this.modelSize = 'n'; // Use the smallest model as fallback
                try {
                    const success = await this.loadModel();
                    if (success) {
                        console.log(`Successfully loaded fallback model 'n' instead of '${originalSize}'`);
                        return true;
                    }
                } catch (fallbackError) {
                    console.error('Failed to load fallback model:', fallbackError);
                }
                // Restore original model size if fallback failed
                this.modelSize = originalSize;
            }

            this.modelLoading = false;
            return false;
        }
    }

    public isLoaded(): boolean {
        return this.modelLoaded;
    }

    public async detect(imageElement: HTMLImageElement | HTMLVideoElement): Promise<YoloDetection[]> {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
            console.log('Not in browser environment, skipping detection');
            return [];
        }

        if (!this.modelLoaded || !this.session) {
            throw new Error('Model not loaded');
        }

        try {
            // Get image dimensions
            const imageWidth = imageElement.width || imageElement.videoWidth;
            const imageHeight = imageElement.height || imageElement.videoHeight;

            if (!imageWidth || !imageHeight) {
                throw new Error('Invalid image dimensions');
            }

            // Create a canvas to get image data
            const canvas = document.createElement('canvas');
            canvas.width = this.inputWidth;
            canvas.height = this.inputHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Could not get canvas context');
            }

            // Draw the image on the canvas (resized to model input dimensions)
            ctx.drawImage(imageElement, 0, 0, this.inputWidth, this.inputHeight);

            // Get image data
            const imageData = ctx.getImageData(0, 0, this.inputWidth, this.inputHeight);

            // Prepare input tensor (normalize pixel values)
            const input = new Float32Array(this.inputWidth * this.inputHeight * 3);

            // YOLO expects RGB format with values normalized to [0, 1]
            for (let i = 0; i < imageData.data.length / 4; i++) {
                input[i * 3] = imageData.data[i * 4] / 255.0;     // R
                input[i * 3 + 1] = imageData.data[i * 4 + 1] / 255.0; // G
                input[i * 3 + 2] = imageData.data[i * 4 + 2] / 255.0; // B
            }

            // Create tensor
            const inputTensor = new ort.Tensor('float32', input, [1, 3, this.inputHeight, this.inputWidth]);

            // Run inference
            const feeds: Record<string, ort.Tensor> = {};
            feeds[this.inputName] = inputTensor;

            const results = await this.session.run(feeds);

            // Process results
            return this.processResults(results, imageWidth, imageHeight);
        } catch (error) {
            console.error('Error during YOLO detection:', error);
            return [];
        }
    }

    private processResults(results: Record<string, ort.Tensor>, originalWidth: number, originalHeight: number): YoloDetection[] {
        const detections: YoloDetection[] = [];

        try {
            // Get output data
            const output = results[this.outputNames[0]];
            const data = output.data as Float32Array;
            const dimensions = output.dims;

            // YOLO output format: [batch, num_detections, 56]
            // Where 56 = 4 (bbox) + 1 (confidence) + 1 (class) + 17*3 (keypoints: x,y,conf)
            const numDetections = dimensions[1];
            const stride = dimensions[2];

            // Process each detection
            for (let i = 0; i < numDetections; i++) {
                const offset = i * stride;

                // Get confidence score (5th element)
                const confidence = data[offset + 4];

                // Skip low confidence detections
                if (confidence < 0.5) continue;

                // Get class ID and score
                const classId = Math.floor(data[offset + 5]);

                // Only process person class (id 0)
                if (classId !== 0) continue;

                // Get bounding box coordinates (normalized [0-1])
                const x = data[offset];
                const y = data[offset + 1];
                const width = data[offset + 2];
                const height = data[offset + 3];

                // Convert normalized coordinates to pixel coordinates
                const boxX = (x - width / 2) * originalWidth;
                const boxY = (y - height / 2) * originalHeight;
                const boxWidth = width * originalWidth;
                const boxHeight = height * originalHeight;

                // Process keypoints
                const keypoints = [];

                // Keypoints start at offset + 6
                // Each keypoint has 3 values: x, y, confidence
                for (let k = 0; k < 17; k++) {
                    const keypointOffset = offset + 6 + k * 3;
                    const keypointX = data[keypointOffset] * originalWidth;
                    const keypointY = data[keypointOffset + 1] * originalHeight;
                    const keypointConfidence = data[keypointOffset + 2];

                    // Only add keypoints with sufficient confidence
                    if (keypointConfidence > 0.5) {
                        keypoints.push({
                            name: YOLO_KEYPOINT_NAMES[k],
                            x: keypointX,
                            y: keypointY,
                            confidence: keypointConfidence
                        });
                    }
                }

                // Add detection
                detections.push({
                    bbox: [boxX, boxY, boxWidth, boxHeight],
                    class: "person",
                    confidence: confidence,
                    keypoints: keypoints
                });
            }

            console.log(`YOLO: Processed ${numDetections} detections, found ${detections.length} valid detections`);

        } catch (error) {
            console.error('Error processing YOLO results:', error);
        }

        return detections;
    }

    public setModelSize(size: string): void {
        if (this.modelSize !== size) {
            this.modelSize = size;
            this.modelLoaded = false;
            this.session = null;
        }
    }
}

// Create a singleton instance
let yoloOnnxDetector: YoloOnnxDetector | null = null;

export function getYoloOnnxDetector(modelSize: string = 'n'): YoloOnnxDetector {
    if (!yoloOnnxDetector) {
        yoloOnnxDetector = new YoloOnnxDetector(modelSize);
    } else if (yoloOnnxDetector.isLoaded()) {
        yoloOnnxDetector.setModelSize(modelSize);
    }
    return yoloOnnxDetector;
}

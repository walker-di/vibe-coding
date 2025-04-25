// Global type declarations
interface Window {
    ort: any;
    onnxConfig: {
        wasmPaths: Record<string, string>;
        initialized: boolean;
    };
    initOnnxRuntime: () => void;
}

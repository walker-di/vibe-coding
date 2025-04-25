// Custom ONNX Runtime initialization script
// This must be loaded before any other scripts that use ONNX runtime

// Create a global onnxConfig object to store configuration
window.onnxConfig = {
  wasmPaths: {
    'ort-wasm.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm.wasm',
    'ort-wasm-simd.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd.wasm',
    'ort-wasm-threaded.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-threaded.wasm',
    'ort-wasm-simd-threaded.wasm': 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm'
  },
  initialized: false
};

// Function to initialize ONNX runtime
window.initOnnxRuntime = function() {
  if (window.ort && !window.onnxConfig.initialized) {
    console.log('Initializing ONNX Runtime with custom configuration');
    
    // Configure ONNX runtime
    window.ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
    window.ort.env.wasm.simd = true;
    
    // Set WASM paths
    window.ort.env.wasm.wasmPaths = window.onnxConfig.wasmPaths;
    
    // Mark as initialized
    window.onnxConfig.initialized = true;
    console.log('ONNX Runtime initialized with custom configuration');
  }
};

// Load ONNX runtime from CDN
document.addEventListener('DOMContentLoaded', function() {
  console.log('Loading ONNX Runtime from CDN');
  
  // Create script element
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';
  script.async = true;
  
  // Initialize ONNX runtime when script is loaded
  script.onload = function() {
    console.log('ONNX Runtime loaded from CDN');
    window.initOnnxRuntime();
  };
  
  // Add script to head
  document.head.appendChild(script);
});

// Also initialize when window loads (backup)
window.addEventListener('load', function() {
  if (window.ort && !window.onnxConfig.initialized) {
    window.initOnnxRuntime();
  }
});

console.log('ONNX initialization script loaded');

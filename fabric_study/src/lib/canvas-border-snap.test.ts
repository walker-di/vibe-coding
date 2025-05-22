import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initCanvasBorderSnap } from './canvas-border-snap';
import type { Canvas, FabricObject, TPointerEvent } from 'fabric';
import type { BasicTransformEvent } from 'fabric';

// Mock for fabric/extensions
vi.mock('fabric/extensions', () => ({
  initAligningGuidelines: vi.fn(() => vi.fn()), // Returns a mock deactivation function
}));

type MockFabricObject = FabricObject & {
  oCoords: {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: { x: number; y: number };
  };
  _set: (key: string, value: any) => void;
  trigger: (eventName: string, eventData?: any) => void;
  // Add any other properties or methods your tests might interact with
};

// Helper to create a mock FabricObject
const createMockObject = (props: Partial<MockFabricObject> = {}): MockFabricObject => {
  const obj = {
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    angle: 0,
    oCoords: {
      tl: { x: 0, y: 0 },
      tr: { x: 100, y: 0 },
      bl: { x: 0, y: 100 },
      br: { x: 100, y: 100 },
    },
    getBoundingRect: vi.fn().mockImplementation(function() {
      return {
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
      };
    }),
    getCenterPoint: vi.fn().mockImplementation(function() {
      return {
        x: obj.left + obj.width / 2,
        y: obj.top + obj.height / 2,
      };
    }),
    set: vi.fn(function(keyOrObject: string | any, value?: any) {
      if (typeof keyOrObject === 'string') {
        obj[keyOrObject] = value;
      } else {
        for (const k in keyOrObject) {
          obj[k] = keyOrObject[k];
        }
      }
    }),
    _set: vi.fn(function(key: string, value: any) { // Internal set, if needed
        obj[key] = value;
    }),
    setCoords: vi.fn().mockImplementation(function() {
      // Simplified oCoords update for testing; real logic is complex
      const angleRad = (obj.angle || 0) * (Math.PI / 180);
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const width = obj.width;
      const height = obj.height;
      const centerX = obj.left + width / 2;
      const centerY = obj.top + height / 2;
      
      // For unrotated or simplified rotated oCoords for testing
      if (obj.angle === 0) {
        obj.oCoords = {
          tl: { x: obj.left, y: obj.top },
          tr: { x: obj.left + width, y: obj.top },
          bl: { x: obj.left, y: obj.top + height },
          br: { x: obj.left + width, y: obj.top + height },
        };
      } else {
        // This is a simplified version for testing. 
        // Real oCoords calculation in Fabric.js is more involved.
        // We'll directly set oCoords for rotated tests if this isn't sufficient.
        const w2 = width / 2;
        const h2 = height / 2;
        obj.oCoords = {
            tl: { x: obj.left, y: obj.top }, // Placeholder, will be overridden in rotated tests
            tr: { x: obj.left + width, y: obj.top },
            bl: { x: obj.left, y: obj.top + height },
            br: { x: obj.left + width, y: obj.top + height },
        };
         // If specific oCoords are provided in props, use them
        if (props.oCoords) {
            obj.oCoords = props.oCoords;
        }
      }
    }),
    trigger: vi.fn(),
    canvas: null, // Will be set by canvas.add
    ...props,
  };
  // Initial setCoords call
  obj.setCoords();
  return obj as MockFabricObject;
};


// Helper to create a mock Canvas
const createMockCanvas = (props: Partial<Canvas> = {}): Canvas => {
  const eventListeners: Record<string, ((e: any) => void)[]> = {};
  const canvas = {
    width: 800,
    height: 600,
    getZoom: vi.fn(() => 1),
    on: vi.fn((eventName: string, handler: (e: any) => void) => {
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push(handler);
    }),
    off: vi.fn((eventName: string, handler?: (e: any) => void) => {
      if (handler && eventListeners[eventName]) {
        eventListeners[eventName] = eventListeners[eventName].filter(h => h !== handler);
      } else {
        delete eventListeners[eventName];
      }
    }),
    getSelectionContext: vi.fn(() => ({
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      transform: vi.fn(),
    })),
    clearContext: vi.fn(),
    requestRenderAll: vi.fn(),
    viewportTransform: [1, 0, 0, 1, 0, 0], // Default viewportTransform
    ...props,
  } as unknown as Canvas;

  // Helper to simulate event trigger
  (canvas as any)._trigger = (eventName: string, eventData: any) => {
    if (eventListeners[eventName]) {
      eventListeners[eventName].forEach(handler => handler(eventData));
    }
  };
  return canvas;
};

describe('initCanvasBorderSnap', () => {
  let mockCanvas: Canvas;
  let mockObject: MockFabricObject;
  let deactivateSnap: () => void;
  const SNAP_MARGIN = 4; // Default margin used in the module

  // Helper to simulate moving event
  const simulateMove = (target: FabricObject) => {
    const movingHandler = (mockCanvas.on as vi.Mock).mock.calls.find(
      (call) => call[0] === 'object:moving'
    )?.[1];
    if (movingHandler) {
      movingHandler({ target } as BasicTransformEvent<TPointerEvent> & { target: FabricObject });
    }
  };

  beforeEach(() => {
    // Reset mocks for fabric/extensions if needed
    vi.mocked(require('fabric/extensions').initAligningGuidelines).mockClear();

    mockCanvas = createMockCanvas();
    // Default object, can be overridden in tests
    mockObject = createMockObject({ left: 10, top: 10, width: 50, height: 50 });
    mockObject.canvas = mockCanvas; // Associate object with canvas

    // Initialize snap for each test, can be customized
    deactivateSnap = initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
  });

  afterEach(() => {
    if (deactivateSnap) {
      deactivateSnap();
    }
    vi.clearAllMocks();
  });

  describe('Unrotated Shapes', () => {
    it('should snap to left border', () => {
      mockObject = createMockObject({ left: SNAP_MARGIN - 1, top: 100 });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(0);
      expect(mockObject.set).toHaveBeenCalledWith('left', 0);
    });

    it('should snap to right border', () => {
      const canvasWidth = mockCanvas.width!;
      mockObject = createMockObject({ left: canvasWidth - 50 - (SNAP_MARGIN -1) , top: 100, width: 50 });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(canvasWidth - 50);
      expect(mockObject.set).toHaveBeenCalledWith('left', canvasWidth - 50);
    });

    it('should snap to top border', () => {
      mockObject = createMockObject({ left: 100, top: SNAP_MARGIN - 1 });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.top).toBe(0);
      expect(mockObject.set).toHaveBeenCalledWith('top', 0);
    });

    it('should snap to bottom border', () => {
      const canvasHeight = mockCanvas.height!;
      mockObject = createMockObject({ left: 100, top: canvasHeight - 50 - (SNAP_MARGIN -1), height:50 });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.top).toBe(canvasHeight - 50);
      expect(mockObject.set).toHaveBeenCalledWith('top', canvasHeight - 50);
    });
    
    it('should snap to horizontal center', () => {
      const canvasWidth = mockCanvas.width!;
      const objectWidth = 50;
      // Position object slightly off center, within snap margin
      mockObject = createMockObject({ 
        left: canvasWidth / 2 - objectWidth / 2 - (SNAP_MARGIN - 1), 
        top: 100, 
        width: objectWidth 
      });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(canvasWidth / 2 - objectWidth / 2);
    });

    it('should snap to vertical center', () => {
      const canvasHeight = mockCanvas.height!;
      const objectHeight = 50;
      // Position object slightly off center, within snap margin
      mockObject = createMockObject({ 
        left: 100, 
        top: canvasHeight / 2 - objectHeight / 2 - (SNAP_MARGIN - 1), 
        height: objectHeight 
      });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.top).toBe(canvasHeight / 2 - objectHeight / 2);
    });

    it('should not snap when far from left border', () => {
      mockObject = createMockObject({ left: SNAP_MARGIN + 1, top: 100 });
      mockObject.canvas = mockCanvas;
      const originalLeft = mockObject.left;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(originalLeft);
    });
  });

  describe('Rotated Shapes', () => {
    // Example: 45-degree rotated 100x100 square.
    // For a 100x100 square rotated 45 degrees, its bounding box is roughly 141.4x141.4.
    // The oCoords are crucial here.
    // tl, tr, bl, br are relative to the object's unrotated top-left.
    // When rotated, these points define the actual corners in canvas space.
    // Let's assume the object's `left` and `top` are the coordinates of its *center* after rotation for simplicity in setting up,
    // or ensure `oCoords` are correctly pre-calculated relative to `activeObject.left` and `activeObject.top` which are the un-rotated top-left.
    // The current implementation of checkBorderSnap uses `activeObject.left/top` as the reference to adjust.

    it('should snap rotated object to left border (based on minX of oCoords)', () => {
        // Rotated object such that its leftmost point is near the border
        // A 100x100 rect rotated 45 deg. Its center is at (left + 50, top + 50)
        // If its center is at (x,y), tl is (x - 70.7, y), tr is (x, y - 70.7) etc. (approx)
        // For simplicity, we define oCoords directly.
        // Assume object's `left` and `top` are 0,0 for this test before snapping.
        // The `activeObject.left` and `activeObject.top` are the pre-rotation top-left corner.
        // Let's place the object such that its leftmost point (could be tl or bl after rotation) is near 0.
        const objectSize = 100;
        const rotatedWidthHeight = objectSize * Math.sqrt(2)); // Approx width/height of bounding box for 45 deg rotation
        
        mockObject = createMockObject({
            left: 20, // Initial pre-rotation top-left
            top: 20,
            width: objectSize,
            height: objectSize,
            angle: 45,
            // oCoords for a 100x100 rect, rotated 45 degrees, centered at (70, 70) initially for example
            // If left=20, top=20, center approx (20+50, 20+50) = (70,70)
            // tl: (20, 70), tr: (70, 20), br: (120, 70), bl: (70, 120) if center of rotation is object center
            // The `setCoords` in the mock needs to be robust or we set oCoords manually.
            // Let's set oCoords manually based on an expected initial position.
            // Say, after rotation, the object's true left-most point is at x = 1 (SNAP_MARGIN - 1)
            oCoords: {
                tl: { x: SNAP_MARGIN - 1, y: 50 }, // This is the left-most point
                tr: { x: (SNAP_MARGIN - 1) + objectSize / Math.sqrt(2), y: 50 - objectSize / Math.sqrt(2) }, // approx
                bl: { x: (SNAP_MARGIN - 1) + objectSize / Math.sqrt(2), y: 50 + objectSize / Math.sqrt(2) }, // approx
                br: { x: (SNAP_MARGIN - 1) + objectSize * Math.sqrt(2), y: 50 }, // approx
            }
        });
        // The `left` property of the object itself needs to be consistent with oCoords for the adjustment logic
        // `activeObject.set('left', activeObject.left - minX);`
        // If minX of oCoords is SNAP_MARGIN -1, and we want it to snap to 0, then activeObject.left should be adjusted by -(SNAP_MARGIN-1)
        // So, if current activeObject.left is L, new L' = L - (SNAP_MARGIN-1).
        // For the test, we need to ensure the mockObject.left is set such that when minX is calculated, it reflects the oCoords.
        // This is a bit tricky with the mock. Let's assume setCoords in the main code correctly updates oCoords.
        // We will directly set mockObject.left and its oCoords.
        mockObject.left = (SNAP_MARGIN - 1); // Let's say the unrotated top-left was here
        mockObject.oCoords = { // And due to rotation, this is how its corners are
            tl: { x: SNAP_MARGIN - 1, y: 50 }, // minX
            tr: { x: 50 + SNAP_MARGIN -1 , y: 0 },
            bl: { x: 50 + SNAP_MARGIN -1, y: 100 },
            br: { x: 100 + SNAP_MARGIN -1, y: 50 }
        };
        mockObject.canvas = mockCanvas;
        
        simulateMove(mockObject);
        
        // Expect the object's `left` property to be adjusted so that minX becomes 0
        expect(mockObject.set).toHaveBeenCalledWith('left', 0); 
    });
    
    // More rotated tests: right, top, bottom, center H, center V
    // For these, we'd need to carefully craft the oCoords and initial `left`/`top`
    // to simulate being close to the respective snap lines.

    it('should snap rotated object to right border (based on maxX of oCoords)', () => {
        const canvasWidth = mockCanvas.width!;
        const initialObjectLeft = canvasWidth - 100; // Arbitrary
        mockObject = createMockObject({
            left: initialObjectLeft, 
            top: 50,
            width: 100,
            height: 100,
            angle: 45,
            oCoords: { // maxX is close to canvasWidth
                tl: { x: canvasWidth - 100 + (SNAP_MARGIN -1) , y: 0 },
                tr: { x: canvasWidth - (SNAP_MARGIN -1) , y: 50 }, // maxX
                bl: { x: canvasWidth - 150 + (SNAP_MARGIN -1), y: 50 },
                br: { x: canvasWidth - 50 - (SNAP_MARGIN -1), y: 100 }
            }
        });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        // activeObject.left + (canvasWidth - maxX)
        const expectedLeft = initialObjectLeft + (canvasWidth - (canvasWidth - (SNAP_MARGIN - 1)));
        expect(mockObject.set).toHaveBeenCalledWith('left', expectedLeft);
    });


    it('should snap rotated object to horizontal center', () => {
        const canvasWidth = mockCanvas.width!;
        const objectWidthRotated = 141; // Approx bounding box width of a 100x100 object rotated 45 deg
        const initialObjectLeft = canvasWidth / 2 - objectWidthRotated / 2 - 20; // some initial left for the unrotated top-left corner
    
        mockObject = createMockObject({
            left: initialObjectLeft,
            top: 50,
            width: 100,
            height: 100,
            angle: 45,
            // oCoords such that the visual center is slightly off canvas center
            // Visual center X = minX + (maxX - minX) / 2
            // Let minX = canvasWidth/2 - (objectWidthRotated/2) - (SNAP_MARGIN - 1)
            // Let maxX = canvasWidth/2 + (objectWidthRotated/2) - (SNAP_MARGIN - 1)
            oCoords: {
                tl: { x: canvasWidth/2 - objectWidthRotated/2 + 10 - (SNAP_MARGIN -1) , y: 10 }, // some y
                tr: { x: canvasWidth/2 + objectWidthRotated/2 - (SNAP_MARGIN -1), y: 50 }, // maxX
                bl: { x: canvasWidth/2 - objectWidthRotated/2 - (SNAP_MARGIN -1), y: 100 }, // minX
                br: { x: canvasWidth/2 + objectWidthRotated/2 - 5 - (SNAP_MARGIN -1), y: 120 },
            }
        });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);

        const minX = mockObject.oCoords.bl.x;
        const maxX = mockObject.oCoords.tr.x;
        const objectVisualCenterX = minX + (maxX - minX) / 2;
        const canvasCenterX = canvasWidth / 2;
        const expectedLeftAdjustment = canvasCenterX - objectVisualCenterX;
        expect(mockObject.set).toHaveBeenCalledWith('left', initialObjectLeft + expectedLeftAdjustment);
    });


  });

  describe('Zoom Levels', () => {
    it('should snap to left border with zoom 0.5 (larger effective margin)', () => {
      vi.mocked(mockCanvas.getZoom).mockReturnValue(0.5);
      // Effective margin = SNAP_MARGIN / 0.5 = 8
      // Object is at 7, should snap.
      mockObject = createMockObject({ left: SNAP_MARGIN + 2 , top: 100 }); // left = 6, effective margin = 8
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(0);
    });

    it('should snap to left border with zoom 2.0 (smaller effective margin)', () => {
      vi.mocked(mockCanvas.getZoom).mockReturnValue(2.0);
      // Effective margin = SNAP_MARGIN / 2.0 = 2
      // Object is at 1, should snap.
      mockObject = createMockObject({ left: SNAP_MARGIN - 3 , top: 100 }); // left = 1, effective margin = 2
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(0);
    });

    it('should NOT snap to left border with zoom 0.5 if outside larger effective margin', () => {
      vi.mocked(mockCanvas.getZoom).mockReturnValue(0.5);
      // Effective margin = SNAP_MARGIN / 0.5 = 8
      // Object is at 9, should NOT snap.
      const initialLeft = SNAP_MARGIN * 2 + 1; // 9
      mockObject = createMockObject({ left: initialLeft, top: 100 });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(initialLeft);
    });
  });

  describe('No Snap Cases', () => {
    it('should not snap when just outside left margin', () => {
      mockObject = createMockObject({ left: SNAP_MARGIN + 1, top: 100 });
      mockObject.canvas = mockCanvas;
      const originalLeft = mockObject.left;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(originalLeft);
      expect(mockObject.set).not.toHaveBeenCalledWith('left', 0);
    });

    it('should not snap when just outside right margin', () => {
      const canvasWidth = mockCanvas.width!;
      const objectWidth = 50;
      const initialLeft = canvasWidth - objectWidth - (SNAP_MARGIN + 1);
      mockObject = createMockObject({ left: initialLeft, top: 100, width: objectWidth });
      mockObject.canvas = mockCanvas;
      simulateMove(mockObject);
      expect(mockObject.left).toBe(initialLeft);
    });
    
    // Similar tests for top, bottom, H center, V center
  });
  
  describe('Cleanup', () => {
    it('should call the deactivate function returned by initAligningGuidelines on cleanup', () => {
      const mockDeactivateAligning = vi.fn();
      vi.mocked(require('fabric/extensions').initAligningGuidelines).mockReturnValue(mockDeactivateAligning);
      
      const localDeactivateSnap = initCanvasBorderSnap(mockCanvas, {});
      localDeactivateSnap(); // Call our main deactivate function
      
      expect(mockDeactivateAligning).toHaveBeenCalled();
    });

    it('should remove all event listeners from canvas on cleanup', () => {
        const localDeactivateSnap = initCanvasBorderSnap(mockCanvas, {});
        localDeactivateSnap();

        expect(mockCanvas.off).toHaveBeenCalledWith('object:moving', expect.any(Function));
        expect(mockCanvas.off).toHaveBeenCalledWith('object:scaling', expect.any(Function));
        expect(mockCanvas.off).toHaveBeenCalledWith('object:resizing', expect.any(Function));
        expect(mockCanvas.off).toHaveBeenCalledWith('before:render', expect.any(Function));
        expect(mockCanvas.off).toHaveBeenCalledWith('after:render', expect.any(Function));
        expect(mockCanvas.off).toHaveBeenCalledWith('mouse:up', expect.any(Function));
    });
  });

});

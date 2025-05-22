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

  describe('Major Edge Cases', () => {
    describe('Object Larger Than Canvas', () => {
      it('wider object, left edge near canvas left, should snap left', () => {
        mockCanvas = createMockCanvas({ width: 100, height: 100 });
        mockObject = createMockObject({
          left: SNAP_MARGIN - 1, // Near left edge
          top: 10,
          width: 200, // Wider than canvas
          height: 50,
          oCoords: { // Assuming unrotated for this specific case
            tl: { x: SNAP_MARGIN - 1, y: 10 },
            tr: { x: SNAP_MARGIN - 1 + 200, y: 10 },
            bl: { x: SNAP_MARGIN - 1, y: 10 + 50 },
            br: { x: SNAP_MARGIN - 1 + 200, y: 10 + 50 },
          }
        });
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
      });

      it('wider object, right edge near canvas right, should snap right', () => {
        const canvasWidth = 100;
        mockCanvas = createMockCanvas({ width: canvasWidth, height: 100 });
        const objectWidth = 200;
        const initialLeft = canvasWidth - objectWidth - (SNAP_MARGIN - 1); // Makes right edge close to canvas right
        mockObject = createMockObject({
          left: initialLeft,
          top: 10,
          width: objectWidth,
          height: 50,
           oCoords: { // Assuming unrotated
            tl: { x: initialLeft, y: 10 },
            tr: { x: initialLeft + objectWidth, y: 10 }, // This will be canvasWidth - (SNAP_MARGIN - 1)
            bl: { x: initialLeft, y: 10 + 50 },
            br: { x: initialLeft + objectWidth, y: 10 + 50 },
          }
        });
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
        simulateMove(mockObject);
        // Expect object.left to be set to canvasWidth - objectWidth
        expect(mockObject.set).toHaveBeenCalledWith('left', canvasWidth - objectWidth);
      });
      
      it('wider object, centered, should not snap if logic prefers no snap for already out-of-bounds centered', () => {
        const canvasWidth = 100;
        mockCanvas = createMockCanvas({ width: canvasWidth, height: 100 });
        const objectWidth = 200;
        const initialLeft = canvasWidth / 2 - objectWidth / 2; // Centered
        mockObject = createMockObject({
          left: initialLeft,
          top: 10,
          width: objectWidth,
          height: 50,
          oCoords: { // Assuming unrotated
            tl: { x: initialLeft, y: 10 },
            tr: { x: initialLeft + objectWidth, y: 10 },
            bl: { x: initialLeft, y: 10 + 50 },
            br: { x: initialLeft + objectWidth, y: 10 + 50 },
          }
        });
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
        
        // Clear any mock calls from createMockObject
        mockObject.set.mockClear();

        simulateMove(mockObject);
        // Current logic might snap to left if minX is negative and abs(minX) < margin.
        // If minX is e.g. -50, and margin is 4, it would snap left.
        // If the requirement is truly "no snap if centered and larger", the core logic would need adjustment.
        // Based on current logic: minX = -50. Math.abs(-50) > margin. So no left snap.
        // maxX = 150. Math.abs(150 - 100) > margin. So no right snap.
        // Visual center X = 50. Canvas center X = 50. So it might snap to center if that check runs.
        // The problem states "Expect no snap or snap to one edge if preferred by logic".
        // The current logic will snap to center if the center check is not overridden by prior border snaps.
        // Let's test if it snaps to center, as that's what the current logic would do if no border snap.
        const objectVisualCenterX = initialLeft + objectWidth / 2;
        const canvasCenterX = canvasWidth / 2;
        if (Math.abs(objectVisualCenterX - canvasCenterX) <= SNAP_MARGIN) {
             expect(mockObject.set).toHaveBeenCalledWith('left', initialLeft + (canvasCenterX - objectVisualCenterX));
        } else {
            expect(mockObject.set).not.toHaveBeenCalled();
        }
      });

      it('taller object, top edge near canvas top, should snap top', () => {
        mockCanvas = createMockCanvas({ width: 100, height: 100 });
        mockObject = createMockObject({
          left: 10,
          top: SNAP_MARGIN - 1, // Near top edge
          width: 50,
          height: 200, // Taller than canvas
           oCoords: {
            tl: { x: 10, y: SNAP_MARGIN -1 },
            tr: { x: 10 + 50, y: SNAP_MARGIN -1 },
            bl: { x: 10, y: SNAP_MARGIN -1 + 200 },
            br: { x: 10 + 50, y: SNAP_MARGIN -1 + 200 },
          }
        });
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('top', 0);
      });
    });

    describe('Object Exactly at Snap Margin', () => {
      it('left edge exactly at snap margin, should snap left', () => {
        mockObject = createMockObject({ left: SNAP_MARGIN, top: 100 });
        mockObject.oCoords.tl.x = SNAP_MARGIN; // Update oCoords to match
        mockObject.oCoords.bl.x = SNAP_MARGIN;
        mockObject.oCoords.tr.x = SNAP_MARGIN + mockObject.width;
        mockObject.oCoords.br.x = SNAP_MARGIN + mockObject.width;
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
      });

      it('right edge exactly at snap margin, should snap right', () => {
        const canvasWidth = mockCanvas.width!;
        const objectWidth = 50;
        const initialLeft = canvasWidth - objectWidth - SNAP_MARGIN;
        mockObject = createMockObject({ left: initialLeft, top: 100, width: objectWidth });
        mockObject.oCoords.tl.x = initialLeft;
        mockObject.oCoords.bl.x = initialLeft;
        mockObject.oCoords.tr.x = initialLeft + objectWidth; // This is canvasWidth - SNAP_MARGIN
        mockObject.oCoords.br.x = initialLeft + objectWidth;
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', canvasWidth - objectWidth);
      });
      
      it('horizontal center exactly at snap margin, should snap to center', () => {
        const canvasWidth = mockCanvas.width!;
        const objectWidth = 50;
        // Position object's visual center SNAP_MARGIN away from canvas center
        const initialLeft = canvasWidth / 2 - objectWidth / 2 - SNAP_MARGIN;
        mockObject = createMockObject({ left: initialLeft, top: 100, width: objectWidth });
        // Manually update oCoords to reflect this precise positioning for visual center check
        mockObject.oCoords = {
            tl: { x: initialLeft, y: 100 },
            tr: { x: initialLeft + objectWidth, y: 100 },
            bl: { x: initialLeft, y: 100 + mockObject.height },
            br: { x: initialLeft + objectWidth, y: 100 + mockObject.height },
        };
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', canvasWidth / 2 - objectWidth / 2);
      });
    });

    describe('Very Small Objects', () => {
      it('1x1 object snaps to left border', () => {
        mockObject = createMockObject({
          left: SNAP_MARGIN - 1, top: 10, width: 1, height: 1,
          oCoords: { tl: {x: SNAP_MARGIN-1, y:10}, tr: {x:SNAP_MARGIN, y:10}, bl:{x:SNAP_MARGIN-1,y:11}, br:{x:SNAP_MARGIN,y:11}}
        });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
      });

      it('0x0 object at top-left, snaps to 0,0 (if oCoords are {x,y})', () => {
        // Fabric might give it a small default size, but let's assume width/height can be 0
        // and oCoords are all the same point.
        const initialPos = SNAP_MARGIN -1;
        mockObject = createMockObject({
          left: initialPos, top: initialPos, width: 0, height: 0,
          oCoords: { // All points are the same
            tl: { x: initialPos, y: initialPos }, tr: { x: initialPos, y: initialPos },
            bl: { x: initialPos, y: initialPos }, br: { x: initialPos, y: initialPos }
          }
        });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        // Expect it to snap its single point to 0,0
        // It will call set('left', currentLeft - minX) and set('top', currentTop - minY)
        expect(mockObject.set).toHaveBeenCalledWith('left', initialPos - initialPos); // effectively 0
        expect(mockObject.set).toHaveBeenCalledWith('top', initialPos - initialPos); // effectively 0
      });
    });

    describe('Objects with Extreme Aspect Ratios', () => {
      it('thin (2x200) object snaps to left border on 100x100 canvas', () => {
        mockCanvas = createMockCanvas({ width: 100, height: 100 });
        mockObject = createMockObject({
          left: SNAP_MARGIN - 1, top: 10, width: 2, height: 200,
          oCoords: { // Unrotated
            tl: { x: SNAP_MARGIN - 1, y: 10 }, tr: { x: SNAP_MARGIN - 1 + 2, y: 10 },
            bl: { x: SNAP_MARGIN - 1, y: 10 + 200 }, br: { x: SNAP_MARGIN - 1 + 2, y: 10 + 200 }
          }
        });
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
      });

      it('wide (200x2) object snaps to top border on 100x100 canvas', () => {
        mockCanvas = createMockCanvas({ width: 100, height: 100 });
        mockObject = createMockObject({
          left: 10, top: SNAP_MARGIN - 1, width: 200, height: 2,
          oCoords: { // Unrotated
            tl: { x: 10, y: SNAP_MARGIN - 1 }, tr: { x: 10 + 200, y: SNAP_MARGIN - 1 },
            bl: { x: 10, y: SNAP_MARGIN - 1 + 2 }, br: { x: 10 + 200, y: SNAP_MARGIN - 1 + 2 }
          }
        });
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('top', 0);
      });
    });

    describe('Canvas with Zero or Very Small Dimensions', () => {
      it('canvas 0x0, object snaps to left 0, top 0', () => {
        mockCanvas = createMockCanvas({ width: 0, height: 0 });
        mockObject = createMockObject({
          left: SNAP_MARGIN - 1, top: SNAP_MARGIN - 1, width: 50, height: 50,
          // oCoords will have minX = SNAP_MARGIN - 1, minY = SNAP_MARGIN - 1
        });
        mockObject.oCoords = {
            tl: {x: SNAP_MARGIN-1, y:SNAP_MARGIN-1}, tr: {x:SNAP_MARGIN-1+50, y:SNAP_MARGIN-1},
            bl: {x:SNAP_MARGIN-1, y:SNAP_MARGIN-1+50}, br: {x:SNAP_MARGIN-1+50, y:SNAP_MARGIN-1+50}
        };
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });

        simulateMove(mockObject);
        // Expect left to be currentLeft - minX = (SNAP_MARGIN - 1) - (SNAP_MARGIN - 1) = 0
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
        // Expect top to be currentTop - minY = (SNAP_MARGIN - 1) - (SNAP_MARGIN - 1) = 0
        expect(mockObject.set).toHaveBeenCalledWith('top', 0);
      });

      it('canvas 1x1, object snaps to left 0 if near left edge', () => {
        mockCanvas = createMockCanvas({ width: 1, height: 1 });
        mockObject = createMockObject({
          left: SNAP_MARGIN - 1, top: 0, width: 50, height: 50,
        });
         mockObject.oCoords = { // minX will be SNAP_MARGIN-1
            tl: {x: SNAP_MARGIN-1, y:0}, tr: {x:SNAP_MARGIN-1+50, y:0},
            bl: {x:SNAP_MARGIN-1, y:50}, br: {x:SNAP_MARGIN-1+50, y:50}
        };
        mockObject.canvas = mockCanvas;
        initCanvasBorderSnap(mockCanvas, { margin: SNAP_MARGIN });
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0); // Snap to 0
      });
    });

    describe('Simultaneous Edge Snapping (Corners)', () => {
      it('object near top-left corner snaps to top=0, left=0', () => {
        const initialLeft = SNAP_MARGIN - 1;
        const initialTop = SNAP_MARGIN - 2; // Use different values to distinguish calls
        mockObject = createMockObject({
          left: initialLeft, top: initialTop, width: 50, height: 50,
          oCoords: { // Unrotated
            tl: { x: initialLeft, y: initialTop }, tr: { x: initialLeft + 50, y: initialTop },
            bl: { x: initialLeft, y: initialTop + 50 }, br: { x: initialLeft + 50, y: initialTop + 50 }
          }
        });
        mockObject.canvas = mockCanvas; // use default 800x600 canvas
        simulateMove(mockObject);
        // current logic: if (Math.abs(minX) <= margin) snaps left. Then, if (Math.abs(minY) <= margin) snaps top.
        // So, set('left', 0) then set('top', 0)
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
        expect(mockObject.set).toHaveBeenCalledWith('top', 0);
        // Check that setCoords is called after position changes
        expect(mockObject.setCoords).toHaveBeenCalledTimes(1+2); // 1 initial, 1 after left snap, 1 after top snap (in the real code, it's one final setCoords)
                                                              // The mockObject.set calls above change the internal values.
                                                              // The actual implementation calls activeObject.setCoords() if guidelines.length > 0
                                                              // Let's check the values on the object after the call
        expect(mockObject.left).toBe(0); // Check final state from mock
        expect(mockObject.top).toBe(0);  // Check final state from mock
      });

      it('rotated object near top-left corner snaps correctly', () => {
        const initialObjLeft = 1; // unrotated top-left
        const initialObjTop = 1;
        mockObject = createMockObject({
            left: initialObjLeft, top: initialObjTop, width: 100, height: 100, angle: 45,
            // oCoords such that minX and minY are within snap margin of 0,0
            // For a 100x100 rect rotated 45 deg, centered at (51,51)
            // minX approx 51 - 70.7 = -19.7
            // minY approx 51 - 70.7 = -19.7
            // Let's set specific oCoords to make minX = SNAP_MARGIN -1, minY = SNAP_MARGIN -1
            oCoords: {
                tl: { x: SNAP_MARGIN - 1, y: 50 }, // Example: this is minX
                tr: { x: 50, y: SNAP_MARGIN - 1 }, // Example: this is minY
                bl: { x: 60, y: 100 },
                br: { x: 100, y: 60 }
            }
        });
        // To make the above oCoords consistent with snapping logic:
        // activeObject.left - minX should be the new 'left' value for the snap.
        // If we want final left to be 0, then activeObject.left should be minX.
        // The current mockObject.left is initialObjLeft.
        // The code does: activeObject.set('left', activeObject.left - minX);
        // So, we need to ensure mockObject.left is set such that this results in the desired final state.
        // Let minX_coord = SNAP_MARGIN - 1.
        // Let minY_coord = SNAP_MARGIN - 1.
        mockObject.left = initialObjLeft; // This is the object's own 'left' property
        mockObject.top = initialObjTop;   // This is the object's own 'top' property
        mockObject.oCoords = { // These are the actual corner positions in canvas space
            tl: { x: SNAP_MARGIN - 1, y: initialObjTop + 30 }, // minX
            tr: { x: initialObjLeft + 30, y: SNAP_MARGIN - 1 }, // minY
            bl: { x: SNAP_MARGIN - 1 + 10, y: initialObjTop + 70 },
            br: { x: initialObjLeft + 70, y: SNAP_MARGIN - 1 + 10 }
        };

        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);

        const minX = SNAP_MARGIN - 1;
        const minY = SNAP_MARGIN - 1;
        expect(mockObject.set).toHaveBeenCalledWith('left', initialObjLeft - minX);
        expect(mockObject.set).toHaveBeenCalledWith('top', initialObjTop - minY);
      });
    });

    describe('Object Initially Far Outside Canvas Boundaries', () => {
      it('object far left, moves into snap range, then snaps left', () => {
        const initialLeft = -10000;
        mockObject = createMockObject({
            left: initialLeft, top: 100, width: 50, height: 50,
            oCoords: { // Consistent with 'left' being far away
                tl: {x: initialLeft, y:100}, tr:{x: initialLeft+50, y:100},
                bl: {x: initialLeft, y:150}, br:{x: initialLeft+50, y:150}
            }
        });
        mockObject.canvas = mockCanvas;
        
        // 1. Simulate move while far away
        simulateMove(mockObject);
        expect(mockObject.set).not.toHaveBeenCalled(); // Should not have snapped yet

        // 2. Update object position to be within snap range
        mockObject.left = SNAP_MARGIN - 1;
        mockObject.oCoords = { // Update oCoords
            tl: {x: SNAP_MARGIN-1, y:100}, tr:{x: SNAP_MARGIN-1+50, y:100},
            bl: {x: SNAP_MARGIN-1, y:150}, br:{x: SNAP_MARGIN-1+50, y:150}
        };
        // mockObject.set.mockClear(); // Clear previous calls if any accidental ones
        
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
      });
    });
  });

  describe('Minor Edge Cases', () => {
    describe('Objects with Significant Stroke Widths', () => {
      it('should snap based on geometric oCoords, not visual stroke extent', () => {
        mockObject = createMockObject({
          left: SNAP_MARGIN - 1, top: 10, width: 50, height: 50,
          strokeWidth: 10, // Significant stroke width
          // oCoords are based on width/height, not including strokeWidth by default in Fabric's oCoords calc
          oCoords: { 
            tl: { x: SNAP_MARGIN - 1, y: 10 }, 
            tr: { x: SNAP_MARGIN - 1 + 50, y: 10 },
            bl: { x: SNAP_MARGIN - 1, y: 10 + 50 }, 
            br: { x: SNAP_MARGIN - 1 + 50, y: 10 + 50 }
          }
        });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0); // Snaps based on the 50x50 geometry
      });
    });

    describe('Objects with Non-Default originX, originY', () => {
      // The core snapping logic uses oCoords. If oCoords are correctly calculated by Fabric.js
      // (which is assumed and mocked here), the snapping should work irrespective of origin,
      // as oCoords represent the absolute corner positions.
      // These tests primarily confirm that our logic relies on oCoords as expected.

      it('originX:center, originY:center - snaps to left border', () => {
        const objectWidth = 50;
        // If origin is center, 'left' is the center. oCoords tl.x would be left - width/2.
        // To make oCoords.tl.x = SNAP_MARGIN - 1 for a left snap:
        const initialLeft = (SNAP_MARGIN - 1) + objectWidth / 2; 
        mockObject = createMockObject({
          left: initialLeft, top: 50, width: objectWidth, height: 50,
          originX: 'center', originY: 'center',
          oCoords: { // These are the critical values our snap function uses
            tl: { x: SNAP_MARGIN - 1, y: 50 - 25 },
            tr: { x: SNAP_MARGIN - 1 + objectWidth, y: 50 - 25 },
            bl: { x: SNAP_MARGIN - 1, y: 50 - 25 + 50 },
            br: { x: SNAP_MARGIN - 1 + objectWidth, y: 50 - 25 + 50 }
          }
        });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        // The change will be: activeObject.left + (0 - minX)
        // Here minX is oCoords.tl.x = SNAP_MARGIN - 1
        // Expected new object.left = initialLeft - (SNAP_MARGIN - 1)
        expect(mockObject.set).toHaveBeenCalledWith('left', initialLeft - (SNAP_MARGIN - 1));
      });

      it('originX:right, originY:bottom - snaps to left border', () => {
        const objectWidth = 50;
        const objectHeight = 50;
        // If origin is right/bottom, 'left' is the right edge, 'top' is the bottom edge.
        // oCoords.tl.x would be left - width.
        // To make oCoords.tl.x = SNAP_MARGIN - 1 for a left snap:
        const initialLeft = (SNAP_MARGIN - 1) + objectWidth;
        const initialTop = 50 + objectHeight; // Arbitrary initial top
        mockObject = createMockObject({
          left: initialLeft, top: initialTop, width: objectWidth, height: objectHeight,
          originX: 'right', originY: 'bottom',
          oCoords: {
            tl: { x: SNAP_MARGIN - 1, y: 50 },
            tr: { x: SNAP_MARGIN - 1 + objectWidth, y: 50 },
            bl: { x: SNAP_MARGIN - 1, y: 50 + objectHeight },
            br: { x: SNAP_MARGIN - 1 + objectWidth, y: 50 + objectHeight }
          }
        });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        // Expected new object.left = initialLeft - (SNAP_MARGIN - 1)
        expect(mockObject.set).toHaveBeenCalledWith('left', initialLeft - (SNAP_MARGIN - 1));
      });
    });

    describe('Behavior During Rapid, Successive Transformations', () => {
      it('multiple moves, final state reflects last snap-inducing move', () => {
        mockObject = createMockObject({ left: 100, top: 100, width: 50, height: 50 });
        mockObject.canvas = mockCanvas;

        // 1. Move far, no snap
        mockObject.left = 200; mockObject.setCoords(); simulateMove(mockObject);
        expect(mockObject.set).not.toHaveBeenCalledWith('left', 0);
        
        // 2. Move into snap range for left border
        mockObject.left = SNAP_MARGIN - 1; mockObject.setCoords(); simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
        mockObject.left = 0; // Assume snap occurred

        // 3. Move slightly out of snap range
        mockObject.left = SNAP_MARGIN + 1; mockObject.setCoords(); simulateMove(mockObject);
        // `set` would have been called by the previous step, so we check current state or absence of new snap
        // For this, we'd need to clear mock or check call count if not already done by afterEach
        mockObject.set.mockClear(); // Clear calls from previous snap
        simulateMove(mockObject); // Re-simulate with current position
        expect(mockObject.set).not.toHaveBeenCalled(); // No new snap
        expect(mockObject.left).toBe(SNAP_MARGIN + 1); // Remains where it was set

        // 4. Move back into snap range for top border
        mockObject.top = SNAP_MARGIN - 2; mockObject.setCoords(); simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('top', 0);
        mockObject.top = 0; // Assume snap
        
        // Final state check (already implicitly done by individual assertions)
        expect(mockObject.left).toBe(SNAP_MARGIN + 1);
        expect(mockObject.top).toBe(0);
      });
    });

    describe('Different `options` Passed to `initCanvasBorderSnap`', () => {
      const CUSTOM_MARGIN = 10;
      beforeEach(() => {
        // Need to re-init for this specific describe block or test
        if (deactivateSnap) deactivateSnap(); // Deactivate default one
        deactivateSnap = initCanvasBorderSnap(mockCanvas, { margin: CUSTOM_MARGIN });
      });
      
      it('snaps with custom margin of 10', () => {
        mockObject = createMockObject({ left: CUSTOM_MARGIN - 1, top: 100 });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
      });

      it('does not snap if outside custom margin but inside default margin', () => {
        mockObject = createMockObject({ left: CUSTOM_MARGIN - (SNAP_MARGIN + 1), top: 100 }); // e.g. 10 - (4+1) = 5 (if default was 4)
                                                                                          // More clearly: left is 6, default SNAP_MARGIN is 4, CUSTOM_MARGIN is 10
                                                                                          // It should snap with default, but not with custom if it's further out.
                                                                                          // Let's set left to be between default and custom.
        mockObject.left = SNAP_MARGIN + 2; // e.g. 4+2=6. Custom margin is 10. Should not snap.
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).not.toHaveBeenCalledWith('left', 0);
        expect(mockObject.left).toBe(SNAP_MARGIN + 2);
      });

      it('uses custom guideline color and width if provided', () => {
        if (deactivateSnap) deactivateSnap();
        const customColor = 'blue';
        const customWidth = 3;
        deactivateSnap = initCanvasBorderSnap(mockCanvas, { 
            margin: CUSTOM_MARGIN, 
            color: customColor, 
            width: customWidth 
        });

        const mockCtx = mockCanvas.getSelectionContext();
        
        // Trigger guideline drawing by causing a snap
        mockObject = createMockObject({ left: CUSTOM_MARGIN - 1, top: 10 });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject); // This should generate guidelines
        
        // Simulate the after:render call which calls drawGuidelines
        const afterRenderHandler = (mockCanvas.on as vi.Mock).mock.calls.find(call => call[0] === 'after:render')?.[1];
        if (afterRenderHandler) afterRenderHandler();

        expect(mockCtx.strokeStyle).toBe(customColor);
        expect(mockCtx.lineWidth).toBe(customWidth / mockCanvas.getZoom());
      });
    });

    describe('Canvas with `clipPath`', () => {
      it('snaps to canvas.width/height, not clipPath boundaries', () => {
        // Add a dummy clipPath to the canvas mock
        (mockCanvas as any).clipPath = { 
            left: 50, top: 50, width: 100, height: 100, 
            absolutePositioned: true, // typical for a clipPath rect
            isPointOnPath: (x,y) => true // dummy
        };

        const canvasWidth = mockCanvas.width!; // e.g. 800
        mockObject = createMockObject({ 
            left: canvasWidth - 50 - (SNAP_MARGIN - 1), // Near actual canvas right edge
            top: 100, 
            width: 50 
        });
        mockObject.oCoords.tr.x = canvasWidth - (SNAP_MARGIN -1);
        mockObject.oCoords.br.x = canvasWidth - (SNAP_MARGIN -1);
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        // Expect to snap to canvas right edge, not clipPath right edge
        expect(mockObject.set).toHaveBeenCalledWith('left', canvasWidth - 50); 
      });
    });
    
    describe('Floating Point Inaccuracies', () => {
      const epsilon = 0.0000001;
      it('snaps when just under margin (left: SNAP_MARGIN - epsilon)', () => {
        mockObject = createMockObject({ left: SNAP_MARGIN - epsilon, top: 100 });
        mockObject.oCoords.tl.x = SNAP_MARGIN - epsilon;
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
      });

      it('does not snap when just over margin (left: SNAP_MARGIN + epsilon)', () => {
        const initialLeft = SNAP_MARGIN + epsilon;
        mockObject = createMockObject({ left: initialLeft, top: 100 });
        mockObject.oCoords.tl.x = initialLeft;
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).not.toHaveBeenCalled();
        expect(mockObject.left).toBe(initialLeft);
      });
       it('snaps when minX is almost 0 (e.g. 0.00001)', () => {
        mockObject = createMockObject({ left: epsilon, top: 100 });
        mockObject.oCoords.tl.x = epsilon;
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0); // Should snap to 0
      });
    });

    describe('Deactivating and Re-initializing Snapping', () => {
      let onSpy: vi.SpyInstance;
      let offSpy: vi.SpyInstance;

      beforeEach(() => {
        // Clear any global canvas mock state if necessary, or use fresh canvas
        mockCanvas = createMockCanvas(); // Fresh canvas for these specific tests
        onSpy = vi.spyOn(mockCanvas, 'on');
        offSpy = vi.spyOn(mockCanvas, 'off');
        // Default init is usually in outer beforeEach, ensure it's not interfering or re-init here
        if(deactivateSnap) deactivateSnap(); // Deactivate any existing
      });

      it('deactivates listeners correctly', () => {
        const deactivate1 = initCanvasBorderSnap(mockCanvas, {});
        const initialOnCallCount = onSpy.mock.calls.length;
        
        deactivate1();
        // Check that 'off' was called for each event 'on' was called for by initCanvasBorderSnap
        // The number of events is fixed: moving, scaling, resizing, before:render, after:render, mouse:up (6)
        expect(offSpy).toHaveBeenCalledTimes(initialOnCallCount); // Or 6 if onSpy is fresh for this init
        expect(offSpy).toHaveBeenCalledWith('object:moving', expect.any(Function));
        // ... (check for all specific events)
      });

      it('re-initializes listeners correctly after deactivation', () => {
        const deactivate1 = initCanvasBorderSnap(mockCanvas, {});
        deactivate1();
        
        offSpy.mockClear(); // Clear offSpy calls from deactivate1

        const onSpyBeforeReinit = vi.spyOn(mockCanvas, 'on'); // Fresh spy or track calls carefully
        const beforeReinitOnCount = onSpyBeforeReinit.mock.calls.length;

        const deactivate2 = initCanvasBorderSnap(mockCanvas, {});
        expect(onSpyBeforeReinit.mock.calls.length).toBeGreaterThan(beforeReinitOnCount); // New listeners attached
        // Check if it works (e.g., a simple snap test)
        mockObject = createMockObject({ left: SNAP_MARGIN - 1, top: 100 });
        mockObject.canvas = mockCanvas;
        simulateMove(mockObject);
        expect(mockObject.set).toHaveBeenCalledWith('left', 0);
        
        deactivate2();
        expect(offSpy.mock.calls.length).toBeGreaterThanOrEqual(6); // At least 6 new off calls
      });

      it('does not have duplicate listeners after deactivation and re-initialization', () => {
        // This is tricky to test perfectly without inspecting the actual listener arrays.
        // We rely on Fabric's `off` removing the correct handler.
        // One way is to ensure `on` and `off` are called a balanced number of times for specific handlers if possible.
        // Or, ensure that a single event trigger only results in one action after re-initialization.

        const handlerSpies = {
            moving: vi.fn(),
            scaling: vi.fn(),
            // ... potentially others if we want to be very thorough
        };
        
        // Override how listeners are stored/called in mockCanvas for this test
        const eventListenersStore: Record<string, ((e: any) => void)[]> = {};
        vi.spyOn(mockCanvas, 'on').mockImplementation((eventName: string, handler: (e: any) => void) => {
            if (!eventListenersStore[eventName]) eventListenersStore[eventName] = [];
            eventListenersStore[eventName].push(handler);
            // If specific spies are provided for event names, use them
            if (eventName === 'object:moving' && handlerSpies.moving) {
                 eventListenersStore[eventName].push(handlerSpies.moving); // this is not quite right, handler should be the spy
            }
        });
         vi.spyOn(mockCanvas, 'off').mockImplementation((eventName: string, handlerToRemove?: (e: any) => void) => {
            if (handlerToRemove && eventListenersStore[eventName]) {
                eventListenersStore[eventName] = eventListenersStore[eventName].filter(h => h !== handlerToRemove);
            } else {
                 delete eventListenersStore[eventName];
            }
        });

        const deactivate1 = initCanvasBorderSnap(mockCanvas, {}); 
        // At this point, eventListenersStore should have one set of handlers

        deactivate1();
        // eventListenersStore should be empty or listeners significantly reduced by fabric's internal off

        const deactivate2 = initCanvasBorderSnap(mockCanvas, {});
        // eventListenersStore should have another set of handlers. We check its size.
        // This relies on the mockCanvas.on/off correctly mimicking listener management.
        
        mockObject = createMockObject({ left: SNAP_MARGIN - 1, top: 100 });
        mockObject.canvas = mockCanvas;
        
        // Simulate move by directly calling stored handlers to check count
        const movingHandlers = eventListenersStore['object:moving'] || [];
        const targetEvent = { target: mockObject } as BasicTransformEvent<TPointerEvent> & { target: FabricObject };
        movingHandlers.forEach(h => h(targetEvent));

        // If no duplicates, set should be called once for a single logical snap event
        // This assumes the handlers themselves don't have internal duplication bugs
        // And that our mock store reflects the real canvas listener state.
        // The number of times set is called is a good proxy for number of active snap logic handlers.
        expect(mockObject.set).toHaveBeenCalledTimes(1); // Snap to left
        deactivate2();
      });
    });
  });
});

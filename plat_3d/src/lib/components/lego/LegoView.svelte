<script>
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  // Direct import for TransformControls from the jsm examples path is standard
  import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

  let canvas;
  let scene;
  let camera;
  let renderer;
  let transformControls;
  let gridHelper;
  let basePlate;

  // Block variables
  let blocks = [];
  let selectedBlock = null;
  let currentBlockSize = { width: 1, length: 1 };
  let currentBlockColor = "#f44336";
  let placementMode = false;
  let placementBlock = null;
  let raycaster;
  let mouse;
  let isTransforming = false; // Flag to indicate if transform controls are active

  // Camera control variables
  // let cameraRotationSpeed = 0.01; // Declared but not used
  let cameraDistance = 20;
  let cameraAngleHorizontal = 0;
  let cameraAngleVertical = Math.PI / 6; // Start at 30 degrees up
  let cameraTarget;

  // Mouse control variables for custom camera controls
  let isDragging = false;
  let isOrbiting = false;
  let isPanning = false;
  let previousMousePosition = { x: 0, y: 0 };
  let deltaMove = { x: 0, y: 0 };

  // Grid snap variables
  let gridSnapEnabled = true;
  const snapSize = 1; // Size of grid cells
  const rotationSnap = Math.PI / 2; // 90 degrees rotation snap

  // Import browser check to avoid server-side rendering issues
  import { browser } from '$app/environment';

  // Handle window resize
  function onWindowResize() {
    // Ensure camera and renderer match the new window size
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // Handle keyboard controls for camera and deleting blocks
  function onKeyDown(event) {
    // Prevent camera movement if TransformControls are being used
    if (isTransforming) return;

    const keySpeed = 0.05;

    switch(event.key) {
      case "ArrowLeft":
        cameraAngleHorizontal += keySpeed;
        break;
      case "ArrowRight":
        cameraAngleHorizontal -= keySpeed;
        break;
      case "ArrowUp":
        // Prevent camera from going directly vertical (causes issues with spherical coordinates)
        cameraAngleVertical = Math.min(cameraAngleVertical + keySpeed, Math.PI/2 - 0.1);
        break;
      case "ArrowDown":
         // Prevent camera from going directly vertical down
        cameraAngleVertical = Math.max(cameraAngleVertical - keySpeed, -Math.PI/2 + 0.1);
        break;
      case "Delete":
        deleteSelectedBlock(); // Call the function to delete
        break;
    }
    updateCameraPosition(); // Update camera after key press
  }

  // Handle context menu prevention (prevents right-click menu)
  function onContextMenu(event) {
    event.preventDefault();
  }

  // Svelte lifecycle hook: Component mounted to the DOM
  onMount(async () => {
    // Ensure code runs only in the browser environment
    if (browser) {
      initScene();
      animate();
    }
  });

  // Svelte lifecycle hook: Component is destroyed
  onDestroy(() => {
    // Dispose of renderer to free up WebGL context and memory
    if (renderer) {
      renderer.dispose();
    }
    // Also dispose of other Three.js objects if they are not automatically
    // garbage collected (e.g., geometries, materials).
    // Note: In this app structure, the scene itself holds most objects,
    // and the renderer disposal handles the WebGL context.
    // Individual block disposal is handled in deleteSelectedBlock.
    // Dispose gridHelper and basePlate here if they are not part of the block list
     if (gridHelper) gridHelper.dispose();
     // Baseplate geometry and material need disposal
     if (basePlate) {
         if (basePlate.geometry) basePlate.geometry.dispose();
         if (basePlate.material) basePlate.material.dispose();
     }
    // transformControls doesn't need explicit disposal typically, as it's tied to the renderer's DOM element
  });

  // Initialize the Three.js scene, camera, renderer, etc.
  function initScene() {
    // Initialize Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    // Setup camera (PerspectiveCamera is common for 3D scenes)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // camera.position.set(10, 10, 10); // Initial position set by updateCameraPosition
    // camera.lookAt(0, 0, 0); // Initial lookAt set by updateCameraPosition

    // Setup renderer (WebGLRenderer renders the scene)
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Enable shadow mapping

    // Add lights for visibility and shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft light from all directions
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Light from a specific direction
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true; // Enable shadow casting
    // Configure shadow camera bounds to match the scene area
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
     directionalLight.shadow.mapSize.width = 1024; // Increase shadow map resolution
     directionalLight.shadow.mapSize.height = 1024; // Increase shadow map resolution
    scene.add(directionalLight);

    // Create grid helper for visual reference
    const gridSize = 32;
    const gridDivisions = 32;
    gridHelper = new THREE.GridHelper(gridSize, gridDivisions);
     // Adjust gridHelper position if needed, often centered at 0,0,0
     // gridHelper.position.y = 0; // Grid is typically on the XZ plane at Y=0
    scene.add(gridHelper);

    // Create base plate (the ground)
    const basePlateGeometry = new THREE.BoxGeometry(32, 0.5, 32);
    const basePlateMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
    basePlate = new THREE.Mesh(basePlateGeometry, basePlateMaterial);
    basePlate.position.y = -0.25; // Position so its top is at Y=0
    basePlate.receiveShadow = true; // Enable shadow receiving
    scene.add(basePlate);

    // Initialize transform controls
    // TransformControls is NOT added to the scene graph like a mesh.
    // It's an overlay that operates on the renderer's DOM element and attaches to objects in the scene.
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.75; // Adjust size of the gizmo
    // Listen for when the user starts/stops dragging the controls
    transformControls.addEventListener('dragging-changed', function(event) {
      // Set the flag to disable camera movement when using transform controls
      isTransforming = event.value;
    });

    // Add transform control event listeners for grid snapping when the controlled object changes (stops being dragged)
    // These events fire on the transformControls instance itself.
    transformControls.addEventListener('objectChange', function() {
      // 'objectChange' fires continuously while dragging and once when dragging stops.
      // We only want to snap once dragging is finished.
       if (!transformControls.dragging && selectedBlock && gridSnapEnabled) {
          snapObjectToGrid(selectedBlock);
      }
    });

     // 'mouseUp' on controls also indicates dragging has ended
    transformControls.addEventListener('mouseUp', function() {
        if (selectedBlock && gridSnapEnabled) {
           snapObjectToGrid(selectedBlock);
       }
    });


    // Initialize raycaster and mouse vector for picking objects and determining placement location
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Initialize camera target - the point the camera is looking at and orbiting around
    cameraTarget = new THREE.Vector3(0, 2, 0); // Look slightly above the ground

    // Initialize camera position based on the target and angles
    updateCameraPosition();
  }

  // Create a Lego block (a Group containing the body and studs)
  function createLegoBlock(width, length, color) {
    const block = new THREE.Group(); // Use a Group to hold multiple meshes (body + studs)

    // Main block body
    const bodyHeight = 1; // Standard Lego height unit
    // Adjust geometry size to account for stud overlap or different scaling if needed.
    // For simplicity, using width/length directly here.
    const bodyGeometry = new THREE.BoxGeometry(width, bodyHeight, length);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = bodyHeight / 2; // Center the geometry pivot at the bottom of the body
    body.castShadow = true; // Enable shadow casting from the body
    body.receiveShadow = true; // Enable shadow receiving on the body
    block.add(body); // Add body to the group

    // Add studs on top
    const studRadius = 0.24; // Slightly larger stud radius
    const studHeight = 0.4; // Taller stud height
    const studSegments = 16; // Increased segments for smoother studs
    const studGeometry = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, studSegments);
    const studMaterial = new THREE.MeshPhongMaterial({ color: color }); // Use same color as body

    // Position studs on a grid on top of the block body
    // Stud centers are typically 0.5 units from edges and 1 unit apart
    const startX = -(width / 2) + 0.5;
    const startZ = -(length / 2) + 0.5;

    for (let x = startX; x < width / 2; x += 1) {
      for (let z = startZ; z < length / 2; z += 1) {
        const stud = new THREE.Mesh(studGeometry, studMaterial);
        // Position stud on top of the block body
        stud.position.set(x, bodyHeight + studHeight / 2, z);
        stud.castShadow = true; // Enable shadow casting from studs
        stud.receiveShadow = true; // Enable shadow receiving on studs
        block.add(stud); // Add stud to the group
      }
    }

    // Add custom properties to track grid position and other relevant data
    block.userData = {
      isBlock: true, // Helps identify this group as a block during raycasting
      size: { width, length },
      color: color,
      gridPosition: { x: 0, y: 0, z: 0 } // Placeholder, updated on placement/snap
    };

    return block; // Return the Group object representing the block
  }

  // Place block at a specific grid position
  function placeBlockAtGridPosition(block, x, y, z) {
    block.position.set(x, y, z);
    // Note: userData.gridPosition might store the *snapped* position later,
    // or a more conceptual grid cell coordinate depending on your needs.
    // Setting it here to the initial placement position.
    block.userData.gridPosition = { x, y, z };
    blocks.push(block); // Add to our list of blocks
    scene.add(block); // Add to the Three.js scene
    return block;
  }

  // Delete the currently selected block
  function deleteSelectedBlock() {
    if (selectedBlock) {
      // --- Crucial for Memory Management ---
      // Before removing from the scene, dispose of geometry and material resources
      // to prevent memory leaks over time.
      selectedBlock.traverse((obj) => {
          if (obj.isMesh) { // Check if the object is a Mesh
              if (obj.geometry) {
                  obj.geometry.dispose(); // Dispose the geometry
                  // console.log('Disposed geometry for', obj.uuid); // Optional debug
              }
              // Check if the material exists and dispose it
              // Handle cases where object might have multiple materials (e.g., Array)
              if (obj.material) {
                  if (Array.isArray(obj.material)) {
                      for (const material of obj.material) {
                          material.dispose(); // Dispose each material
                          // console.log('Disposed material for', obj.uuid); // Optional debug
                      }
                  } else {
                      obj.material.dispose(); // Dispose the single material
                       // console.log('Disposed material for', obj.uuid); // Optional debug
                  }
              }
          }
      });
      // --- End Memory Management ---

      scene.remove(selectedBlock); // Remove from the Three.js scene
      blocks = blocks.filter(block => block !== selectedBlock); // Remove from our tracking array
      transformControls.detach(); // Detach controls from the deleted object
      selectedBlock = null; // Clear the selected block variable
    }
  }

  // Snap an object (like a block) to the grid and adjust its Y position for stacking
  function snapObjectToGrid(object) {
    if (!gridSnapEnabled) return;

    // --- X and Z Snapping ---
    // Snap position to the nearest grid point (0, 1, 2, etc.).
    // This means the *center* of a 1x1 block will be at a grid point (like 0,0).
    // The *center* of a 2x2 block will also be at a grid point (like 0,0), meaning
    // its corners will be between grid lines (e.g., at -0.5, -0.5).
    // If you want corners/edges to align with grid points for even blocks,
    // the snap logic would need adjustment based on object size parity.
    object.position.x = Math.round(object.position.x / snapSize) * snapSize;
    object.position.z = Math.round(object.position.z / snapSize) * snapSize;

    // --- Y Stacking Snapping ---
    // Determine the correct Y position for stacking by finding the highest surface below the object.
    const blockHeight = 1; // Standard block height

    // Create a ray originating from slightly above the object's center, pointing straight down.
    const rayOrigin = new THREE.Vector3(
      object.position.x,
      object.position.y + blockHeight * 2, // Start well above the object's current Y
      object.position.z
    );
    const rayDirection = new THREE.Vector3(0, -1, 0); // Pointing downwards

    const ray = new THREE.Raycaster(rayOrigin, rayDirection);
    // Intersect with all other blocks AND the baseplate. Exclude the object itself.
    const objectsToIntersect = blocks.filter(b => b !== object);
    if (basePlate) objectsToIntersect.push(basePlate);

    // Perform the raycast and get intersections
    const intersects = ray.intersectObjects(objectsToIntersect, true); // true for recursive check (children)

    // Find the highest valid intersection point below the object's base.
    // A valid intersection is one that hits a block or the baseplate.
    // We need to be careful not to intersect with the object's own children (studs/body).
    let highestY = -Infinity;
    let hitTargetFound = false; // Flag to know if we hit anything valid below

    for (const intersect of intersects) {
         const hitObject = intersect.object;
         const hitParent = hitObject.parent; // Get the parent (should be a Group for blocks)

         // Check if the hit object is a part of a block (its parent is a Group and is in our blocks list)
         // OR if it's the baseplate. Ensure it's not the object we are snapping or its direct children.
         const isHitBlockPart = hitParent.type === "Group" && blocks.includes(hitParent);
         const isHitBaseplate = hitObject === basePlate;

         if (isHitBlockPart || isHitBaseplate) {
             // If we hit the baseplate, the surface Y is baseplate.position.y + height/2 (which is 0)
             // If we hit a block part, the surface Y is the hit block's position.y + blockHeight (top surface)
             const surfaceY = isHitBaseplate ?
                              basePlate.position.y + basePlate.geometry.parameters.height / 2 : // Y = 0
                              hitParent.position.y + blockHeight; // Top of the block body

              // We only care about intersections *below* the object's base,
              // or at its exact base level if stacking perfectly.
              // The ray starts high, so intersect.point.y will be between rayOrigin.y and the hit surface.
              // We need the Y coordinate of the *surface* that was hit.
              // Using the calculated surfaceY is more reliable than intersect.point.y directly for stacking levels.
              if (surfaceY >= highestY) {
                   highestY = surfaceY;
                   hitTargetFound = true;
              }
         }
    }

    let targetYPos;
    if (hitTargetFound) {
       // If we hit something, stack on top of the highest surface found.
       // A block's base sits AT the Y position. Its height is 1.
       targetYPos = highestY;
    } else {
      // If no valid object was hit below, place on the baseplate surface (Y=0).
      targetYPos = 0;
    }

    // Set the object's Y position
    object.position.y = targetYPos;


    // --- Rotation Snapping ---
    // Snap rotation around the Y axis to increments (e.g., 90 degrees)
    // Ensure rotation snapping happens correctly regardless of current rotation
    // This snaps the current rotation to the nearest snap increment.
    const snappedRotationY = Math.round(object.rotation.y / rotationSnap) * rotationSnap;
    object.rotation.y = snappedRotationY;


    // Update stored grid position in userData after snapping
    // This might be useful for game logic or saving/loading the scene.
    object.userData.gridPosition = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z
    };

     // If the transform controls are attached to this object, update their gizmo position
     // to match the snapped object position immediately.
    if (transformControls.object === object) {
         transformControls.updateMatrixWorld(); // Update controls matrix to follow the object
    }
  }

  // Select a block and attach the transform controls to it
  function selectBlock(block) {
    // Deselect the previously selected block if there is one
    if (selectedBlock) {
      // Remove the highlight material (emissive color)
      if (selectedBlock.children[0] && selectedBlock.children[0].material) {
          selectedBlock.children[0].material.emissive.set(0x000000); // Set emissive color back to black
      }
       // Detach controls from the previous block
       transformControls.detach();
    }

    selectedBlock = block; // Set the new selected block

    // If a new block was selected, highlight it and attach controls
    if (selectedBlock) {
        // Add a highlight (e.g., using emissive color)
        // Assuming the block body is the first child mesh
        if (selectedBlock.children[0] && selectedBlock.children[0].isMesh && selectedBlock.children[0].material) {
            selectedBlock.children[0].material.emissive.set(0x333333); // Add a dark grey emissive for highlight
        }
        // Attach transform controls to the selected block
        transformControls.attach(selectedBlock);
    }
    // If selectedBlock is null (e.g., calling selectBlock(null) to deselect),
    // the logic above will detach controls and clear selectedBlock.
  }

  // Update camera position based on spherical coordinates relative to cameraTarget
  function updateCameraPosition() {
    // Calculate Cartesian coordinates from spherical (distance, horizontal angle, vertical angle)
    camera.position.x = cameraTarget.x + cameraDistance * Math.sin(cameraAngleHorizontal) * Math.cos(cameraAngleVertical);
    camera.position.y = cameraTarget.y + cameraDistance * Math.sin(cameraAngleVertical);
    camera.position.z = cameraTarget.z + cameraDistance * Math.cos(cameraAngleHorizontal) * Math.cos(cameraAngleVertical);
    // Make the camera look at the target point
    camera.lookAt(cameraTarget);
  }

  // Pan the camera (move the cameraTarget and camera)
  function panCamera(deltaX, deltaY) {
    // Calculate pan direction vectors based on camera orientation but parallel to the ground plane
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection); // Get camera's forward direction

    // Calculate the 'right' vector, orthogonal to camera direction and world 'up' (0,1,0)
    const right = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0,1,0)).normalize();
     // Calculate the 'up' vector parallel to the ground, orthogonal to camera direction and 'right'
     const up = new THREE.Vector3().crossVectors(right, cameraDirection).normalize();


    // Scale pan movement by camera distance to maintain a consistent speed regardless of zoom level
    const panSpeed = cameraDistance * 0.002;

    // Move the camera target and camera position
    cameraTarget.add(right.multiplyScalar(-deltaX * panSpeed)); // Pan left/right based on deltaX
    cameraTarget.add(up.multiplyScalar(deltaY * panSpeed));    // Pan up/down (relative to screen) based on deltaY

    // Update the camera's position and orientation based on the new target
    updateCameraPosition();
  }

  // Orbit the camera around the cameraTarget
  function orbitCamera(deltaX, deltaY) {
    // Adjust horizontal angle (around Y axis)
    cameraAngleHorizontal += deltaX * 0.005; // Use deltaX for horizontal orbit

    // Adjust vertical angle (pitch), clamp to prevent flipping over
    cameraAngleVertical += deltaY * 0.005; // Use deltaY for vertical orbit
    // Clamp vertical angle between slightly above -PI/2 and slightly below PI/2
    cameraAngleVertical = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraAngleVertical));

    // Update the camera's position based on the new angles
    updateCameraPosition();
  }

  // Handle mouse move events (raycasting for placement, camera dragging)
  function onMouseMove(event) {
    // Update mouse position (normalized device coordinates) for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Calculate mouse movement delta from the previous frame
    deltaMove = {
      x: event.clientX - previousMousePosition.x,
      y: event.clientY - previousMousePosition.y
    };

    // Handle block placement preview movement
    if (placementMode && placementBlock && !isDragging) { // Only update preview if in placement mode and not dragging camera
      raycaster.setFromCamera(mouse, camera); // Update raycaster with current mouse and camera position

      // Intersect with objects we can place blocks on (other blocks and the baseplate)
      const objectsToIntersect = [...blocks]; // Copy of blocks array
      if (basePlate) objectsToIntersect.push(basePlate); // Add baseplate

      // Find intersections
      const intersects = raycaster.intersectObjects(objectsToIntersect, true); // true to check children (studs/bodies)


      if (intersects.length > 0) {
        // Take the first intersection (closest to the camera)
        const intersect = intersects[0];
        const point = intersect.point; // The point in 3D space where the ray hit
        // Get the normal vector of the face that was hit (useful for placing on top vs side)
        const faceNormal = intersect.face ? intersect.face.normal : new THREE.Vector3(0, 1, 0); // Default to up normal if no face

        // Determine the target Y position for the preview block based on the intersection
        let targetY = 0;
        const blockHeight = 1; // Standard block height

        if (intersect.object === basePlate) {
            // If hitting the baseplate, the block sits on the baseplate's top (Y=0)
            targetY = 0;
        } else {
             // If hitting a block part (stud or body), find its parent block (the Group)
             const hitObject = intersect.object;
             const hitBlock = hitObject.parent.type === "Group" && blocks.includes(hitObject.parent) ?
                            hitObject.parent :
                            null; // Ensure it's actually one of our blocks

             if (hitBlock) {
                // If hitting the top face of a block, stack on top
                 if (Math.abs(faceNormal.dot(new THREE.Vector3(0, 1, 0)) - 1) < 0.01) { // Check if normal is pointing roughly upwards
                     targetY = hitBlock.position.y + blockHeight;
                 } else {
                     // If hitting a side face, place on the ground next to the block
                     targetY = 0;
                 }
             } else {
                 // Fallback: if intersection is unexpected, place on the ground
                  targetY = 0;
             }
        }

        // --- Snap Preview Position ---
        // Snap the intersection point's X and Z coordinates to the grid.
        // This means the block's position will be such that the *hit point* is snapped.
        // Depending on block size and where you click, the block's center might not be on a grid point.
        // The final placement on mouse down will call snapObjectToGrid which snaps the *block's center*.
         const snappedX = Math.round(point.x / snapSize) * snapSize;
         const snappedZ = Math.round(point.z / snapSize) * snapSize;

        // Update the preview block's position
        placementBlock.position.set(snappedX, targetY, snappedZ);

        // No need to call snapObjectToGrid here repeatedly during mouse move,
        // it's better to do it once on mouse down when the block is placed.
      }
    }

    // Handle camera movement if dragging is active and transform controls are not being used
    if (isDragging && !isTransforming) {
      if (isPanning) {
        panCamera(deltaMove.x, deltaMove.y);
      } else if (isOrbiting) {
        orbitCamera(deltaMove.x, deltaMove.y);
      }
    }

    // Update previous mouse position for the next delta calculation
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  // Handle mouse down events (start drag, select block, place block)
  function onMouseDown(event) {
    // Record initial mouse position for drag calculation
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };

    // Check if the user is interacting with the TransformControls gizmo
    // TransformControls sets `dragging` to true when the user clicks AND drags a gizmo axis/plane.
    // However, simply clicking *on* the gizmo without dragging (e.g., to change mode) also needs
    // to be handled so it doesn't trigger selection or camera movement.
    // TransformControls often sets an internal state when its DOM element is clicked.
    // Checking if a control object is attached might also work, but it's not foolproof
    // as you might click *off* the object but still interact with the gizmo bounding box.
    // A simple check is to see if transformControls is currently interacting.
     // The 'pointerdown' event on the renderer.domElement might be a more robust place
     // to check if TransformControls is handling the event via `transformControls.onPointerDown(event)`.
     // For now, let's rely on the `isTransforming` flag which is updated by 'dragging-changed'.
     // If `isTransforming` is true *at the start of the drag*, we should probably not start camera movement.
     // However, TransformControls also needs to receive the initial mouse down.
     // A common pattern is to add controls listeners *before* your own and stop propagation,
     // but Svelte event modifiers or manual handlers are needed for that on the canvas.
     // Let's refine the camera dragging start check:
     if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
         // If middle click (pan) or Shift+Left click (orbit), we start camera dragging.
         // These buttons are less likely to conflict with TransformControls default behavior (usually left click).
         isDragging = true;
         if (event.button === 1) isPanning = true;
         if (event.button === 0 && event.shiftKey) isOrbiting = true;
         event.preventDefault(); // Prevent default browser actions (like scrolling with middle click)
         return; // Stop here, we are starting a camera drag
     }


    // If we are not starting a camera drag with the specific buttons,
    // proceed with selection or placement logic UNLESS TransformControls is active.
    // We need to be careful here. If the user *clicks* on the TransformControls gizmo
    // with the left mouse button (event.button === 0), TransformControls should handle it.
    // We can check if transformControls.object is set and if the raycast hits the gizmo,
    // but a simpler method often used is relying on TransformControls' internal state
    // or binding TransformControls to the DOM element and letting it process events first.
    // The `dragging-changed` event is best for knowing when a *drag* is active,
    // but not just a simple click on the gizmo.

    // A basic check: If controls are attached to an object and this is a left click,
    // assume the user might be trying to interact with controls,
    // unless they are in placement mode which has higher priority for left click.
    const attemptingControlInteraction = selectedBlock && transformControls.object === selectedBlock && event.button === 0;

    if (!attemptingControlInteraction || placementMode) {
        if (event.button === 0) { // Left click
            if (placementMode && placementBlock) {
                // --- Handle placing the block ---
                // Create a new block object based on current settings
                const newBlock = createLegoBlock(
                  placementBlock.userData.size.width,
                  placementBlock.userData.size.length,
                  placementBlock.userData.color
                );
                // Position the new block at the current *preview* block's position
                newBlock.position.copy(placementBlock.position);
                 // Copy the preview block's rotation (from right-click rotation)
                newBlock.rotation.copy(placementBlock.rotation);

                // Add the new block to the scene and our tracking array
                const placedBlock = placeBlockAtGridPosition(
                  newBlock,
                  newBlock.position.x,
                  newBlock.position.y,
                  newBlock.position.z // Initial placement position
                );

                // Apply grid snapping to the newly placed block to finalize its position and stacking height
                snapObjectToGrid(placedBlock);

                // Optionally, select the placed block immediately after placing it
                 selectBlock(placedBlock);

                // Stay in placement mode to place multiple blocks of the same type,
                // or turn it off: placementMode = false; scene.remove(placementBlock); placementBlock = null;
                // Let's stay in placement mode as is currently done by not turning it off here.

            } else {
                // --- Handle selecting a block ---
                raycaster.setFromCamera(mouse, camera); // Update raycaster

                // Intersect with all blocks (checking children recursively)
                const intersects = raycaster.intersectObjects(blocks, true);

                if (intersects.length > 0) {
                  // Find the closest intersection that is a part of a block
                  let clickedBlock = null;
                  for (const intersect of intersects) {
                      const hitObject = intersect.object;
                      // Find the parent Group that represents the block
                      let parentGroup = hitObject.parent;
                      // Traverse up the parent chain if needed, though createLegoBlock puts body/studs directly under Group
                      while(parentGroup && parentGroup.type !== 'Group') {
                          parentGroup = parentGroup.parent;
                      }

                      // Check if the found Group parent is actually one of our managed blocks
                      if (parentGroup && blocks.includes(parentGroup)) {
                          clickedBlock = parentGroup;
                          break; // Found the block, stop searching
                      }
                  }

                  if (clickedBlock) {
                     selectBlock(clickedBlock); // Select the found block
                  } else {
                     // Clicked on something in the scene that is NOT a block (e.g., grid, baseplate, empty space)
                     selectBlock(null); // Deselect any current block
                  }

                } else {
                  // No intersection with any blocks - deselect
                  selectBlock(null);
                }
            }
        } else if (event.button === 2 && placementMode && placementBlock) { // Right click during placement
            // --- Handle rotating the placement preview block ---
            event.preventDefault(); // Prevent context menu

            // Rotate the placement block visually by 90 degrees around Y
            placementBlock.rotation.y += Math.PI / 2;

            // Optional: Swap width and length in userData if your snapping or
            // subsequent logic needs the size relative to the block's current rotation.
            // The current snapObjectToGrid doesn't use userData.size for positioning
            // after the initial raycast point is found, so this swap currently
            // only affects the visual userData property, not the snapping behavior.
            // const temp = placementBlock.userData.size.width;
            // placementBlock.userData.size.width = placementBlock.userData.size.length;
            // placementBlock.userData.size.length = temp;

            // Ensure material side is DoubleSide for transparent preview when rotated
             placementBlock.traverse((obj) => {
               if (obj.isMesh && obj.material && obj.material.isMeshPhongMaterial) {
                 obj.material.side = THREE.DoubleSide;
               }
             });
        }
    }
  }

  // Handle mouse up events (end drag)
  function onMouseUp(event) {
    // Reset dragging flags
    isDragging = false;
    isOrbiting = false;
    isPanning = false;

    // The `transformControls.mouseUp` event listener handles the snap
    // for selected blocks after dragging with controls stops.

    // Update previous mouse position just in case
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  // Handle mouse wheel events (zoom)
  function onWheel(event) {
    // Prevent zoom while using transform controls to avoid conflicts
    if (isTransforming) return;

    event.preventDefault(); // Prevent default page scrolling
    // Adjust camera distance based on wheel delta
    cameraDistance += event.deltaY * 0.05;
    // Clamp camera distance to a reasonable range
    cameraDistance = Math.max(5, Math.min(cameraDistance, 100)); // Adjusted max distance
    // Update camera position based on new distance
    updateCameraPosition();
  }

  // Handler for the "Add Block" button
  function handleAddBlock() {
    if (placementMode) {
      // If already in placement mode, cancel it
      if (placementBlock) {
        scene.remove(placementBlock); // Remove the preview block
        // Dispose of preview block resources (important if not reusing geometry/material)
         placementBlock.traverse((obj) => {
             if (obj.isMesh) {
                 if (obj.geometry) obj.geometry.dispose();
                 if (obj.material) {
                     if (Array.isArray(obj.material)) {
                         for (const mat of obj.material) mat.dispose();
                     } else {
                          mat.dispose();
                     }
                 }
             }
         });
      }
      placementBlock = null;
      placementMode = false;
    } else {
      // If not in placement mode, start it
      // Deselect any currently selected block before entering placement mode
      selectBlock(null); // Uses the selectBlock function to ensure proper detachment/highlight removal

      // Create the preview block with current size and color
      placementBlock = createLegoBlock(
        currentBlockSize.width,
        currentBlockSize.length,
        currentBlockColor
      );
      // Apply a transparent material for the preview block
      placementBlock.traverse((obj) => {
        if (obj.isMesh) {
          // Create a new transparent material for each mesh part if needed,
          // or reuse a single transparent material instance.
          // Creating new ones here ensures disposal works correctly later.
          obj.material = new THREE.MeshPhongMaterial({
            color: currentBlockColor,
            transparent: true,
            opacity: 0.5, // Semi-transparent
            side: THREE.DoubleSide // Render both sides
          });
        }
      });

      scene.add(placementBlock); // Add the preview block to the scene
      placementMode = true; // Set placement mode flag
    }
  }

  // Handler for the block size buttons
  function setBlockSize(width, length) {
    currentBlockSize = { width, length }; // Update the current size
    if (placementMode && placementBlock) {
      // If in placement mode, update the preview block's size
      scene.remove(placementBlock); // Remove old preview block
       // Dispose old preview block resources
       placementBlock.traverse((obj) => {
           if (obj.isMesh) {
               if (obj.geometry) obj.geometry.dispose();
               if (obj.material) {
                    if (Array.isArray(obj.material)) {
                       for (const mat of obj.material) mat.dispose();
                   } else {
                        obj.material.dispose();
                   }
               }
           }
       });

      // Create a new preview block with the updated size and current color
      placementBlock = createLegoBlock(width, length, currentBlockColor);
       // Reapply transparent material
       placementBlock.traverse((obj) => {
            if (obj.isMesh) {
              obj.material = new THREE.MeshPhongMaterial({
                color: currentBlockColor,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
              });
            }
       });
      scene.add(placementBlock); // Add the new preview block
       // Reset rotation when changing size for simplicity
       placementBlock.rotation.y = 0;
    }
  }

  // Handler for the block color buttons
  function setBlockColor(color) {
    currentBlockColor = color; // Update the current color
    // Update color of the placement block if in placement mode
    if (placementBlock) {
      placementBlock.traverse((obj) => {
         if (obj.isMesh && obj.material && obj.material.isMeshPhongMaterial) {
            obj.material.color.set(currentBlockColor); // Set new color
            // Ensure transparency is kept for the preview block
            obj.material.transparent = true;
            obj.material.opacity = 0.5;
            obj.material.side = THREE.DoubleSide;
         }
      });
    }
    // Update color of the selected block if one is selected
    if (selectedBlock) {
        selectedBlock.traverse((obj) => {
            if (obj.isMesh && obj.material && obj.material.isMeshPhongMaterial) {
                 obj.material.color.set(currentBlockColor); // Set new color
                 // Keep the highlight emissive color on the body
                 if (obj === selectedBlock.children[0]) { // Assuming body is first child
                      obj.material.emissive.set(0x333333);
                 } else {
                      obj.material.emissive.set(0x000000);
                 }
            }
        });
    }
  }

  // Handler for the transform mode buttons (Move, Rotate, Scale)
  function setTransformMode(mode) {
    if (transformControls) {
       transformControls.setMode(mode); // Set the mode of the controls
    }
  }

  // Handler for the grid snap toggle button
  function toggleGridSnap() {
    gridSnapEnabled = !gridSnapEnabled; // Toggle the boolean flag
    // If grid snap is now enabled and a block is selected, snap it immediately
    if (gridSnapEnabled && selectedBlock) {
      snapObjectToGrid(selectedBlock);
    }
  }

  // Animation loop (called ~60 times per second)
  function animate() {
    requestAnimationFrame(animate); // Request the next frame
    // Only render if scene, camera, and renderer are initialized
    if (renderer && scene && camera) {
      renderer.render(scene, camera); // Render the scene from the camera's perspective
    }
  }
</script>

<!-- Svelte special elements for handling window-level events -->
<svelte:window
  on:resize={onWindowResize}
  on:keydown={onKeyDown}
  on:contextmenu={onContextMenu}
/>

<!-- Canvas element where Three.js renders -->
<canvas
  bind:this={canvas} 
  on:mousemove={onMouseMove}
  on:mousedown={onMouseDown}
  on:mouseup={onMouseUp}
  on:wheel={onWheel}
></canvas>

<!-- UI Elements -->
<div class="ui">
  <div>
    <!-- Button to add or cancel adding a block -->
    <button on:click={handleAddBlock}>
      {placementMode ? 'Cancel' : 'Add Block'} <!-- Button text changes based on placementMode -->
    </button>
    <!-- Button to delete the selected block -->
    <button on:click={deleteSelectedBlock}>Delete Selected</button>
  </div>
  <div>
    <p>Block Size:</p>
    <!-- Buttons to set the current block size -->
    <button on:click={() => setBlockSize(1, 1)}>1x1</button>
    <button on:click={() => setBlockSize(2, 2)}>2x2</button>
    <button on:click={() => setBlockSize(2, 4)}>2x4</button>
  </div>
  <div>
    <p>Block Color:</p>
    <!-- Buttons to set the current block color -->
    <button class="color-btn" style="background-color: #f44336;" on:click={() => setBlockColor("#f44336")}></button>
    <button class="color-btn" style="background-color: #2196F3;" on:click={() => setBlockColor("#2196F3")}></button>
    <button class="color-btn" style="background-color: #4CAF50;" on:click={() => setBlockColor("#4CAF50")}></button>
    <button class="color-btn" style="background-color: #FFEB3B;" on:click={() => setBlockColor("#FFEB3B")}></button>
    <button class="color-btn" style="background-color: #9C27B0;" on:click={() => setBlockColor("#9C27B0")}></button>
    <button class="color-btn" style="background-color: #FF9800;" on:click={() => setBlockColor("#FF9800")}></button>
  </div>
</div>

<!-- Transform Controls UI -->
<div class="transform-controls">
  <p>Transform Mode:</p>
  <!-- Buttons to change the TransformControls mode -->
  <button on:click={() => setTransformMode('translate')}>Move</button>
  <button on:click={() => setTransformMode('rotate')}>Rotate</button>
  <button on:click={() => setTransformMode('scale')}>Scale</button>
  <p>Options:</p>
  <!-- Toggle button for grid snapping -->
  <button
    class="toggle-btn {gridSnapEnabled ? 'active' : ''}"
    on:click={toggleGridSnap}
  >
    Grid Snap
  </button>
</div>

<!-- Instructions UI -->
<div class="instructions">
  <p><strong>Controls:</strong></p>
  <p>Left Click: Place block / Select block</p>
  <p>Right Click: Rotate block during placement</p>
  <p>Middle Mouse + Drag: Pan camera</p>
  <p>Shift + Left Mouse + Drag: Orbit camera</p>
  <p>Mouse Wheel: Zoom in/out</p>
  <p>Arrow Keys: Rotate camera</p>
  <p>Use transform controls to move, rotate or scale selected blocks</p>
</div>

<style>
  /* Apply styles globally to the body to remove default margins/scrollbars */
  :global(body) {
    margin: 0;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }

  /* Style the canvas to fill the parent container */
  canvas {
    width: 100%;
    height: 100%;
    display: block; /* Prevent extra space below the canvas */
  }

  /* Basic styling for UI panels */
  .ui, .transform-controls, .instructions {
    position: absolute;
    background: rgba(255, 255, 255, 0.8); /* Semi-transparent white background */
    padding: 15px;
    border-radius: 8px;
    z-index: 10; /* Ensure UI is above the canvas */
    user-select: none; /* Prevent text selection issues during interaction */
  }

  .ui {
    top: 10px;
    left: 10px;
    max-width: 200px;
  }

  .transform-controls {
    top: 10px;
    right: 10px;
    max-width: 180px;
    text-align: center;
  }

  .instructions {
    bottom: 10px;
    left: 10px;
    max-width: 300px;
    font-size: 0.9em;
  }


   .ui div {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
  }

   .ui div:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .transform-controls p {
       margin-top: 0;
       margin-bottom: 10px;
       font-weight: bold;
   }

  .instructions p {
       margin: 5px 0;
   }


  button {
    margin: 3px;
    padding: 8px 12px;
    cursor: pointer;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #f8f8f8;
    transition: background-color 0.2s ease;
  }

  button:hover {
      background-color: #e0e0e0;
  }

   .transform-controls button {
       display: block;
       width: calc(100% - 6px); /* Account for margin */
       margin: 5px auto;
   }

  .color-btn {
    width: 30px;
    height: 30px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin: 2px;
    padding: 0;
    display: inline-block;
    vertical-align: middle;
    cursor: pointer;
    /* Background color set inline */
  }

  .toggle-btn {
    background-color: #ccc;
    color: #333;
  }

  .toggle-btn.active {
    background-color: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }
</style>
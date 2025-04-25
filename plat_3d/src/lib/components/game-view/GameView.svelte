<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import * as THREE from "three";
  import Interface from "./Interface.svelte";
  import GameOver from "./GameOver.svelte";
  import { Player } from "./game-objects/player.svelte";
  import { LevelEditor } from "./game-objects/level-editor.svelte";
  import { InputManager } from "./game-managers/input-manager.svelte";

  // Game state
  let isEditorMode = $state(true);
  let showGameOver = $state(false);
  let selectedObjectType = $state("platform");

  // Mouse state
  let isMouseDown = $state(false);
  let mousePosition = $state({ x: 0, y: 0 });
  let justFinishedDragging = $state(false);

  // Game components
  let game = $state<{ ground: THREE.Mesh | null }>({ ground: null });
  let player = $state<Player>();
  let levelEditor = $state<LevelEditor>();
  let inputManager = $state<InputManager>();

  // Scene setup
  let container = $state<HTMLElement>();
  let scene = $state<THREE.Scene>();
  let camera = $state<THREE.PerspectiveCamera>();
  let renderer = $state<THREE.WebGLRenderer>();
  let cameraAngle = $state<number>(0);
  let cameraDistance = $state<number>(15);
  let cameraHeight = $state<number>(5);
  let cameraRotationSpeed = $state<number>(0.05);
  let prevCameraAngle = $state<number>(0);

  function toggleMode() {
    isEditorMode = !isEditorMode;

    if (!isEditorMode) {
      player!.reset();
    }

    return isEditorMode;
  }

  function handleObjectTypeChange(event: Event) {
    selectedObjectType = (event.target as HTMLSelectElement).value;
  }

  function saveLevel() {
    levelEditor!.saveLevel();
    alert("Nível salvo com sucesso!");
  }

  function loadLevel() {
    const success = levelEditor!.loadLevel();
    if (success) {
      alert("Nível carregado com sucesso!");
    } else {
      alert("Nenhum nível salvo encontrado!");
    }
  }

  function newLevel() {
    levelEditor!.clearLevel();
  }

  function hideGameOver() {
    showGameOver = false;
    player!.reset();
  }

  // Window resize handler - moved outside setupScene to be accessible by svelte:window
  function onWindowResize() {
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  function onMouseClick(event: MouseEvent) {
    console.log(`onMouseClick - Start - justFinishedDragging: ${justFinishedDragging}`);
    if (!isEditorMode) return;

    // If we just finished dragging, don't create a new object
    if (justFinishedDragging) {
      console.log("onMouseClick - Detected justFinishedDragging = true, returning early.");
      justFinishedDragging = false;
      return;
    }

    console.log("onMouseClick - Proceeding with click logic.");
    // Calcula posição do mouse normalizada
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );

    // Raycasting para obter o ponto de colisão
    const raycaster = new THREE.Raycaster();
    if (camera) raycaster.setFromCamera(mouse, camera);

    // Check if we clicked on an existing object or gizmo
    if (camera && levelEditor) {
      console.log("onMouseClick - Calling levelEditor.handleClick (for selection)");
      const objectWasSelected = levelEditor.handleClick(raycaster, camera);
      console.log(`onMouseClick - levelEditor.handleClick returned: ${objectWasSelected}`);

      // If handleClick did NOT select an object (meaning we clicked empty space or potentially the gizmo itself,
      // but drag start is handled by onMouseDown now), then check for ground intersection to create a new object.
      if (!objectWasSelected) {
         // Also ensure that a drag wasn't started on mousedown (double check, though justFinishedDragging should cover this)
         if (!levelEditor.isDragging) { 
            console.log("onMouseClick - handleClick returned false and not dragging, checking for ground intersection.");
            // Only target the ground for creating new objects
            const targets = game.ground ? [game.ground] : [];
            const intersects = raycaster.intersectObjects(targets as THREE.Object3D[]);

            if (intersects.length > 0) {
              const point = intersects[0].point;
              console.log("onMouseClick - Ground intersected, creating object at:", point);
              levelEditor.createObject(selectedObjectType, point);
            } else {
              console.log("onMouseClick - No ground intersection found.");
              // If no ground intersection and no object selected, deselect any currently selected object
              console.log("onMouseClick - Deselecting object as click was on empty space.");
              levelEditor.selectObject(null); 
            }
         } else {
             console.log("onMouseClick - handleClick returned false BUT isDragging is true (likely gizmo click handled by mousedown), doing nothing.");
         }
      }
    }
  }

  // Add mouse move handler for dragging
  function onMouseMove(event: MouseEvent) {
    // Update mouse position
    mousePosition = {
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: -(event.clientY / window.innerHeight) * 2 + 1,
    };

    // Handle dragging in editor mode
    if (isEditorMode && isMouseDown) {
      const raycaster = new THREE.Raycaster();
      if (camera) raycaster.setFromCamera(new THREE.Vector2(mousePosition.x, mousePosition.y), camera);

      levelEditor!.handleDrag(raycaster);
    }
  }

  // Add mouse down/up handlers
  function onMouseDown(event: MouseEvent) { // Changed _event to event
    console.log("onMouseDown - Start");
    isMouseDown = true; // Set mouse down state regardless of mode

    if (!isEditorMode || !camera || !levelEditor) return;

    // Calculate mouse position and raycaster for potential drag start
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Try to start dragging immediately if a gizmo axis is clicked
    const dragStarted = levelEditor.startGizmoDrag(raycaster, camera);
    console.log(`onMouseDown - levelEditor.startGizmoDrag returned: ${dragStarted}`);
    // Note: We don't return early here. isMouseDown is set,
    // and if dragStarted is true, onMouseUp will handle setting justFinishedDragging.
    // If drag didn't start here, onMouseClick will handle potential object selection or creation.
  }

  function onMouseUp(_event: MouseEvent) {
    console.log(`onMouseUp - Start - isMouseDown: ${isMouseDown}, levelEditor.isDragging: ${levelEditor?.isDragging}`);
    isMouseDown = false;
    if (isEditorMode && levelEditor) {
      // Check if we were dragging before ending the drag
      if (levelEditor.isDragging) {
        console.log("onMouseUp - Detected active drag, calling endDrag and setting justFinishedDragging = true");
        levelEditor.endDrag();
        // Set flag to prevent object creation on the subsequent click event
        justFinishedDragging = true;
      } else {
        console.log("onMouseUp - No active drag detected");
      }
    }
    console.log(`onMouseUp - End - justFinishedDragging: ${justFinishedDragging}`);
  }

  function updateCameraPosition() {
    const keysPressed = inputManager?.keysPressed || {};

    // Rotação da câmera com Q e E
    if (keysPressed["q"]) {
      cameraAngle += cameraRotationSpeed;
    } else if (keysPressed["e"]) {
      cameraAngle -= cameraRotationSpeed;
    }

    // Verifica se o ângulo da câmera mudou
    if (cameraAngle !== prevCameraAngle) {
      // Atualiza a rotação do jogador para corresponder à rotação da câmera
      player!.mesh.rotation.y = cameraAngle;
      prevCameraAngle = cameraAngle;
    }

    // Calcula a nova posição da câmera baseada no ângulo
    const playerPos = player!.mesh.position;
    const x = playerPos.x + Math.sin(cameraAngle) * cameraDistance;
    const z = playerPos.z + Math.cos(cameraAngle) * cameraDistance;

    // Atualiza posição da câmera
    if (camera) {
      camera.position.set(x, playerPos.y + cameraHeight, z);
      camera.lookAt(playerPos);
    }
  }

  function update() {
    if (!isEditorMode && player && levelEditor) {
      player.update(
        inputManager?.keysPressed || {},
        cameraAngle,
        levelEditor.platforms,
        levelEditor.obstacles,
        levelEditor.goals,
      );

      if (player.hasReachedGoal) {
        showGameOver = true;
        player.hasReachedGoal = false;
      }
    }

    // Mesmo no modo editor, permitimos a rotação da câmera
    if ((inputManager?.keysPressed?.["q"] || inputManager?.keysPressed?.["e"]) && player) {
      updateCameraPosition();
      // Atualiza a rotação do jogador mesmo no modo editor
      player.mesh.rotation.y = cameraAngle;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Céu azul

    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container?.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x339933,
    });
    game.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    game.ground.rotation.x = -Math.PI / 2;
    game.ground.position.y = -2;
    game.ground.receiveShadow = true;
    scene.add(game.ground);

    // Event listeners
    renderer.domElement.addEventListener("click", onMouseClick);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
  }

  function initializeGame() {
    if (scene) {
      player = new Player(scene);
      levelEditor = new LevelEditor(scene);
    }
    inputManager = new InputManager();

    createDemoLevel();
    animate();
  }

  function createDemoLevel() {
    if (levelEditor) {
      levelEditor.createObject("platform", new THREE.Vector3(0, 0, -5));
      levelEditor.createObject("platform", new THREE.Vector3(3, 1, -8));
      levelEditor.createObject("platform", new THREE.Vector3(6, 2, -11));
      levelEditor.createObject("goal", new THREE.Vector3(6, 2, -11));
    }
  }

  // Use browser check to avoid server-side rendering issues

  onMount(() => {
    setupScene();
    initializeGame();
  });

  onDestroy(() => {
    // window.removeEventListener('resize', onWindowResize); // Replaced with svelte:window
    renderer?.domElement?.removeEventListener("click", onMouseClick);
    renderer?.domElement?.removeEventListener("mousemove", onMouseMove);
    renderer?.domElement?.removeEventListener("mousedown", onMouseDown);
    renderer?.domElement?.removeEventListener("mouseup", onMouseUp);

    // Clean up Three.js resources
    scene?.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material: THREE.Material) => material.dispose());
        } else {
          (mesh.material as THREE.Material).dispose();
        }
      }
    });

    renderer?.dispose();
    // No need to remove keydown/keyup event listeners - svelte:window handles this
  });

  // Modify input handling to support keyboard shortcuts for axis selection
  function onKeyDown(e: KeyboardEvent) {
    inputManager && inputManager.onKeyDown(e);

    // Pass key events to level editor in editor mode
    if (isEditorMode && levelEditor) {
      levelEditor.handleKeyDown(e.key.toLowerCase());
    }
  }
</script>

<svelte:window
  onkeydown={(e: KeyboardEvent) => onKeyDown(e)}
  onkeyup={(e: KeyboardEvent) => inputManager && inputManager.onKeyUp(e)}
  onresize={onWindowResize}
/>

<div id="container" bind:this={container}>
  <Interface
    {isEditorMode}
    {selectedObjectType}
    {toggleMode}
    {handleObjectTypeChange}
    {saveLevel}
    {loadLevel}
    {newLevel}
  />

  <GameOver show={showGameOver} onNextLevel={hideGameOver} />
</div>

<style>
  #container {
    position: relative;
    width: 100%;
    height: 100vh;
  }

  :global(body) {
    margin: 0;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }
</style>

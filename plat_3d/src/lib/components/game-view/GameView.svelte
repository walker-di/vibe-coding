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

  function handleObjectTypeChange(event) {
    selectedObjectType = event.target.value;
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

  function onMouseClick(event) {
    if (!isEditorMode) return;

    // Calcula posição do mouse normalizada
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );

    // Raycasting para obter o ponto de colisão
    const raycaster = new THREE.Raycaster();
    if (camera) raycaster.setFromCamera(mouse, camera);

    const allObjects = game.ground ? [game.ground, ...levelEditor!.getAllObjects()] : levelEditor!.getAllObjects();
    const intersects = raycaster.intersectObjects(allObjects as THREE.Object3D[]);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      levelEditor!.createObject(selectedObjectType, point);
    }
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
</script>

<svelte:window
  onkeydown={(e: KeyboardEvent) => inputManager && inputManager.onKeyDown(e)}
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

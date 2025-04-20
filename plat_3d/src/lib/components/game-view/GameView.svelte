<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import * as THREE from 'three';
    import Interface from './Interface.svelte';
    import GameOver from './GameOver.svelte';
    import { Player } from './game-objects/player.svelte';
    import { LevelEditor } from './game-objects/level-editor.svelte';
    import { InputManager } from './game-managers/input-manager.svelte';

    // Game state
    let isEditorMode = true;
    let showGameOver = false;
    let selectedObjectType = 'platform';

    // Game components
    let game;
    let player;
    let levelEditor;
    let inputManager;

    // Scene setup
    let container;
    let scene;
    let camera;
    let renderer;
    let cameraAngle = 0;
    let cameraDistance = 15;
    let cameraHeight = 5;
    let cameraRotationSpeed = 0.05;
    let prevCameraAngle = cameraAngle;

    function toggleMode() {
      isEditorMode = !isEditorMode;

      if (!isEditorMode) {
        player.reset();
      }

      return isEditorMode;
    }

    function handleObjectTypeChange(event) {
      selectedObjectType = event.target.value;
    }

    function saveLevel() {
      levelEditor.saveLevel();
      alert('Nível salvo com sucesso!');
    }

    function loadLevel() {
      const success = levelEditor.loadLevel();
      if (success) {
        alert('Nível carregado com sucesso!');
      } else {
        alert('Nenhum nível salvo encontrado!');
      }
    }

    function newLevel() {
      levelEditor.clearLevel();
    }

    function hideGameOver() {
      showGameOver = false;
      player.reset();
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
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      // Raycasting para obter o ponto de colisão
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const allObjects = [game.ground, ...levelEditor.getAllObjects()];
      const intersects = raycaster.intersectObjects(allObjects);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        levelEditor.createObject(selectedObjectType, point);
      }
    }

    function updateCameraPosition() {
      const keysPressed = inputManager.keysPressed;

      // Rotação da câmera com Q e E
      if (keysPressed['q']) {
        cameraAngle += cameraRotationSpeed;
      } else if (keysPressed['e']) {
        cameraAngle -= cameraRotationSpeed;
      }

      // Verifica se o ângulo da câmera mudou
      if (cameraAngle !== prevCameraAngle) {
        // Atualiza a rotação do jogador para corresponder à rotação da câmera
        player.mesh.rotation.y = cameraAngle;
        prevCameraAngle = cameraAngle;
      }

      // Calcula a nova posição da câmera baseada no ângulo
      const playerPos = player.mesh.position;
      const x = playerPos.x + Math.sin(cameraAngle) * cameraDistance;
      const z = playerPos.z + Math.cos(cameraAngle) * cameraDistance;

      // Atualiza posição da câmera
      camera.position.set(x, playerPos.y + cameraHeight, z);
      camera.lookAt(playerPos);
    }

    function update() {
      if (!isEditorMode) {
        player.update(
          inputManager.keysPressed,
          cameraAngle,
          levelEditor.platforms,
          levelEditor.obstacles,
          levelEditor.goals
        );

        if (player.hasReachedGoal) {
          showGameOver = true;
          player.hasReachedGoal = false;
        }
      }

      // Mesmo no modo editor, permitimos a rotação da câmera
      if (inputManager.keysPressed['q'] || inputManager.keysPressed['e']) {
        updateCameraPosition();
        // Atualiza a rotação do jogador mesmo no modo editor
        player.mesh.rotation.y = cameraAngle;
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      update();
      renderer.render(scene, camera);
    }

    function setupScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB); // Céu azul

      // Camera
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 5, 15);
      camera.lookAt(0, 0, 0);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);

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
      const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x339933 });
      game.ground = new THREE.Mesh(groundGeometry, groundMaterial);
      game.ground.rotation.x = -Math.PI / 2;
      game.ground.position.y = -2;
      game.ground.receiveShadow = true;
      scene.add(game.ground);

      // Event listeners
      renderer.domElement.addEventListener('click', onMouseClick);
    }

    function initializeGame() {
      game = { ground: null };
      player = new Player(scene);
      levelEditor = new LevelEditor(scene);
      inputManager = new InputManager();

      createDemoLevel();
      animate();
    }

    function createDemoLevel() {
      levelEditor.createObject('platform', new THREE.Vector3(0, 0, -5));
      levelEditor.createObject('platform', new THREE.Vector3(3, 1, -8));
      levelEditor.createObject('platform', new THREE.Vector3(6, 2, -11));
      levelEditor.createObject('goal', new THREE.Vector3(6, 2, -11));
    }

    // Use browser check to avoid server-side rendering issues

    onMount(() => {
      if (browser) {
        setupScene();
        initializeGame();
      }
    });

    onDestroy(() => {
      // window.removeEventListener('resize', onWindowResize); // Replaced with svelte:window
      renderer?.domElement?.removeEventListener('click', onMouseClick);

      // Clean up Three.js resources
      scene?.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      renderer?.dispose();
      // No need to remove keydown/keyup event listeners - svelte:window handles this
    });

  </script>

  <svelte:window
    on:keydown={e => inputManager && inputManager.onKeyDown(e)}
    on:keyup={e => inputManager && inputManager.onKeyUp(e)}
    on:resize={onWindowResize}
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

    <GameOver
      show={showGameOver}
      onNextLevel={hideGameOver}
    />
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
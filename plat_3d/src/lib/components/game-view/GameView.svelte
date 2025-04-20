<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import * as THREE from 'three';
    import Interface from './Interface.svelte';
    import GameOver from './GameOver.svelte';

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

    // Player class
    class Player {
      constructor(scene) {
        // Configuração do jogador
        const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x3333ff });
        this.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
        this.mesh.position.set(0, 1, 0);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);

        // Física
        this.velocity = new THREE.Vector3();
        this.gravity = -0.015;
        this.isOnGround = false;
        this.canJump = true;
        this.jumpPower = 0.35;
        this.moveSpeed = 0.15;
        this.hasReachedGoal = false;
      }

      update(keysPressed, cameraAngle, platforms, obstacles, goals) {
        this.updateMovement(keysPressed, cameraAngle);
        this.applyGravity();
        this.checkGroundCollision();
        this.checkPlatformCollision(platforms);
        this.handleJump(keysPressed);
        this.applyVelocity();
        this.checkObstacleCollision(obstacles);
        this.checkGoalCollision(goals);
      }

      updateMovement(keysPressed, cameraAngle) {
        // Cria um vetor para a direção de movimento baseado na orientação da câmera
        const moveDirection = new THREE.Vector3();

        // Movimentação relativa à câmera
        if (keysPressed['w'] || keysPressed['arrowup']) {
          moveDirection.z = -1;
        } else if (keysPressed['s'] || keysPressed['arrowdown']) {
          moveDirection.z = 1;
        }

        if (keysPressed['a'] || keysPressed['arrowleft']) {
          moveDirection.x = -1;
        } else if (keysPressed['d'] || keysPressed['arrowright']) {
          moveDirection.x = 1;
        }

        // Normaliza o vetor se estiver se movendo em diagonal
        if (moveDirection.length() > 0) {
          moveDirection.normalize();

          // Ajusta o vetor de direção com base no ângulo da câmera
          const rotatedDirection = moveDirection.clone();
          rotatedDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);

          // Aplica o movimento
          this.velocity.x = rotatedDirection.x * this.moveSpeed;
          this.velocity.z = rotatedDirection.z * this.moveSpeed;

          // Atualiza a rotação do jogador de acordo com a direção do movimento
          if (moveDirection.length() > 0) {
            // Calcula o ângulo para onde o jogador está se movendo
            const movementAngle = Math.atan2(rotatedDirection.x, rotatedDirection.z);
            this.mesh.rotation.y = movementAngle;
          }
        } else {
          // Desacelera se não houver entrada de movimento
          this.velocity.x *= 0.9;
          this.velocity.z *= 0.9;
        }
      }

      applyGravity() {
        this.velocity.y += this.gravity;
      }

      checkGroundCollision() {
        if (this.mesh.position.y < 1) {
          this.mesh.position.y = 1;
          this.velocity.y = 0;
          this.isOnGround = true;
          this.canJump = true;
        }
      }

      checkPlatformCollision(platforms) {
        // Flag para verificar se o jogador está em alguma plataforma
        let onAnyPlatform = false;

        // Verifica colisão com plataformas
        for (const platform of platforms) {
          // Cria uma caixa de colisão para a plataforma
          const platformBounds = {
            minX: platform.position.x - 1.5,
            maxX: platform.position.x + 1.5,
            minZ: platform.position.z - 1.5,
            maxZ: platform.position.z + 1.5,
            top: platform.position.y + 0.5,
            bottom: platform.position.y - 0.5
          };

          // Cria uma caixa de colisão para o jogador
          const playerBounds = {
            minX: this.mesh.position.x - 0.5,
            maxX: this.mesh.position.x + 0.5,
            minZ: this.mesh.position.z - 0.5,
            maxZ: this.mesh.position.z + 0.5,
            bottom: this.mesh.position.y - 1
          };

          // Verifica se há sobreposição nas coordenadas X e Z
          if (playerBounds.maxX > platformBounds.minX && playerBounds.minX < platformBounds.maxX &&
              playerBounds.maxZ > platformBounds.minZ && playerBounds.minZ < platformBounds.maxZ) {

            // Verifica colisão com o topo da plataforma (jogador em cima)
            if (playerBounds.bottom <= platformBounds.top + 0.2 &&
                this.mesh.position.y > platformBounds.top &&
                this.velocity.y <= 0) {
              this.mesh.position.y = platformBounds.top + 1; // 1 = metade da altura do jogador
              this.velocity.y = 0;
              onAnyPlatform = true;
            }
          }
        }

        if (onAnyPlatform) {
          this.isOnGround = true;
          this.canJump = true;
        } else if (this.mesh.position.y > 1) {
          // Se não está no chão nem em plataforma
          this.isOnGround = false;
        }
      }

      handleJump(keysPressed) {
        // Pulo - verifica se a tecla espaço foi pressionada
        if (this.canJump && this.isOnGround && (keysPressed[' '] || keysPressed['spacebar'])) {
          this.velocity.y = this.jumpPower;
          this.isOnGround = false;
          this.canJump = false;
          // Pequeno delay antes de permitir pular novamente (evita pulos múltiplos)
          setTimeout(() => { this.canJump = true; }, 300);
        }
      }

      applyVelocity() {
        this.mesh.position.x += this.velocity.x;
        this.mesh.position.y += this.velocity.y;
        this.mesh.position.z += this.velocity.z;
      }

      checkObstacleCollision(obstacles) {
        for (const obstacle of obstacles) {
          const distance = this.mesh.position.distanceTo(obstacle.position);
          if (distance < 1.5) { // Raio de colisão
            this.reset();
            break;
          }
        }
      }

      checkGoalCollision(goals) {
        for (const goal of goals) {
          const distance = this.mesh.position.distanceTo(goal.position);
          if (distance < 1.5) { // Raio de colisão
            this.hasReachedGoal = true;
            break;
          }
        }
      }

      reset() {
        this.mesh.position.set(0, 1, 0);
        this.velocity.set(0, 0, 0);
        this.isOnGround = false;
      }
    }

    // Level Editor class
    class LevelEditor {
      constructor(scene) {
        this.scene = scene;
        this.platforms = [];
        this.obstacles = [];
        this.goals = [];
      }

      createObject(type, position) {
        let geometry, material, object;

        switch (type) {
          case 'platform':
            geometry = new THREE.BoxGeometry(3, 1, 3);
            material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            object = new THREE.Mesh(geometry, material);
            object.position.copy(position);
            // Arredonda a posição para facilitar o alinhamento
            object.position.x = Math.round(object.position.x);
            object.position.z = Math.round(object.position.z);
            object.position.y = Math.max(0, object.position.y); // Não permite plataformas abaixo do chão
            object.castShadow = true;
            object.receiveShadow = true;
            object.userData.type = 'platform';
            this.scene.add(object);
            this.platforms.push(object);
            break;

          case 'obstacle':
            geometry = new THREE.ConeGeometry(1, 2, 4);
            material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            object = new THREE.Mesh(geometry, material);
            object.position.copy(position);
            object.position.x = Math.round(object.position.x);
            object.position.z = Math.round(object.position.z);
            object.position.y = Math.max(0, object.position.y) + 1; // Posiciona em cima da superfície
            object.castShadow = true;
            object.userData.type = 'obstacle';
            this.scene.add(object);
            this.obstacles.push(object);
            break;

          case 'goal':
            geometry = new THREE.SphereGeometry(1, 16, 16);
            material = new THREE.MeshStandardMaterial({
              color: 0xffff00,
              emissive: 0xffff00,
              emissiveIntensity: 0.5
            });
            object = new THREE.Mesh(geometry, material);
            object.position.copy(position);
            object.position.x = Math.round(object.position.x);
            object.position.z = Math.round(object.position.z);
            object.position.y = Math.max(0, object.position.y) + 1; // Posiciona em cima da superfície
            object.castShadow = true;
            object.userData.type = 'goal';
            this.scene.add(object);
            this.goals.push(object);
            break;
        }

        return object;
      }

      getAllObjects() {
        return [...this.platforms, ...this.obstacles, ...this.goals];
      }

      clearLevel() {
        // Remove todos os objetos do nível
        this.getAllObjects().forEach(object => {
          this.scene.remove(object);
        });

        this.platforms = [];
        this.obstacles = [];
        this.goals = [];
      }

      saveLevel() {
        const levelData = {
          platforms: this.platforms.map(p => ({
            position: { x: p.position.x, y: p.position.y, z: p.position.z },
            scale: { x: p.scale.x, y: p.scale.y, z: p.scale.z }
          })),
          obstacles: this.obstacles.map(o => ({
            position: { x: o.position.x, y: o.position.y, z: o.position.z }
          })),
          goals: this.goals.map(g => ({
            position: { x: g.position.x, y: g.position.y, z: g.position.z }
          }))
        };

        localStorage.setItem('platformerLevel', JSON.stringify(levelData));
        return levelData;
      }

      loadLevel() {
        const levelData = localStorage.getItem('platformerLevel');
        if (!levelData) {
          return false;
        }

        this.clearLevel();
        const level = JSON.parse(levelData);

        // Carrega plataformas
        level.platforms.forEach(p => {
          const platform = this.createObject('platform', new THREE.Vector3(p.position.x, p.position.y, p.position.z));
          platform.scale.set(p.scale.x, p.scale.y, p.scale.z);
        });

        // Carrega obstáculos
        level.obstacles.forEach(o => {
          this.createObject('obstacle', new THREE.Vector3(o.position.x, o.position.y, o.position.z));
        });

        // Carrega objetivos
        level.goals.forEach(g => {
          this.createObject('goal', new THREE.Vector3(g.position.x, g.position.y, g.position.z));
        });

        return true;
      }
    }

    // Input Manager class
    class InputManager {
      constructor() {
        this.keysPressed = {};
        this.keyJustPressed = {};
        // No longer adding event listeners here - using svelte:window instead
      }

      onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (!this.keysPressed[key]) {
          this.keyJustPressed[key] = true;
        }
        this.keysPressed[key] = true;
      }

      onKeyUp(e) {
        this.keysPressed[e.key.toLowerCase()] = false;
      }

      update() {
        // Atualiza o estado de "acabou de pressionar"
        for (const key in this.keyJustPressed) {
          if (this.keyJustPressed[key]) {
            this.keyJustPressed[key] = false;
          }
        }
      }

      isKeyJustPressed(key) {
        return this.keyJustPressed[key.toLowerCase()];
      }
    }
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
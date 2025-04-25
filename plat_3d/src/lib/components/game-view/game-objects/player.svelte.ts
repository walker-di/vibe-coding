import * as THREE from 'three';

export class Player {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    gravity: number;
    isOnGround: boolean;
    canJump: boolean;
    jumpPower: number;
    moveSpeed: number;
    hasReachedGoal: boolean;

    constructor(scene: THREE.Scene) {
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

    update(keysPressed: Record<string, boolean>, cameraAngle: number, platforms: THREE.Mesh[], obstacles: THREE.Mesh[], goals: THREE.Mesh[]) {
        this.updateMovement(keysPressed, cameraAngle);
        this.applyGravity();
        this.checkGroundCollision();
        this.checkPlatformCollision(platforms);
        this.handleJump(keysPressed);
        this.applyVelocity();
        this.checkObstacleCollision(obstacles);
        this.checkGoalCollision(goals);
    }

    updateMovement(keysPressed: Record<string, boolean>, cameraAngle: number) {
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

    checkPlatformCollision(platforms: THREE.Mesh[]) {
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

    handleJump(keysPressed: Record<string, boolean>) {
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

    checkObstacleCollision(obstacles: THREE.Mesh[]) {
        for (const obstacle of obstacles) {
            const distance = this.mesh.position.distanceTo(obstacle.position);
            if (distance < 1.5) { // Raio de colisão
                this.reset();
                break;
            }
        }
    }

    checkGoalCollision(goals: THREE.Mesh[]) {
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
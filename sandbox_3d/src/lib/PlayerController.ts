import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PlayerController {
    // Camera and physics body
    camera: THREE.PerspectiveCamera;
    body: CANNON.Body;
    mesh: THREE.Object3D | null = null; // Reference to the player's visual mesh

    // Movement state
    moveForward: boolean = false;
    moveBackward: boolean = false;
    moveLeft: boolean = false;
    moveRight: boolean = false;
    canJump: boolean = false;

    // Movement settings
    moveSpeed: number = 5;
    jumpStrength: number = 10;

    // Mouse control
    mouseSensitivity: number = 0.002;
    pitchObject: THREE.Object3D;
    yawObject: THREE.Object3D;

    // Physics
    contactNormal: CANNON.Vec3 = new CANNON.Vec3();
    upAxis: CANNON.Vec3 = new CANNON.Vec3(0, 1, 0);

    // DOM element for pointer lock
    domElement: HTMLElement;

    // Bound event handlers (to allow proper removal)
    private boundOnMouseMove: (event: MouseEvent) => void;
    private boundOnKeyDown: (event: KeyboardEvent) => void;
    private boundOnKeyUp: (event: KeyboardEvent) => void;
    private boundOnPointerLockChange: () => void;

    constructor(camera: THREE.PerspectiveCamera, cannonBody: CANNON.Body, domElement: HTMLElement, playerMesh: THREE.Object3D | null = null) {
        this.camera = camera;
        this.body = cannonBody;
        this.domElement = domElement;
        this.mesh = playerMesh; // Store reference to the player's visual mesh

        // Create pitch and yaw objects for camera control
        this.pitchObject = new THREE.Object3D();
        this.pitchObject.add(camera);

        this.yawObject = new THREE.Object3D();
        this.yawObject.position.y = 1.7; // Eye height
        this.yawObject.add(this.pitchObject);

        // Set initial camera position
        camera.position.set(0, 0, 0); // Camera at center of pitch object
        camera.rotation.set(0, 0, 0); // Reset camera rotation

        // Create bound event handlers
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnKeyDown = this.onKeyDown.bind(this);
        this.boundOnKeyUp = this.onKeyUp.bind(this);
        this.boundOnPointerLockChange = this.onPointerLockChange.bind(this);

        // Setup event listeners
        this.setupPointerLock();
        this.setupKeyboardControls();

        console.log('Player controller initialized with mesh:', playerMesh ? 'Yes' : 'No');
    }

    setupPointerLock() {
        // Pointer lock event listeners
        this.domElement.addEventListener('click', () => {
            // Only request pointer lock if not already locked
            if (document.pointerLockElement !== this.domElement) {
                console.log('Requesting pointer lock...');
                this.domElement.requestPointerLock();
            }
        });

        // Add instructions to the canvas
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.top = '10px';
        instructions.style.width = '100%';
        instructions.style.textAlign = 'center';
        instructions.style.color = 'white';
        instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
        instructions.style.padding = '5px';
        instructions.style.zIndex = '100';
        instructions.innerHTML = 'Click to enable player controls<br>WASD = Move, SPACE = Jump, Mouse = Look';
        this.domElement.parentNode?.appendChild(instructions);

        // Hide instructions when pointer is locked
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.domElement) {
                instructions.style.display = 'none';
            } else {
                instructions.style.display = 'block';
            }
        });

        document.addEventListener('pointerlockchange', this.boundOnPointerLockChange);
    }

    setupKeyboardControls() {
        // Keyboard event listeners
        document.addEventListener('keydown', this.boundOnKeyDown);
        document.addEventListener('keyup', this.boundOnKeyUp);
    }

    onPointerLockChange() {
        if (document.pointerLockElement === this.domElement) {
            // Pointer is locked, enable controls
            document.addEventListener('mousemove', this.boundOnMouseMove);

            // Reset movement state when entering pointer lock
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;

            console.log('Pointer lock enabled - controls active');
        } else {
            // Pointer is unlocked, disable controls
            document.removeEventListener('mousemove', this.boundOnMouseMove);

            // Reset movement state when exiting pointer lock
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;

            // Stop player movement
            if (this.body && this.body.velocity) {
                this.body.velocity.x = 0;
                this.body.velocity.z = 0;
            }

            console.log('Pointer lock disabled - controls inactive');
        }
    }

    onMouseMove(event: MouseEvent) {
        if (document.pointerLockElement !== this.domElement) return;

        try {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            // Rotate yaw (left/right)
            this.yawObject.rotation.y -= movementX * this.mouseSensitivity;

            // Rotate pitch (up/down) with limits to prevent flipping
            this.pitchObject.rotation.x -= movementY * this.mouseSensitivity;
            this.pitchObject.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, this.pitchObject.rotation.x)
            );

            // Force camera to update its matrices
            if (this.camera) {
                this.camera.updateMatrix();
                this.camera.updateMatrixWorld(true);
            }
        } catch (error) {
            console.warn('Error in mouse movement:', error);
        }
    }

    onKeyDown(event: KeyboardEvent) {
        // Only process key events when pointer is locked (player mode is active)
        if (document.pointerLockElement !== this.domElement) return;

        console.log('Key down:', event.code);

        switch (event.code) {
            case 'KeyW':
                this.moveForward = true;
                console.log('Move forward set to true');
                break;
            case 'KeyS':
                this.moveBackward = true;
                console.log('Move backward set to true');
                break;
            case 'KeyA':
                this.moveLeft = true;
                console.log('Move left set to true');
                break;
            case 'KeyD':
                this.moveRight = true;
                console.log('Move right set to true');
                break;
            case 'Space':
                if (this.canJump && this.body) {
                    // Apply jump force
                    if (this.body.velocity) {
                        this.body.velocity.y = this.jumpStrength;
                    }

                    // Also move the body up slightly to ensure it starts moving
                    if (this.body.position) {
                        this.body.position.y += 0.1;
                    }

                    // Wake up the body to ensure physics are applied
                    this.body.wakeUp();

                    this.canJump = false;
                    console.log('Jump!');
                }
                break;
        }
    }

    onKeyUp(event: KeyboardEvent) {
        // Only process key events when pointer is locked (player mode is active)
        if (document.pointerLockElement !== this.domElement) return;

        console.log('Key up:', event.code);

        switch (event.code) {
            case 'KeyW':
                this.moveForward = false;
                console.log('Move forward set to false');
                break;
            case 'KeyS':
                this.moveBackward = false;
                console.log('Move backward set to false');
                break;
            case 'KeyA':
                this.moveLeft = false;
                console.log('Move left set to false');
                break;
            case 'KeyD':
                this.moveRight = false;
                console.log('Move right set to false');
                break;
        }
    }

    update(deltaTime: number) {
        // Safety check - make sure body exists
        if (!this.body) {
            console.warn('No physics body available for player');
            return;
        }

        // Calculate movement direction based on camera orientation
        const inputDirection = new THREE.Vector3();
        const isControlActive = document.pointerLockElement === this.domElement;

        // Debug movement state
        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
            console.log('Movement state:', {
                forward: this.moveForward,
                backward: this.moveBackward,
                left: this.moveLeft,
                right: this.moveRight,
                controlActive: isControlActive
            });
        }

        if (isControlActive) {
            // Apply movement based on key presses
            if (this.moveForward) inputDirection.z = -1;
            if (this.moveBackward) inputDirection.z = 1;
            if (this.moveLeft) inputDirection.x = -1;
            if (this.moveRight) inputDirection.x = 1;

            // Normalize input direction
            if (inputDirection.length() > 0) {
                inputDirection.normalize();
                console.log('Input direction:', inputDirection);
            }

            // Convert input direction to world space
            const euler = new THREE.Euler(0, this.yawObject.rotation.y, 0, 'YXZ');
            const direction = new THREE.Vector3();
            direction.copy(inputDirection).applyEuler(euler);

            // Calculate movement distance based on speed and delta time
            const moveDistance = this.moveSpeed * deltaTime;

            // DIRECT MOVEMENT: Update both physics body and camera directly
            if (inputDirection.length() > 0) {
                // Create movement vector
                const movement = new THREE.Vector3(
                    direction.x * moveDistance,
                    0, // Don't change Y position directly (handled by physics/jumping)
                    direction.z * moveDistance
                );

                // Update physics body position directly
                if (this.body.position) {
                    this.body.position.x += movement.x;
                    this.body.position.z += movement.z;

                    // Wake up the body to ensure physics are applied
                    this.body.wakeUp();

                    // Log movement for debugging
                    console.log('Moving player by:', {
                        x: movement.x.toFixed(2),
                        z: movement.z.toFixed(2)
                    });

                    // Log new position
                    console.log('New player position:', {
                        x: this.body.position.x.toFixed(2),
                        y: this.body.position.y.toFixed(2),
                        z: this.body.position.z.toFixed(2)
                    });

                    // Update the player's visual mesh if available
                    if (this.mesh) {
                        this.mesh.position.copy(this.body.position as unknown as THREE.Vector3);
                        console.log('Updated player mesh position');
                    }
                }

                // Also update the camera position directly
                this.yawObject.position.x = this.body.position.x;
                this.yawObject.position.z = this.body.position.z;
                this.yawObject.position.y = this.body.position.y + 1.7; // Eye height
            }

            // Still set velocity for jumping and falling
            if (this.body.velocity) {
                // Apply horizontal movement to velocity (for physics interactions)
                this.body.velocity.x = direction.x * this.moveSpeed;
                this.body.velocity.z = direction.z * this.moveSpeed;
            }

            // Check for ground contact to enable jumping
            try {
                this.checkGroundContact();
            } catch (error) {
                console.warn('Error checking ground contact:', error);
                // Default to allowing jump if we can't check ground contact
                this.canJump = true;
            }
        } else {
            // If controls are not active, stop horizontal movement
            if (this.body.velocity) {
                this.body.velocity.x = 0;
                this.body.velocity.z = 0;
            }
        }

        // Always update camera position from physics body
        if (this.body.position) {
            // Update the yaw object position
            this.yawObject.position.x = this.body.position.x;
            this.yawObject.position.z = this.body.position.z;
            this.yawObject.position.y = this.body.position.y + 1.7; // Eye height

            // Force camera to update its matrices
            this.camera.updateMatrix();
            this.camera.updateMatrixWorld(true);
        }
    }

    checkGroundContact() {
        // Reset jump ability if touching ground
        this.canJump = false;

        if (!this.body || !this.body.position) return;

        // Simple ground check based on Y position
        // This is more reliable than using contacts which might be undefined
        if (Math.abs(this.body.position.y - 0.9) < 0.1) {
            this.canJump = true;
            return;
        }

        // Fallback to contact check if available
        const contacts = this.body.contacts;
        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            // If no contacts and we're close to the ground, allow jumping
            if (this.body.position.y < 1.0) {
                this.canJump = true;
            }
            return;
        }

        // Check contacts
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            if (!contact || !contact.ni) continue;

            // Check if contact normal is pointing up (we're standing on something)
            if (contact.ni.dot(this.upAxis) > 0.5) {
                this.canJump = true;
                break;
            }
        }
    }

    getObject() {
        return this.yawObject;
    }

    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        const rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        return function(v: THREE.Vector3) {
            rotation.set(this.pitchObject.rotation.x, this.yawObject.rotation.y, 0);
            v.copy(direction).applyEuler(rotation);
            return v;
        };
    }

    // Force camera update - can be called from outside to ensure camera is updated
    // Only use this when absolutely necessary (like after initialization)
    forceUpdate() {
        // Safety check - make sure body exists and has position
        if (!this.body || !this.body.position) return;

        try {
            // Update position from physics body
            const bodyPosition = this.body.position.clone();

            // Update the player's visual mesh if available
            if (this.mesh) {
                this.mesh.position.copy(this.body.position as unknown as THREE.Vector3);
                console.log('Force updated player mesh position');
            }

            // Update camera position (with eye height)
            bodyPosition.y += 1.7; // Eye height
            this.yawObject.position.copy(bodyPosition as unknown as THREE.Vector3);

            // Force camera matrices to update
            this.camera.updateMatrix();
            this.camera.updateMatrixWorld(true);
        } catch (error) {
            console.warn('Error in forceUpdate:', error);
        }
    }

    dispose() {
        // Exit pointer lock if active
        if (document.pointerLockElement === this.domElement) {
            document.exitPointerLock();
        }

        // Remove event listeners
        document.removeEventListener('pointerlockchange', this.boundOnPointerLockChange);
        document.removeEventListener('mousemove', this.boundOnMouseMove);
        document.removeEventListener('keydown', this.boundOnKeyDown);
        document.removeEventListener('keyup', this.boundOnKeyUp);

        // Remove camera from pitch object
        this.pitchObject.remove(this.camera);

        console.log('Player controller disposed');
    }
}

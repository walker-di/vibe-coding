import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PlayerController {
    // Camera and physics body
    camera: THREE.PerspectiveCamera;
    body: CANNON.Body;

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

    constructor(camera: THREE.PerspectiveCamera, cannonBody: CANNON.Body, domElement: HTMLElement) {
        this.camera = camera;
        this.body = cannonBody;
        this.domElement = domElement;

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
    }

    setupPointerLock() {
        // Pointer lock event listeners
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
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
            console.log('Pointer lock enabled - controls active');
        } else {
            // Pointer is unlocked, disable controls
            document.removeEventListener('mousemove', this.boundOnMouseMove);
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
        switch (event.code) {
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump) {
                    this.body.velocity.y = this.jumpStrength;
                    this.canJump = false;
                }
                break;
        }
    }

    onKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    update(deltaTime: number) {
        // Safety check - make sure body exists
        if (!this.body) return;

        // Calculate movement direction based on camera orientation
        const inputDirection = new THREE.Vector3();
        const isControlActive = document.pointerLockElement === this.domElement;

        if (isControlActive) {
            // Apply movement based on key presses
            if (this.moveForward) inputDirection.z = -1;
            if (this.moveBackward) inputDirection.z = 1;
            if (this.moveLeft) inputDirection.x = -1;
            if (this.moveRight) inputDirection.x = 1;

            // Normalize input direction
            if (inputDirection.length() > 0) {
                inputDirection.normalize();
            }

            // Convert input direction to world space
            const euler = new THREE.Euler(0, this.yawObject.rotation.y, 0, 'YXZ');
            const direction = new THREE.Vector3();
            direction.copy(inputDirection).applyEuler(euler);

            // Apply movement to physics body
            if (this.body.velocity) {
                // Apply horizontal movement
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

        // Update camera position from physics body
        if (this.body.position) {
            const bodyPosition = this.body.position.clone();

            // Add eye height offset
            bodyPosition.y += 1.7; // Eye height

            // Update the yaw object position
            this.yawObject.position.copy(bodyPosition as unknown as THREE.Vector3);
        }
    }

    checkGroundContact() {
        // Reset jump ability if touching ground
        this.canJump = false;

        // Safely check contacts - they might be undefined in some cases
        const contacts = this.body.contacts;
        if (!contacts || !Array.isArray(contacts)) {
            return;
        }

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

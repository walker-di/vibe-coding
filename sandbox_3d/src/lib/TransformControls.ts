/**
 * @author arodic / https://github.com/arodic
 * Rewritten to ES6 Class syntax and updated for modern Three.js.
 */

import * as THREE from 'three';

class GizmoMaterial extends THREE.MeshBasicMaterial {
	constructor(parameters) {
		// Pass parameters to the base class constructor
		super(parameters);

		this.depthTest = false;
		this.depthWrite = false;
		this.side = parameters?.side !== undefined ? parameters.side : THREE.FrontSide; // Respect side parameter
		this.transparent = parameters?.transparent !== undefined ? parameters.transparent : true; // Respect transparent parameter
        this.visible = parameters?.visible !== undefined ? parameters.visible : true; // Respect visible parameter
        this.opacity = parameters?.opacity !== undefined ? parameters.opacity : 1; // Respect opacity parameter

		// No need for setValues if super handles parameters
		// this.setValues(parameters); // Removed

		this.oldColor = this.color.clone();
		this.oldOpacity = this.opacity;
	}

	highlight(highlighted) {
		if (highlighted) {
			this.color.setRGB(1, 1, 0);
			this.opacity = 1;
		} else {
			this.color.copy(this.oldColor);
			this.opacity = this.oldOpacity;
		}
	}
}

class GizmoLineMaterial extends THREE.LineBasicMaterial {
	constructor(parameters) {
		// Pass parameters to the base class constructor
		super(parameters);

		this.depthTest = false;
		this.depthWrite = false;
		this.transparent = parameters?.transparent !== undefined ? parameters.transparent : true;
		// Note: linewidth is deprecated in core WebGL, might not have effect
		// this.linewidth = 1; // Removed or keep if using specific line types that support it

		// No need for setValues if super handles parameters
		// this.setValues(parameters); // Removed

		this.oldColor = this.color.clone();
		this.oldOpacity = this.opacity;
	}

	highlight(highlighted) {
		if (highlighted) {
			this.color.setRGB(1, 1, 0);
			this.opacity = 1;
		} else {
			this.color.copy(this.oldColor);
			this.opacity = this.oldOpacity;
		}
	}
}

const pickerMaterial = new GizmoMaterial({ visible: false, transparent: false });

class TransformGizmo extends THREE.Object3D {
	// Define planes property type for safer access
	planes: { [key: string]: THREE.Mesh } = {};
    handles: THREE.Object3D;
    pickers: THREE.Object3D;
    handleGizmos: any; // Use 'any' for simplicity with the original structure
    pickerGizmos: any; // Use 'any' for simplicity
    activePlane: THREE.Mesh | null;

	constructor() {
		super();
		this.handles = new THREE.Object3D();
		this.pickers = new THREE.Object3D();
		this.planes = new THREE.Object3D() as any; // Cast to allow indexed access later

		this.add(this.handles);
		this.add(this.pickers);
		this.add(this.planes);

		// Will be populated by subclasses
		this.handleGizmos = {};
		this.pickerGizmos = {};
		this.activePlane = null;

		// Don't call init here, subclasses should call it after defining gizmos
	}

	// Make init protected or public if subclasses need to call it directly
	// It's called by subclasses in this refactor.
	initGizmo() {
		// PLANES
		const planeGeometry = new THREE.PlaneGeometry(50, 50, 2, 2);
		const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

		const planesData = {
			"XY": new THREE.Mesh(planeGeometry.clone(), planeMaterial.clone()),
			"YZ": new THREE.Mesh(planeGeometry.clone(), planeMaterial.clone()),
			"XZ": new THREE.Mesh(planeGeometry.clone(), planeMaterial.clone()),
			"XYZE": new THREE.Mesh(planeGeometry.clone(), planeMaterial.clone()) // For screen-space rotation/scale
		};

		this.activePlane = planesData["XYZE"];

		planesData["YZ"].rotation.set(0, Math.PI / 2, 0);
		planesData["XZ"].rotation.set(-Math.PI / 2, 0, 0);

		for (const i in planesData) {
			planesData[i].name = i;
			this.planes.add(planesData[i]);
			// Keep a reference directly on the instance for easier access
			this.planes[i] = planesData[i];
		}

		// HANDLES AND PICKERS (populated by subclasses before calling this)
		this.setupGizmos(this.handleGizmos, this.handles);
		this.setupGizmos(this.pickerGizmos, this.pickers);

		// Reset Transformations - Revisit if needed, likely unnecessary now
		// this.traverse((child) => { ... });
	}

	setupGizmos(gizmoMap, parent) {
		for (const name in gizmoMap) {
			// Check if gizmoMap[name] is valid array
			if (!Array.isArray(gizmoMap[name])) continue;

			for (let i = gizmoMap[name].length; i--;) {
                // Check if gizmoMap[name][i] is valid array
                if (!Array.isArray(gizmoMap[name][i])) continue;

				const object = gizmoMap[name][i][0];
				const position = gizmoMap[name][i][1];
				const rotation = gizmoMap[name][i][2];

                // Check if object is a valid THREE.Object3D
                if (!(object instanceof THREE.Object3D)) continue;

				object.name = name;

				if (position) object.position.set(position[0], position[1], position[2]);
				if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);

				parent.add(object);
			}
		}
	}

	highlight(axis) {
		this.traverse((child) => {
			if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                const material = child.material as (GizmoMaterial | GizmoLineMaterial); // Type assertion
                if (material && typeof material.highlight === 'function') {
                    material.highlight(child.name === axis);
                }
            }
		});
	}

	// rotation: Euler, eye: Vector3
	updateMatrixWorld(force?: boolean): void { // Override to include gizmo updates
        // Update world matrix of this gizmo object itself
        super.updateMatrixWorld(force);

        // Update handles and pickers based on camera and object state
        // This logic might need adjustment based on how subclasses implement updateGizmo
        // For now, assume subclasses handle their specific updates.
    }

    // Placeholder for subclass implementation
    updateGizmo(rotation: THREE.Euler, eye: THREE.Vector3) {
        const vec1 = new THREE.Vector3(0, 0, 0);
		const vec2 = new THREE.Vector3(0, 1, 0);
		const lookAtMatrix = new THREE.Matrix4();

		this.traverse((child) => {
            // Only update children that are part of the handles or pickers
            if (child.parent === this.handles || child.parent === this.pickers) {
                if (child.name.includes("E")) {
                    // Use camera world quaternion for screen-aligned elements
                    // This requires the camera to be passed or accessible
                    // For simplicity, using the old lookAt logic for now
                    child.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(eye, vec1, vec2));
                } else if (child.name.includes("X") || child.name.includes("Y") || child.name.includes("Z")) {
                    child.quaternion.setFromEuler(rotation);
                }
            }
		});
    }
}


class TransformGizmoTranslate extends TransformGizmo {
	constructor() {
		super();

		const arrowGeometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 12, 1, false);
		const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3)); // Line points up Y axis

		this.handleGizmos = {
			X: [
				[new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0xff0000 })), [0.5, 0, 0], [0, 0, -Math.PI / 2]],
				[new THREE.Line(lineGeometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(-Math.PI / 2)), new GizmoLineMaterial({ color: 0xff0000 }))] // Rotate line to point along X
			],
			Y: [
				[new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x00ff00 })), [0, 0.5, 0]], // Arrow points up Y
				[new THREE.Line(lineGeometry.clone(), new GizmoLineMaterial({ color: 0x00ff00 }))] // Line already points up Y
			],
			Z: [
				[new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x0000ff })), [0, 0, 0.5], [Math.PI / 2, 0, 0]],
				[new THREE.Line(lineGeometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)), new GizmoLineMaterial({ color: 0x0000ff }))] // Rotate line to point along Z
			],
			XYZ: [
				[new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new GizmoMaterial({ color: 0xffffff, opacity: 0.25 })), [0, 0, 0], [0, 0, 0]]
			],
			XY: [
				[new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.29), new GizmoMaterial({ color: 0xffff00, opacity: 0.25 })), [0.15, 0.15, 0]]
			],
			YZ: [
				[new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.29), new GizmoMaterial({ color: 0x00ffff, opacity: 0.25 })), [0, 0.15, 0.15], [0, Math.PI / 2, 0]]
			],
			XZ: [
				[new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.29), new GizmoMaterial({ color: 0xff00ff, opacity: 0.25 })), [0.15, 0, 0.15], [-Math.PI / 2, 0, 0]]
			]
		};

		this.pickerGizmos = {
			X: [
				[new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [0.6, 0, 0], [0, 0, -Math.PI / 2]]
			],
			Y: [
				[new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [0, 0.6, 0]]
			],
			Z: [
				[new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [0, 0, 0.6], [Math.PI / 2, 0, 0]]
			],
			XYZ: [
				[new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), pickerMaterial)]
			],
			XY: [
				[new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), pickerMaterial), [0.2, 0.2, 0]]
			],
			YZ: [
				[new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), pickerMaterial), [0, 0.2, 0.2], [0, Math.PI / 2, 0]]
			],
			XZ: [
				[new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), pickerMaterial), [0.2, 0, 0.2], [-Math.PI / 2, 0, 0]]
			]
		};

		this.initGizmo(); // Call init from base class AFTER defining gizmos
	}

	// eye: Vector3
	setActivePlane(axis, eye) {
		const tempMatrix = new THREE.Matrix4();
		const normal = new THREE.Vector3(); // Helper vector

		// Ensure planes are initialized before accessing matrixWorld
		if (!this.planes || !this.planes["XY"] || !this.planes["XY"].matrixWorld) return;

        // Get the world normal of the XY plane
        normal.set(0, 0, 1).applyQuaternion(this.planes["XY"].getWorldQuaternion(new THREE.Quaternion()));

		// Align the eye vector relative to the gizmo's rotation
        const gizmoQuaternion = this.getWorldQuaternion(new THREE.Quaternion());
        const relativeEye = eye.clone().applyQuaternion(gizmoQuaternion.invert());


		if (axis === "X") {
			this.activePlane = this.planes["XY"];
			if (Math.abs(relativeEye.y) > Math.abs(relativeEye.z)) this.activePlane = this.planes["XZ"];
		} else if (axis === "Y") {
			this.activePlane = this.planes["XY"];
			if (Math.abs(relativeEye.x) > Math.abs(relativeEye.z)) this.activePlane = this.planes["YZ"];
		} else if (axis === "Z") {
			this.activePlane = this.planes["XZ"];
			if (Math.abs(relativeEye.x) > Math.abs(relativeEye.y)) this.activePlane = this.planes["YZ"];
		} else if (axis === "XYZ") {
			this.activePlane = this.planes["XYZE"];
		} else if (axis === "XY") {
			this.activePlane = this.planes["XY"];
		} else if (axis === "YZ") {
			this.activePlane = this.planes["YZ"];
		} else if (axis === "XZ") {
			this.activePlane = this.planes["XZ"];
		}
	}
}

// Helper function for Circle Geometry (BufferGeometry version)
function createCircleGeometry(radius, facing, arc = 1, divisions = 64) {
	const geometry = new THREE.BufferGeometry();
	const vertices = [];

	for (let i = 0; i <= divisions * arc; ++i) {
		const angle = (i / (divisions / 2)) * Math.PI;
		if (facing === 'x') vertices.push(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
		else if (facing === 'y') vertices.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
		else if (facing === 'z') vertices.push(Math.sin(angle) * radius, Math.cos(angle) * radius, 0);
	}

	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	return geometry;
}


class TransformGizmoRotate extends TransformGizmo {
	constructor() {
		super();

		this.handleGizmos = {
			X: [
				[new THREE.Line(createCircleGeometry(1, 'x', 0.5), new GizmoLineMaterial({ color: 0xff0000 }))]
			],
			Y: [
				[new THREE.Line(createCircleGeometry(1, 'y', 0.5), new GizmoLineMaterial({ color: 0x00ff00 }))]
			],
			Z: [
				[new THREE.Line(createCircleGeometry(1, 'z', 0.5), new GizmoLineMaterial({ color: 0x0000ff }))]
			],
			E: [ // Screen-space rotation handle
				[new THREE.Line(createCircleGeometry(1.25, 'z', 1), new GizmoLineMaterial({ color: 0xcccc00 }))]
			],
			XYZE: [ // Full rotation handle (often a sphere)
				[new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new GizmoMaterial({ color: 0x787878, opacity: 0.25 }))] // Example sphere
			]
		};

		this.pickerGizmos = {
			X: [
				[new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), pickerMaterial), [0, 0, 0], [0, -Math.PI / 2, -Math.PI / 2]]
			],
			Y: [
				[new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), pickerMaterial), [0, 0, 0], [Math.PI / 2, 0, 0]]
			],
			Z: [
				[new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), pickerMaterial), [0, 0, 0], [0, 0, -Math.PI / 2]]
			],
			E: [
				[new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 2, 24), pickerMaterial)]
			],
			XYZE: [
				[new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), pickerMaterial)] // Picker for the sphere
			]
		};

		this.initGizmo();
	}

	setActivePlane(axis) {
		if (!this.planes) return; // Guard against missing planes
		if (axis === "E") this.activePlane = this.planes["XYZE"];
		else if (axis === "X") this.activePlane = this.planes["YZ"];
		else if (axis === "Y") this.activePlane = this.planes["XZ"];
		else if (axis === "Z") this.activePlane = this.planes["XY"];
		else if (axis === "XYZE") this.activePlane = this.planes["XYZE"];
	}

	// rotation: Euler, eye: Vector3
	updateGizmo(rotation, eye) {
		super.updateGizmo(rotation, eye); // Call base class update first

		const tempMatrix = new THREE.Matrix4();
		const worldRotation = new THREE.Euler();
		const tempQuaternion = new THREE.Quaternion();
		const unitX = new THREE.Vector3(1, 0, 0);
		const unitY = new THREE.Vector3(0, 1, 0);
		const unitZ = new THREE.Vector3(0, 0, 1);
		const quaternionX = new THREE.Quaternion();
		const quaternionY = new THREE.Quaternion();
		const quaternionZ = new THREE.Quaternion();
		const eye2 = eye.clone();

		// Ensure planes are initialized
		if (!this.planes || !this.planes["XY"] || !this.planes["XY"].rotation) return;

		// Use world rotation of the gizmo itself if space is world
        // If space is local, the rotation passed in should be the object's world rotation
        // This part needs careful handling based on the 'space' property in TransformControls
        // Assuming 'rotation' is the rotation to apply based on 'space'
        worldRotation.copy(rotation); // Use the passed rotation directly for now

		tempQuaternion.setFromEuler(worldRotation);
		tempMatrix.makeRotationFromQuaternion(tempQuaternion).invert();
		eye2.applyMatrix4(tempMatrix);

		// Update handle orientations based on camera direction
		this.traverse((child) => {
            if (child.parent !== this.handles) return; // Only update handles

			tempQuaternion.setFromEuler(worldRotation); // Reset

			if (child.name === "X") {
				quaternionX.setFromAxisAngle(unitX, Math.atan2(-eye2.y, eye2.z));
				tempQuaternion.multiply(quaternionX); // Use multiply for local rotation
				child.quaternion.copy(tempQuaternion);
			} else if (child.name === "Y") {
				quaternionY.setFromAxisAngle(unitY, Math.atan2(eye2.x, eye2.z));
				tempQuaternion.multiply(quaternionY);
				child.quaternion.copy(tempQuaternion);
			} else if (child.name === "Z") {
				quaternionZ.setFromAxisAngle(unitZ, Math.atan2(eye2.y, eye2.x));
				tempQuaternion.multiply(quaternionZ);
				child.quaternion.copy(tempQuaternion);
			}
            // E and XYZE handles might need different update logic (e.g., align with camera)
            else if (child.name === "E" || child.name === "XYZE") {
                 // Align E handle with camera view? Or keep fixed relative to gizmo?
                 // For now, let base update handle screen-space alignment if implemented there
            }
		});
	}
}


class TransformGizmoScale extends TransformGizmo {
	constructor() {
		super();

		const arrowGeometry = new THREE.BoxGeometry(0.125, 0.125, 0.125);
		const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)); // Line points along X

		this.handleGizmos = {
			X: [
				[new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0xff0000 })), [0.5, 0, 0]],
				[new THREE.Line(lineGeometry.clone(), new GizmoLineMaterial({ color: 0xff0000 }))]
			],
			Y: [
				[new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x00ff00 })), [0, 0.5, 0], [0, 0, Math.PI / 2]], // Rotate handle visually
				[new THREE.Line(lineGeometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2)), new GizmoLineMaterial({ color: 0x00ff00 }))] // Rotate line along Y
			],
			Z: [
				[new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x0000ff })), [0, 0, 0.5], [0, -Math.PI / 2, 0]], // Rotate handle visually
				[new THREE.Line(lineGeometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2)), new GizmoLineMaterial({ color: 0x0000ff }))] // Rotate line along Z
			],
			XYZ: [ // Center cube for uniform scale
				[new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.125, 0.125), new GizmoMaterial({ color: 0xffffff, opacity: 0.25 }))]
			]
		};

		this.pickerGizmos = {
			X: [
				[new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [0.6, 0, 0], [0, 0, -Math.PI / 2]]
			],
			Y: [
				[new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [0, 0.6, 0]]
			],
			Z: [
				[new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [0, 0, 0.6], [Math.PI / 2, 0, 0]]
			],
			XYZ: [
				[new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), pickerMaterial)]
			]
		};

		this.initGizmo();
	}

	// eye: Vector3
	setActivePlane(axis, eye) {
		const tempMatrix = new THREE.Matrix4();
		if (!this.planes || !this.planes["XY"] || !this.planes["XY"].matrixWorld) return;

        const gizmoQuaternion = this.getWorldQuaternion(new THREE.Quaternion());
        const relativeEye = eye.clone().applyQuaternion(gizmoQuaternion.invert());

		if (axis === "X") {
			this.activePlane = this.planes["XY"];
			if (Math.abs(relativeEye.y) > Math.abs(relativeEye.z)) this.activePlane = this.planes["XZ"];
		} else if (axis === "Y") {
			this.activePlane = this.planes["XY"];
			if (Math.abs(relativeEye.x) > Math.abs(relativeEye.z)) this.activePlane = this.planes["YZ"];
		} else if (axis === "Z") {
			this.activePlane = this.planes["XZ"];
			if (Math.abs(relativeEye.x) > Math.abs(relativeEye.y)) this.activePlane = this.planes["YZ"];
		} else if (axis === "XYZ") {
			this.activePlane = this.planes["XYZE"];
		}
	}
}


export class TransformControls extends THREE.Object3D {
	// Public properties
	object: THREE.Object3D | undefined = undefined;
	visible: boolean = false;
	translationSnap: number | null = null;
	rotationSnap: number | null = null;
	space: "world" | "local" = "world";
	size: number = 1;
	axis: string | null = null;
	mode: "translate" | "rotate" | "scale" = "translate";
	camera: THREE.Camera; // Should be PerspectiveCamera or OrthographicCamera
	domElement: HTMLElement;

    // Internal properties
	private _gizmo: { [key: string]: TransformGizmo };
	dragging: boolean = false; // Made public for external access checks

    // Temporary variables reused in methods (consider making private)
    private raycaster = new THREE.Raycaster();
	private pointerVector = new THREE.Vector2();
	private point = new THREE.Vector3();
	private offset = new THREE.Vector3();
	private rotation = new THREE.Vector3(); // Euler for calculation
	private offsetRotation = new THREE.Vector3(); // Euler for calculation
	private scaleFactor = 1; // Renamed from 'scale'
	private lookAtMatrix = new THREE.Matrix4();
	private eye = new THREE.Vector3();
	private tempMatrix = new THREE.Matrix4();
	private tempVector = new THREE.Vector3();
	private tempQuaternion = new THREE.Quaternion();
	private unitX = new THREE.Vector3(1, 0, 0);
	private unitY = new THREE.Vector3(0, 1, 0);
	private unitZ = new THREE.Vector3(0, 0, 1);
	private quaternionXYZ = new THREE.Quaternion();
	private quaternionX = new THREE.Quaternion();
	private quaternionY = new THREE.Quaternion();
	private quaternionZ = new THREE.Quaternion();
	private quaternionE = new THREE.Quaternion();
	private oldPosition = new THREE.Vector3();
	private oldScale = new THREE.Vector3();
	private oldRotationMatrix = new THREE.Matrix4(); // Local rotation
	private parentRotationMatrix = new THREE.Matrix4();
	private parentScale = new THREE.Vector3();
	private worldPosition = new THREE.Vector3();
	private worldRotation = new THREE.Euler(); // World rotation
	private worldScale = new THREE.Vector3(); // World scale
	private worldRotationMatrix = new THREE.Matrix4();
	private camPosition = new THREE.Vector3();
	private camRotation = new THREE.Euler();


	constructor(camera: THREE.Camera, domElement: HTMLElement) {
		super();
		this.camera = camera;
		this.domElement = domElement || document.body; // Default to body if not provided

		this._gizmo = {
			"translate": new TransformGizmoTranslate(),
			"rotate": new TransformGizmoRotate(),
			"scale": new TransformGizmoScale()
		};

		for (const type in this._gizmo) {
			const gizmoObj = this._gizmo[type];
			gizmoObj.visible = (type === this.mode);
			this.add(gizmoObj);
		}

		// Bind event listeners
		this.onPointerHover = this.onPointerHover.bind(this);
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);

		// Attach listeners using pointer events for better compatibility
		this.domElement.addEventListener("pointerdown", this.onPointerDown, false);
		this.domElement.addEventListener("pointermove", this.onPointerHover, false);
		// Move listener attached in onPointerDown to avoid unnecessary checks
		// Up/Cancel listeners attached in onPointerDown
	}

	dispose() {
		this.domElement.removeEventListener("pointerdown", this.onPointerDown, false);
		this.domElement.removeEventListener("pointermove", this.onPointerHover, false);
		this.domElement.removeEventListener("pointermove", this.onPointerMove, false); // Ensure move listener is removed
		this.domElement.removeEventListener("pointerup", this.onPointerUp, false);
		this.domElement.removeEventListener("pointercancel", this.onPointerUp, false); // Ensure cancel listener is removed
        this.domElement.removeEventListener("pointerleave", this.onPointerUp, false); // Ensure leave listener is removed

		this.traverse((child) => {
			if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
		});
        this.clear(); // Remove children
	}

	// object: Object3D
	attach(object: THREE.Object3D): this { // Return this for chaining
		this.object = object;
		this.visible = true;
		this.updateMatrixWorld(true); // Force update world matrix
		this.update(); // Update gizmo state
        return this;
	}

	detach(): this { // Return this for chaining
		this.object = undefined;
		this.visible = false;
		this.axis = null;
        return this;
	}

	getMode(): "translate" | "rotate" | "scale" {
		return this.mode;
	}

	setMode(mode: "translate" | "rotate" | "scale"): void {
		this.mode = mode || this.mode;
		if (this.mode === "scale") this.space = "local";

		for (const type in this._gizmo) {
			this._gizmo[type].visible = (type === this.mode);
		}

		this.update();
		this.dispatchEvent({ type: "change" });
	}

	setTranslationSnap(translationSnap: number | null): void {
		this.translationSnap = translationSnap;
	}

	setRotationSnap(rotationSnap: number | null): void {
		this.rotationSnap = rotationSnap;
	}

	setSize(size: number): void {
		this.size = size;
		this.update();
		this.dispatchEvent({ type: "change" });
	}

	setSpace(space: "world" | "local"): void {
		this.space = space;
		this.update();
		this.dispatchEvent({ type: "change" });
	}

	updateMatrixWorld(force?: boolean): void {
        if (this.object !== undefined) {
            this.object.updateMatrixWorld(force); // Update attached object's matrix

            this.object.matrixWorld.decompose(this.worldPosition, this.tempQuaternion, this.worldScale);
            this.worldRotation.setFromQuaternion(this.tempQuaternion);
            this.worldRotationMatrix.extractRotation(this.object.matrixWorld); // Keep world rotation matrix
        }

        this.camera.updateMatrixWorld(force); // Update camera matrix
		this.camPosition.setFromMatrixPosition(this.camera.matrixWorld);
		// this.camRotation.setFromRotationMatrix(this.tempMatrix.extractRotation(this.camera.matrixWorld)); // camRotation not used?

        // Position the gizmo itself at the object's world position
        this.position.copy(this.worldPosition);

        // Scale the gizmo based on distance to camera
		this.scaleFactor = this.worldPosition.distanceTo(this.camPosition) / 6 * this.size;
		this.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);

		this.eye.copy(this.camPosition).sub(this.worldPosition).normalize();

        // Update the specific gizmo (translate, rotate, scale)
        if (this.space === "local") {
			this._gizmo[this.mode].updateGizmo(this.worldRotation, this.eye);
		} else if (this.space === "world") {
			this._gizmo[this.mode].updateGizmo(new THREE.Euler(), this.eye); // World rotation is zero Euler
		}

        // Call superclass updateMatrixWorld AFTER positioning/scaling the gizmo itself
        super.updateMatrixWorld(force);

        // Highlight the current axis
		this._gizmo[this.mode].highlight(this.axis);
    }

    // --- Event Handlers ---

	private onPointerHover(event: PointerEvent): void {
		if (this.object === undefined || this.dragging === true || event.pointerType === 'touch') return;

		const intersect = this.intersectObjects(event, this._gizmo[this.mode].pickers.children);
		let axis = null;

		if (intersect) {
			axis = intersect.object.name;
		}

		if (this.axis !== axis) {
			this.axis = axis;
            this.updateMatrixWorld(true); // Force update needed? Maybe just update()
			this.update();
			this.dispatchEvent({ type: "change" });
		}
	}

	private onPointerDown(event: PointerEvent): void {
		if (this.object === undefined || this.dragging === true || event.button !== 0) return;

		const intersect = this.intersectObjects(event, this._gizmo[this.mode].pickers.children);

		if (intersect) {
			event.preventDefault();
			event.stopPropagation(); // Prevent other listeners like OrbitControls

			this.dispatchEvent({ type: "mouseDown" });

			this.axis = intersect.object.name;
            this.updateMatrixWorld(true); // Ensure matrices are current before interaction starts
			this.update(); // Update gizmo highlight

			this.eye.copy(this.camPosition).sub(this.worldPosition).normalize();
			this._gizmo[this.mode].setActivePlane(this.axis, this.eye);

			const planeIntersect = this.intersectObjects(event, [this._gizmo[this.mode].activePlane!]); // Assert activePlane is not null

			if (planeIntersect) {
				// Decompose object's local matrix
                this.object.matrix.decompose(this.oldPosition, this.tempQuaternion, this.oldScale);
                this.oldRotationMatrix.makeRotationFromQuaternion(this.tempQuaternion);

                // Decompose parent's world matrix
				if (this.object.parent) {
                    this.object.parent.matrixWorld.decompose(this.tempVector, this.tempQuaternion, this.parentScale);
                    this.parentRotationMatrix.makeRotationFromQuaternion(this.tempQuaternion);
				} else {
					this.parentRotationMatrix.identity();
					this.parentScale.set(1, 1, 1);
				}

				this.offset.copy(planeIntersect.point);
			}
		}

		this.dragging = true;
		// Add move/up listeners only when dragging starts
		this.domElement.style.cursor = 'grabbing'; // Indicate dragging
		this.domElement.addEventListener('pointermove', this.onPointerMove, false);
		this.domElement.addEventListener('pointerup', this.onPointerUp, false);
        this.domElement.addEventListener('pointercancel', this.onPointerUp, false);
        this.domElement.addEventListener('pointerleave', this.onPointerUp, false); // Handle pointer leaving element
		this.domElement.setPointerCapture(event.pointerId); // Capture pointer
	}

	private onPointerMove(event: PointerEvent): void {
		if (this.object === undefined || this.axis === null || this._dragging === false) return;
        // No button check needed here as pointer capture handles it

		const planeIntersect = this.intersectObjects(event, [this._gizmo[this.mode].activePlane!]);

		if (planeIntersect === false) return;

		event.preventDefault();
		event.stopPropagation();

		this.point.copy(planeIntersect.point);

		if (this.mode === "translate") {
			this.point.sub(this.offset); // Calculate delta from offset
			this.point.applyQuaternion(this.tempQuaternion.copy(this.parentRotationMatrix).invert()); // Transform delta to parent's local space
            this.point.divide(this.parentScale); // Account for parent scale

			if (this.space === "local") {
                // Transform delta into object's local space (using old rotation)
                this.point.applyQuaternion(this.tempQuaternion.setFromRotationMatrix(this.oldRotationMatrix).invert());

				if (this.axis.indexOf("X") === -1) this.point.x = 0;
				if (this.axis.indexOf("Y") === -1) this.point.y = 0;
				if (this.axis.indexOf("Z") === -1) this.point.z = 0;

                // Transform delta back to world space relative to old rotation
                this.point.applyQuaternion(this.tempQuaternion.setFromRotationMatrix(this.oldRotationMatrix));

                // Apply delta in world space
				this.object.position.copy(this.oldPosition).add(this.point);

			} else { // World space translation
				if (this.axis.indexOf("X") === -1) this.point.x = 0;
				if (this.axis.indexOf("Y") === -1) this.point.y = 0;
				if (this.axis.indexOf("Z") === -1) this.point.z = 0;

                // Delta is already in parent's local space (relative to world if no parent)
				this.object.position.copy(this.oldPosition).add(this.point);
			}

			if (this.translationSnap !== null) {
                const snap = this.translationSnap;
                // Snap in the coordinate system the movement is happening in
                if (this.space === 'local') {
                    // Temporarily transform to local, snap, transform back
                    const currentPos = this.object.position.clone();
                    const localPos = currentPos.applyMatrix4(this.tempMatrix.copy(this.object.matrixWorld).invert());
                    if (this.axis.includes('X')) localPos.x = Math.round(localPos.x / snap) * snap;
                    if (this.axis.includes('Y')) localPos.y = Math.round(localPos.y / snap) * snap;
                    if (this.axis.includes('Z')) localPos.z = Math.round(localPos.z / snap) * snap;
                    this.object.position.copy(localPos.applyMatrix4(this.object.matrixWorld)); // Apply world matrix back
                } else { // World space snap
                    if (this.axis.includes('X')) this.object.position.x = Math.round(this.object.position.x / snap) * snap;
                    if (this.axis.includes('Y')) this.object.position.y = Math.round(this.object.position.y / snap) * snap;
                    if (this.axis.includes('Z')) this.object.position.z = Math.round(this.object.position.z / snap) * snap;
                }
			}

		} else if (this.mode === "scale") {
			this.point.sub(this.offset);
            this.point.applyQuaternion(this.tempQuaternion.copy(this.parentRotationMatrix).invert());
            this.point.divide(this.parentScale);

			if (this.space === "local") {
                // Transform delta into object's local space
                this.point.applyQuaternion(this.tempQuaternion.setFromRotationMatrix(this.oldRotationMatrix).invert());

				if (this.axis === "XYZ") {
                    // Calculate scale factor based on movement along the camera's up vector projected onto the gizmo plane?
                    // This needs a robust way to determine scale factor from pointer movement.
                    // Original logic used point.y, which might be screen-space dependent.
                    // Let's try a simpler approach: scale based on distance change from center.
                    const currentDist = this.point.length();
                    const startDist = this.tempVector.set(0,0,0).applyMatrix4(this.tempMatrix.copy(this.worldRotationMatrix).invert()).length(); // Approx start dist
                    let scaleFactor = 1;
                    if (startDist > 0.001) {
                         scaleFactor = currentDist / startDist;
                    }
                    // Apply uniformly, ensuring positive scale
					this.object.scale.copy(this.oldScale).multiplyScalar(Math.max(scaleFactor, 0.001));

				} else { // Axis-specific scale
					if (this.axis === "X") this.object.scale.x = Math.max(this.oldScale.x + this.point.x, 0.001);
					if (this.axis === "Y") this.object.scale.y = Math.max(this.oldScale.y + this.point.y, 0.001);
					if (this.axis === "Z") this.object.scale.z = Math.max(this.oldScale.z + this.point.z, 0.001);
				}
			}
			// World space scale is generally not implemented or intuitive

		} else if (this.mode === "rotate") {
            // Calculate rotation based on pointer movement relative to the gizmo center
            const startVec = this.offset.clone().sub(this.worldPosition);
            const currentVec = this.point.clone().sub(this.worldPosition);

            // Project vectors onto the active rotation plane
            const planeNormal = this.tempVector.copy(this._gizmo[this.mode].activePlane!.up).applyQuaternion(this.worldQuaternion); // Get world normal of plane
            startVec.projectOnPlane(planeNormal);
            currentVec.projectOnPlane(planeNormal);

            // Calculate angle between vectors
            let angle = startVec.angleTo(currentVec);

            // Determine direction of rotation
            const cross = this.tempVector.crossVectors(startVec, currentVec);
            if (cross.dot(planeNormal) < 0) {
                angle = -angle; // Reverse angle if cross product points opposite to normal
            }

            if (this.rotationSnap) {
                angle = Math.round(angle / this.rotationSnap) * this.rotationSnap;
            }

            // Apply rotation
            if (this.space === 'local') {
                if (this.axis === 'X') this.quaternionX.setFromAxisAngle(this.unitX, angle);
                else if (this.axis === 'Y') this.quaternionY.setFromAxisAngle(this.unitY, angle);
                else if (this.axis === 'Z') this.quaternionZ.setFromAxisAngle(this.unitZ, angle);
                else if (this.axis === 'E') this.quaternionE.setFromAxisAngle(this.eye, angle); // Screen space
                else if (this.axis === 'XYZE') this.quaternionXYZ.setFromAxisAngle(planeNormal, angle); // All axes (sphere rotation)

                // Combine with old rotation
                const oldQuaternion = this.tempQuaternion.setFromRotationMatrix(this.oldRotationMatrix);
                if (this.axis === 'X') oldQuaternion.multiply(this.quaternionX);
                else if (this.axis === 'Y') oldQuaternion.multiply(this.quaternionY);
                else if (this.axis === 'Z') oldQuaternion.multiply(this.quaternionZ);
                else if (this.axis === 'E') oldQuaternion.premultiply(this.quaternionE); // Screen space rotates around world axis
                else if (this.axis === 'XYZE') oldQuaternion.multiply(this.quaternionXYZ);

                this.object.quaternion.copy(oldQuaternion);

            } else { // World space rotation
                if (this.axis === 'X') this.quaternionX.setFromAxisAngle(this.unitX, angle);
                else if (this.axis === 'Y') this.quaternionY.setFromAxisAngle(this.unitY, angle);
                else if (this.axis === 'Z') this.quaternionZ.setFromAxisAngle(this.unitZ, angle);
                else if (this.axis === 'E') this.quaternionE.setFromAxisAngle(this.eye, angle);
                else if (this.axis === 'XYZE') this.quaternionXYZ.setFromAxisAngle(planeNormal, angle);

                // Get current world quaternion
                const currentWorldQuaternion = this.object.getWorldQuaternion(this.tempQuaternion);
                const parentWorldQuaternionInv = this.object.parent ? this.object.parent.getWorldQuaternion(new THREE.Quaternion()).invert() : new THREE.Quaternion();

                // Apply world rotation delta
                if (this.axis === 'X') currentWorldQuaternion.premultiply(this.quaternionX);
                else if (this.axis === 'Y') currentWorldQuaternion.premultiply(this.quaternionY);
                else if (this.axis === 'Z') currentWorldQuaternion.premultiply(this.quaternionZ);
                else if (this.axis === 'E') currentWorldQuaternion.premultiply(this.quaternionE);
                else if (this.axis === 'XYZE') currentWorldQuaternion.premultiply(this.quaternionXYZ);

                // Convert back to local quaternion
                this.object.quaternion.copy(currentWorldQuaternion).multiply(parentWorldQuaternionInv);
            }
		}

		this.updateMatrixWorld(true); // Update matrices after transform
		this.update(); // Update gizmo appearance
		this.dispatchEvent({ type: "change" });
		this.dispatchEvent({ type: "objectChange" });
	}

	private onPointerUp(event: PointerEvent): void {
		if (event.button !== 0) return;

		if (this._dragging && (this.axis !== null)) {
			this.dispatchEvent({ type: "mouseUp", mode: this.mode });
		}

		this._dragging = false;
		// Don't reset axis here, allow hover to update it
		// this.axis = null;
		this.domElement.style.cursor = 'auto'; // Reset cursor
		// Remove move/up listeners
		this.domElement.removeEventListener('pointermove', this.onPointerMove, false);
		this.domElement.removeEventListener('pointerup', this.onPointerUp, false);
        this.domElement.removeEventListener('pointercancel', this.onPointerUp, false);
        this.domElement.removeEventListener('pointerleave', this.onPointerUp, false);
		this.domElement.releasePointerCapture(event.pointerId); // Release capture

		// Trigger hover check after releasing capture
		this.onPointerHover(event);
        this.updateMatrixWorld(true);
		this.update();
		this.dispatchEvent({ type: "change" });
	}

	// pointer: PointerEvent, objects: Object3D[]
	private intersectObjects(pointer: PointerEvent, objects: THREE.Object3D[]): THREE.Intersection | false {
		const rect = this.domElement.getBoundingClientRect();
		const x = (pointer.clientX - rect.left) / rect.width;
		const y = (pointer.clientY - rect.top) / rect.height;

		this.pointerVector.set((x * 2) - 1, -(y * 2) + 1);
		// Ensure camera is up-to-date before raycasting
        this.camera.updateMatrixWorld();
		this.raycaster.setFromCamera(this.pointerVector, this.camera);

        // Filter out invisible objects before intersecting
        const visibleObjects = objects.filter(obj => obj.visible);

		const intersections = this.raycaster.intersectObjects(visibleObjects, true); // Intersect only visible objects
		return intersections[0] ? intersections[0] : false;
	}
}

// Assign the subclasses to the main export for potential external use if needed
// TransformControls.TransformGizmo = TransformGizmo;
// TransformControls.TransformGizmoTranslate = TransformGizmoTranslate;
// TransformControls.TransformGizmoRotate = TransformGizmoRotate;
// TransformControls.TransformGizmoScale = TransformGizmoScale;

// Note: Default export is removed as we use named export 'export class TransformControls'

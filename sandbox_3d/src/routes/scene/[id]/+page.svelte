<script lang="ts">
	import type { PageData } from './$types'; // Correct import for page data type
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import * as CANNON from 'cannon-es';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Use standard OrbitControls
	import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'; // Use standard TransformControls
	import type {
        SceneObjectJsonData, UploadedModel, SceneData, BaseObjectData, PhysicalObjectData,
        SceneObjectRecord, SceneObjectType // Import missing types
    } from '$lib/types';

	// --- Props ---
	let { data } = $props(); // Data from +page.server.ts load function

	// --- State ---
	// Define a default empty scene that matches the SceneData type
	const defaultScene: SceneData = {
		id: -1,
		name: 'New Scene',
		objects: []
	};

	// Debug function to help diagnose issues
	function debugLog(message: string, ...args: any[]) {
		const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
		console.log(`[${timestamp}] ${message}`, ...args);
		// Also update status message for visibility
		statusMessage = `${timestamp}: ${message}`;
	}

	let sceneState = $state<SceneData>(data.scene || defaultScene); // Reactive scene data with default
	let isNewScene = $state(data.isNew);
	let sceneName = $state(data.scene?.name ?? 'New Scene');
	let availableModels = $state<UploadedModel[]>([]);
	let selectedFile = $state<File | null>(null);
	let isUploading = $state(false);
	let editorMode = $state<'editor' | 'player'>('editor'); // Default to editor mode
    type EditorPanelView = 'create' | 'presets' | 'properties' | 'models';
    let activeEditorPanel = $state<EditorPanelView>('create'); // Default panel view
	let statusMessage = $state('');
	let canvasElement = $state<HTMLCanvasElement | null>(null);
    // Selected object now includes the record for easier data access
    let selectedObject = $state<{ mesh: THREE.Object3D, body?: CANNON.Body, record: SceneObjectRecord } | null>(null);
    // Use a reactive statement ($derived) for easier binding in the properties panel
    let selectedObjData = $derived(selectedObject?.record.data.data as BaseObjectData | undefined);
    type GizmoMode = 'translate' | 'rotate' | 'scale';
    let gizmoMode = $state<GizmoMode>('translate');

	// --- 3D & Physics Engine Refs ---
	let renderer: THREE.WebGLRenderer | null = null;
	let scene: THREE.Scene | null = null;
	let camera: THREE.PerspectiveCamera | null = null;
	let physicsWorld: CANNON.World | null = null;
	let animationFrameId: number | null = null;
	const clock = new THREE.Clock(); // For physics step delta
    // Store the record along with mesh/body
	const linkedObjects: { mesh: THREE.Object3D; body?: CANNON.Body, record: SceneObjectRecord }[] = [];
    const loader = new GLTFLoader(); // Create GLTF Loader instance
    const modelCache = new Map<number, THREE.Group>(); // Simple cache for loaded models
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let groundMesh: THREE.Mesh | null = null; // Declare groundMesh here
    let transformControls: TransformControls | null = null; // Gizmo controls
    let orbitControls: OrbitControls | null = null; // Camera controls (using standard type)

    // Variables for custom transform controls
    let isDragging = false;
    let selectionBox: THREE.BoxHelper | null = null;
    let dragStartPosition = new THREE.Vector3();
    let objectStartPosition = new THREE.Vector3();
    let dragPlane = new THREE.Plane();

    // --- Preset Definitions ---
    type PresetDefinition = {
        name: string;
        type: SceneObjectType; // Use imported type
        primitive: 'box' | 'sphere' | 'cylinder';
        scale: { x: number; y: number; z: number };
        color?: string;
        mass?: number; // Only relevant for physical types
        collisionShape?: 'box' | 'sphere' | 'cylinder'; // Should match primitive for simplicity here
    };

    const presets: PresetDefinition[] = [
        { name: 'Floor Tile', type: 'static', primitive: 'box', scale: { x: 2, y: 0.1, z: 2 }, color: '#cccccc' },
        { name: 'Wall Section', type: 'static', primitive: 'box', scale: { x: 0.2, y: 3, z: 4 }, color: '#aaaaaa' },
        { name: 'Stair Step', type: 'static', primitive: 'box', scale: { x: 1.5, y: 0.2, z: 0.5 }, color: '#bbbbbb' },
        { name: 'Pillar', type: 'static', primitive: 'cylinder', scale: { x: 0.5, y: 4, z: 0.5 }, color: '#999999' },
        { name: 'Tree Trunk', type: 'static', primitive: 'cylinder', scale: { x: 0.4, y: 2.5, z: 0.4 }, color: '#8B4513' }, // Brown
        { name: 'Tree Leaves', type: 'static', primitive: 'sphere', scale: { x: 1.5, y: 1.5, z: 1.5 }, color: '#228B22' }, // Forest Green
        { name: 'Crate', type: 'physical', primitive: 'box', scale: { x: 1, y: 1, z: 1 }, color: '#D2B48C', mass: 5 }, // Tan
        { name: 'Ball', type: 'physical', primitive: 'sphere', scale: { x: 0.5, y: 0.5, z: 0.5 }, color: '#FF4500', mass: 1 }, // OrangeRed
    ];


	// --- Fetch Models ---
	async function fetchModels() {
		try {
			const response = await fetch('/api/models');
			if (!response.ok) {
				throw new Error(`Failed to fetch models: ${response.statusText}`);
			}
			availableModels = await response.json();
			statusMessage = `Loaded ${availableModels.length} models.`;
		} catch (err: any) {
			console.error('Error fetching models:', err);
			statusMessage = `Error fetching models: ${err.message}`;
		}
	}

	// --- Upload Model ---
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			selectedFile = input.files[0];
			statusMessage = `Selected file: ${selectedFile.name}`;
		} else {
			selectedFile = null;
		}
	}

	async function uploadModel() {
		if (!selectedFile) {
			statusMessage = 'No file selected for upload.';
			return;
		}
		isUploading = true;
		statusMessage = `Uploading ${selectedFile.name}...`;

		const formData = new FormData();
		formData.append('modelFile', selectedFile); // Must match the name expected by the API

		try {
			const response = await fetch('/api/models/upload', { // Corrected endpoint
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: response.statusText }));
				throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
			}

			const newModel: UploadedModel = await response.json();
			availableModels = [...availableModels, newModel]; // Add to list
			statusMessage = `Successfully uploaded ${newModel.name} (ID: ${newModel.id}).`;
			selectedFile = null; // Clear selection
            // TODO: Clear the file input visually if needed
		} catch (err: any) {
			console.error('Error uploading model:', err);
			statusMessage = `Upload error: ${err.message}`;
		} finally {
			isUploading = false;
		}
	}

	// --- Save Scene ---
	async function saveScene() {
		statusMessage = 'Saving scene...';
		const sceneId = sceneState?.id;
		const url = sceneId && sceneId > 0 ? `/api/scenes/${sceneId}` : '/api/scenes'; // Handle negative temp IDs
		const method = sceneId && sceneId > 0 ? 'PUT' : 'POST';

        // Filter out temporary negative IDs before saving if needed, or handle on backend
        // For simplicity, let's assume backend handles it or we update IDs on successful POST
		const payload = {
			name: sceneName,
            // Send only the 'data' part of each object record
			objects: sceneState?.objects.map(o => ({ data: o.data })) ?? []
		};

		try {
			const response = await fetch(url, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: response.statusText }));
				throw new Error(`Save failed: ${errorData.message || response.statusText}`);
			}

			const savedScene = await response.json();

            // Update local state with the potentially updated IDs from the backend response
            sceneState = savedScene;
            isNewScene = false; // It's no longer new
            sceneName = savedScene.name; // Ensure name is updated

            // Update URL if it was a new scene
			if (method === 'POST' && savedScene.id) {
                window.history.replaceState(null, '', `/scene/${savedScene.id}`); // Update URL without reload
			}

            // Reload objects to reflect saved state (especially IDs)
            loadSceneObjects(sceneState);

			statusMessage = `Scene '${savedScene.name}' saved successfully.`;

		} catch (err: any) {
			console.error('Error saving scene:', err);
			statusMessage = `Save error: ${err.message}`;
		}
	}

	// --- Lifecycle ---
	// Use a separate variable to track if we've already initialized the scene
	let sceneInitialized = false;

	$effect(() => {
		// This effect runs when `data` prop changes from the load function
		console.log('Scene data loaded:', data.scene);

		// Only run this once to prevent infinite loops
		if (!sceneInitialized) {
			sceneInitialized = true;

			// Only update scene state if data.scene is not null
			if (data.scene) {
				sceneState = data.scene; // Keep state in sync if data prop changes externally
			} else if (!sceneState || data.isNew) {
				// Initialize with default scene if data.scene is null and we don't have a scene state yet
				sceneState = { ...defaultScene }; // Use the predefined default scene
			}

			isNewScene = data.isNew;
			sceneName = data.scene?.name ?? 'New Scene';

			// Re-load objects when scene data changes (e.g., navigating between scenes)
			if (renderer) { // Ensure engine is initialized
				loadSceneObjects(sceneState);
			}
		}
	});

	// --- Initialize 3D Scene & Physics ---
	function initEngine() {
		if (!canvasElement || !renderer) return; // Check renderer too

		// Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x222233);

		// Camera
		camera = new THREE.PerspectiveCamera(75, canvasElement.clientWidth / canvasElement.clientHeight, 0.1, 1000);
		camera.position.set(5, 5, 5);
		camera.lookAt(0, 0, 0);
        scene.add(camera); // Add camera to scene for potential controls later

		// Basic Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true; // Enable shadows
		scene.add(directionalLight);

        // Enable shadows on renderer
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

		// Physics World
		physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0), // Standard gravity
        });
        physicsWorld.broadphase = new CANNON.NaiveBroadphase(); // Simple broadphase for now
        physicsWorld.allowSleep = true; // Allow bodies to sleep for performance

        // Create a more stable contact material
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial, defaultMaterial, {
                friction: 0.3,
                restitution: 0.2, // Less bouncy
                contactEquationStiffness: 1e6, // Stiffer contacts
                contactEquationRelaxation: 3 // More relaxed solving
            }
        );
        physicsWorld.addContactMaterial(defaultContactMaterial);
        physicsWorld.defaultContactMaterial = defaultContactMaterial;

		// Ground Plane (Visual + Physics)
		const groundGeometry = new THREE.PlaneGeometry(100, 100);
		const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });
		groundMesh = new THREE.Mesh(groundGeometry, groundMaterial); // Assign to component-scoped variable
		groundMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        groundMesh.receiveShadow = true; // Ground receives shadows
		scene.add(groundMesh);

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 }); // mass 0 makes it static
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Match visual rotation
        physicsWorld.addBody(groundBody);

        // --- Orbit Controls (Camera) ---
        orbitControls = new OrbitControls(camera, renderer.domElement); // Use standard OrbitControls
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.screenSpacePanning = true; // Often useful
        orbitControls.minDistance = 1;
        orbitControls.maxDistance = 100;
        orbitControls.maxPolarAngle = Math.PI / 2 - 0.1;

        // --- Simple Custom Transform Controls ---
        // Instead of using the standard TransformControls which might be causing issues,
        // we'll implement a simpler approach with direct manipulation

        // Create a helper object to visualize the selected object
        selectionBox = new THREE.BoxHelper(new THREE.Mesh(), 0xffff00);
        selectionBox.visible = false;
        scene.add(selectionBox);

        // Reset dragging state
        isDragging = false;

        // Function to update the selection box
        function updateSelectionBox() {
            if (!selectionBox) return;

            if (selectedObject) {
                selectionBox.setFromObject(selectedObject.mesh);
                selectionBox.visible = true;
                debugLog("Selection box updated");
            } else {
                selectionBox.visible = false;
            }
        }

        // Function to start dragging
        function startDrag(event: MouseEvent) {
            if (!selectedObject || !camera || !canvasElement) return;

            debugLog("Starting drag");
            isDragging = true;

            // Disable orbit controls during drag
            if (orbitControls) orbitControls.enabled = false;

            // Store the starting positions
            objectStartPosition.copy(selectedObject.mesh.position);

            // Create a drag plane perpendicular to the camera
            const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
            dragPlane.setFromNormalAndCoplanarPoint(normal, objectStartPosition);

            // Calculate the starting point on the drag plane
            const rect = canvasElement.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

            const intersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane, intersection);
            dragStartPosition.copy(intersection);

            // Add event listeners for drag and end
            window.addEventListener('mousemove', continueDrag);
            window.addEventListener('mouseup', endDrag);
        }

        // Function to continue dragging
        function continueDrag(event: MouseEvent) {
            if (!isDragging || !selectedObject || !camera || !canvasElement || !selectedObjData) return;

            // Calculate current point on drag plane
            const rect = canvasElement.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
                // Calculate the offset from the start position
                const offset = new THREE.Vector3().subVectors(intersection, dragStartPosition);

                // Apply the offset to the object's position
                selectedObject.mesh.position.copy(objectStartPosition).add(offset);

                // Update the data model
                selectedObjData.x = selectedObject.mesh.position.x;
                selectedObjData.y = selectedObject.mesh.position.y;
                selectedObjData.z = selectedObject.mesh.position.z;

                // Update physics body if it exists
                if (selectedObject.body) {
                    selectedObject.body.position.copy(selectedObject.mesh.position as unknown as CANNON.Vec3);
                    selectedObject.body.velocity.set(0, 0, 0); // Reset velocity during drag
                    selectedObject.body.wakeUp();
                }

                // Update the selection box
                updateSelectionBox();

                debugLog(`Dragging to: ${selectedObject.mesh.position.x.toFixed(2)}, ${selectedObject.mesh.position.y.toFixed(2)}, ${selectedObject.mesh.position.z.toFixed(2)}`);
            }
        }

        // Function to end dragging
        function endDrag() {
            if (!isDragging) return;

            debugLog("Ending drag");
            isDragging = false;

            // Re-enable orbit controls
            if (orbitControls) orbitControls.enabled = true;

            // Remove event listeners
            window.removeEventListener('mousemove', continueDrag);
            window.removeEventListener('mouseup', endDrag);
        }

        // Add mousedown listener to the canvas for dragging
        canvasElement.addEventListener('mousedown', (event) => {
            // Only start drag if we have a selected object and left mouse button is pressed
            if (selectedObject && event.button === 0) {
                startDrag(event);
            }
        });

        // Create a dummy transform controls object to maintain API compatibility
        transformControls = {
            attach: (_object: THREE.Object3D) => {
                debugLog("Custom controls: attach called");
                updateSelectionBox();
            },
            detach: () => {
                debugLog("Custom controls: detach called");
                if (selectionBox) selectionBox.visible = false;
            },
            dispose: () => {
                debugLog("Custom controls: dispose called");
                if (selectionBox) selectionBox.visible = false;
                window.removeEventListener('mousemove', continueDrag);
                window.removeEventListener('mouseup', endDrag);
            },
            dragging: false,
            enabled: true,
            mode: 'translate' as GizmoMode,
            addEventListener: () => {},
            removeEventListener: () => {},
            update: () => {}
        } as unknown as TransformControls;


		// Start Animation Loop
		animate();

        // Add Click Listener for Selection
        canvasElement.addEventListener('click', handleCanvasClick);

		// Handle Resize
		const resizeObserver = new ResizeObserver(entries => {
			if (!renderer || !camera || !canvasElement) return;
			const { width, height } = entries[0].contentRect;
			canvasElement.width = width;
			canvasElement.height = height;
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		});
		resizeObserver.observe(canvasElement);

        // Initial load of objects from data - only if we have a valid scene state
        if (sceneState && sceneState.objects) {
            loadSceneObjects(sceneState);
        } else {
            console.log("No scene state available for initial load");
        }

		// Return cleanup function for resize observer
		return () => {
            canvasElement?.removeEventListener('click', handleCanvasClick);
			resizeObserver.disconnect();
            transformControls?.dispose(); // Dispose transform controls on cleanup
            orbitControls?.dispose(); // Dispose orbit controls on cleanup
		};
	}

    // --- Load Scene Objects ---
    function loadSceneObjects(currentScene: SceneData | null) {
        if (!scene || !physicsWorld) { // Ensure scene and world exist
             console.warn("Scene or Physics World not initialized for loading objects.");
             return;
        }
        // Capture non-null references for use in async callbacks
        const currentSceneRef = scene;
        const currentWorldRef = physicsWorld;

        // --- Clear Existing Objects ---
        selectedObject = null; // Deselect object when reloading
        transformControls?.detach(); // Detach gizmo

        // Remove all previously linked objects explicitly
        linkedObjects.forEach(link => {
            currentSceneRef.remove(link.mesh); // Use captured ref
            // TODO: Dispose geometry/material?
            if (link.body) {
                currentWorldRef.removeBody(link.body); // Use captured ref
            }
        });
        linkedObjects.length = 0; // Clear the array after removing

        // Remove any other potential scene objects not in linkedObjects (less robust, might remove lights etc. if not careful)
        // Consider adding specific userData flags if more scene elements are added besides linkedObjects
        // scene.children.slice().forEach(child => {
        //     if (child.userData.isSceneObject && scene) {
        //         scene.remove(child);
        //     }
        // });
        // --- End Clear ---


        if (!currentScene) {
            console.log("No current scene data to load. Using empty scene.");
            // Use an empty scene for loading, but don't update the global state
            // This prevents potential infinite loops
            currentScene = { ...defaultScene }; // Use the predefined default scene
            // Don't update the global scene state here
        }


        console.log(`Loading ${currentScene.objects.length} objects...`);
        currentScene.objects.forEach(objRecord => {
            const objData = objRecord.data; // This is SceneObjectJsonData { type, data }
            const baseData = objData.data as BaseObjectData; // Cast to base for common properties

            let mesh: THREE.Object3D | null = null;
            let body: CANNON.Body | null = null;
            let shape: CANNON.Shape | null = null;

            const scale = new THREE.Vector3(baseData.sx ?? 1, baseData.sy ?? 1, baseData.sz ?? 1);
            const position = new CANNON.Vec3(baseData.x, baseData.y, baseData.z);
            const quaternion = new CANNON.Quaternion();
            if (baseData.qx !== undefined && baseData.qy !== undefined && baseData.qz !== undefined && baseData.qw !== undefined) {
                quaternion.set(baseData.qx, baseData.qy, baseData.qz, baseData.qw);
            } else if (baseData.rx !== undefined || baseData.ry !== undefined || baseData.rz !== undefined) {
                quaternion.setFromEuler(baseData.rx ?? 0, baseData.ry ?? 0, baseData.rz ?? 0);
            }

            const material = new THREE.MeshStandardMaterial({ color: baseData.color ?? 0xffffff });

            // --- Create Primitive ---
            if (baseData.primitiveType) {
                 switch (baseData.primitiveType) {
                    case 'box':
                        const boxSize = new CANNON.Vec3(scale.x / 2, scale.y / 2, scale.z / 2);
                        shape = new CANNON.Box(boxSize);
                        const boxGeom = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
                        mesh = new THREE.Mesh(boxGeom, material);
                        break;
                    case 'sphere':
                        const radius = Math.max(scale.x, scale.y, scale.z) / 2;
                        shape = new CANNON.Sphere(radius);
                        const sphereGeom = new THREE.SphereGeometry(radius, 32, 16);
                        mesh = new THREE.Mesh(sphereGeom, material);
                        mesh.scale.set(scale.x / (radius*2), scale.y / (radius*2), scale.z / (radius*2));
                        break;
                    case 'cylinder':
                        const cylRadius = Math.max(scale.x, scale.z) / 2;
                        const cylHeight = scale.y;
                        shape = new CANNON.Cylinder(cylRadius, cylRadius, cylHeight, 16);
                        const cylGeom = new THREE.CylinderGeometry(cylRadius, cylRadius, cylHeight, 16);
                        mesh = new THREE.Mesh(cylGeom, material);
                        break;
                }
            }
            // --- Load Custom Model ---
            else if (baseData.modelId) {
                const modelId = baseData.modelId;
                if (modelCache.has(modelId)) {
                    mesh = modelCache.get(modelId)!.clone();
                    const box = new THREE.Box3().setFromObject(mesh);
                    const size = box.getSize(new THREE.Vector3());
                    shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
                } else {
                    fetch(`/api/models/${modelId}/file`)
                        .then(response => { if (!response.ok) throw new Error(`Fetch failed: ${response.status}`); return response.arrayBuffer(); })
                        .then(buffer => loader.parseAsync(buffer, ''))
                        .then(gltf => {
                            console.log(`Successfully loaded model ${modelId}`);
                            const loadedMesh = gltf.scene;
                            loadedMesh.scale.set(scale.x, scale.y, scale.z);
                            modelCache.set(modelId, loadedMesh as THREE.Group);

                            const box = new THREE.Box3().setFromObject(loadedMesh);
                            const size = box.getSize(new THREE.Vector3());
                            const asyncShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));

                            // Use captured refs inside the async callback
                            if (asyncShape) {
                                let mass = (objData.type === 'physical' || objData.type === 'player') ? (objData.data as PhysicalObjectData)?.mass ?? 1 : 0;
                                const asyncBody = new CANNON.Body({ mass, shape: asyncShape, position, quaternion, allowSleep: true, sleepSpeedLimit: 0.1, sleepTimeLimit: 1 });
                                currentWorldRef.addBody(asyncBody); // Use captured ref

                                loadedMesh.position.copy(position as unknown as THREE.Vector3);
                                loadedMesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
                                loadedMesh.userData.isSceneObject = true;
                                loadedMesh.userData.recordId = objRecord.id;
                                loadedMesh.traverse(child => {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    child.userData.recordId = objRecord.id;
                                });
                                currentSceneRef.add(loadedMesh); // Use captured ref
                                linkedObjects.push({ mesh: loadedMesh, body: asyncBody, record: objRecord });
                            }
                        })
                        .catch(err => {
                            console.error(`Error loading model ${modelId}:`, err);
                            const fallbackGeom = new THREE.BoxGeometry(1, 1, 1);
                            const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                            const fallbackMesh = new THREE.Mesh(fallbackGeom, fallbackMat);
                            const fallbackShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
                             // Use captured refs inside the async callback
                             if (fallbackShape) {
                                let mass = (objData.type === 'physical' || objData.type === 'player') ? (objData.data as PhysicalObjectData)?.mass ?? 1 : 0;
                                const fallbackBody = new CANNON.Body({ mass, shape: fallbackShape, position, quaternion, allowSleep: true, sleepSpeedLimit: 0.1, sleepTimeLimit: 1 });
                                currentWorldRef.addBody(fallbackBody); // Use captured ref
                                fallbackMesh.position.copy(position as unknown as THREE.Vector3);
                                fallbackMesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
                                fallbackMesh.userData.isSceneObject = true;
                                fallbackMesh.userData.recordId = objRecord.id;
                                currentSceneRef.add(fallbackMesh); // Use captured ref
                                linkedObjects.push({ mesh: fallbackMesh, body: fallbackBody, record: objRecord });
                            }
                        });
                    return; // Skip synchronous creation part for async loading
                }
            }

            // --- Create Physics Body (Sync Part) ---
            if (shape) {
                let mass = (objData.type === 'physical' || objData.type === 'player') ? (objData.data as PhysicalObjectData)?.mass ?? 1 : 0;
                body = new CANNON.Body({ mass, shape, position, quaternion, allowSleep: true, sleepSpeedLimit: 0.1, sleepTimeLimit: 1 });
                if (physicsWorld) physicsWorld.addBody(body); // Already checked physicsWorld above
            }

            // --- Add Mesh & Link (Sync Part) ---
            if (mesh && scene) { // Already checked scene above
                 mesh.position.copy(position as unknown as THREE.Vector3);
                 mesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
                 mesh.userData.isSceneObject = true;
                 mesh.userData.recordId = objRecord.id;
                 mesh.traverse(child => {
                     child.castShadow = true;
                     child.receiveShadow = true;
                     child.userData.recordId = objRecord.id;
                 });
                 scene.add(mesh);
                 if (body) {
                     linkedObjects.push({ mesh, body, record: objRecord });
                 } else {
                     linkedObjects.push({ mesh, record: objRecord });
                 }
            } else if (!mesh && body) {
                 console.warn("Created physics body without a mesh for object:", objData);
            } else if (!mesh) {
                 console.warn("Could not create mesh for object:", objData);
            }
        });
    }

    // --- Add Preset Object ---
    function addPresetObject(preset: PresetDefinition) {
        if (!scene || !physicsWorld) return; // Ensure scene/world exist

        const tempRecordId = -Date.now();
        const newObjectData: SceneObjectJsonData = {
            type: preset.type,
            data: {
                x: 0, y: preset.scale.y / 2, z: 0,
                sx: preset.scale.x, sy: preset.scale.y, sz: preset.scale.z,
                primitiveType: preset.primitive, color: preset.color,
                ...(preset.type === 'physical' && preset.mass !== undefined && { mass: preset.mass }),
                ...((preset.type === 'physical' || preset.type === 'item' || preset.type === 'weapon' || preset.type === 'player') && { collisionShape: preset.primitive }),
             }
        };
         const tempRecord: SceneObjectRecord = {
             id: tempRecordId,
             sceneId: sceneState?.id ?? -1,
             data: newObjectData
         };

        let mesh: THREE.Object3D | null = null;
        let body: CANNON.Body | null = null;
        let shape: CANNON.Shape | null = null;
        const baseData = newObjectData.data;
        const scale = new THREE.Vector3(baseData.sx ?? 1, baseData.sy ?? 1, baseData.sz ?? 1);
        const position = new CANNON.Vec3(baseData.x, baseData.y, baseData.z);
        const quaternion = new CANNON.Quaternion();
        const material = new THREE.MeshStandardMaterial({ color: baseData.color ?? 0xffffff });

         switch (baseData.primitiveType) {
             case 'box':
                const boxSize = new CANNON.Vec3(scale.x / 2, scale.y / 2, scale.z / 2);
                shape = new CANNON.Box(boxSize);
                const boxGeom = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
                mesh = new THREE.Mesh(boxGeom, material);
                break;
            case 'sphere':
                const radius = Math.max(scale.x, scale.y, scale.z) / 2;
                shape = new CANNON.Sphere(radius);
                const sphereGeom = new THREE.SphereGeometry(radius, 32, 16);
                mesh = new THREE.Mesh(sphereGeom, material);
                mesh.scale.set(scale.x / (radius*2), scale.y / (radius*2), scale.z / (radius*2));
                break;
            case 'cylinder':
                const cylRadius = Math.max(scale.x, scale.z) / 2;
                const cylHeight = scale.y;
                shape = new CANNON.Cylinder(cylRadius, cylRadius, cylHeight, 16);
                const cylGeom = new THREE.CylinderGeometry(cylRadius, cylRadius, cylHeight, 16);
                mesh = new THREE.Mesh(cylGeom, material);
                break;
        }

        if (shape) {
            let mass = (newObjectData.type === 'physical') ? (newObjectData.data as PhysicalObjectData)?.mass ?? 1 : 0;
            body = new CANNON.Body({ mass, shape, position, quaternion, allowSleep: true, sleepSpeedLimit: 0.1, sleepTimeLimit: 1 });
            physicsWorld.addBody(body); // World guaranteed by initial check
        }

        if (mesh && scene) { // Scene guaranteed by initial check
            mesh.position.copy(position as unknown as THREE.Vector3);
            mesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
            mesh.userData.isSceneObject = true;
            mesh.userData.recordId = tempRecordId;
             mesh.traverse(child => {
                 child.castShadow = true;
                 child.receiveShadow = true;
                 child.userData.recordId = tempRecordId;
             });
            scene.add(mesh);

            if (body) {
                linkedObjects.push({ mesh, body, record: tempRecord }); // Add record
            } else {
                 linkedObjects.push({ mesh, record: tempRecord }); // Add record for static mesh
            }

             // Initialize scene state if it's null
             if (!sceneState) {
                 sceneState = { ...defaultScene, name: sceneName }; // Use the predefined default scene with current name
                 console.log("Created new scene state");
             }

             // Add the object to the scene state
             sceneState.objects = [...sceneState.objects, tempRecord];
             console.log(`Added object to scene. Total objects: ${sceneState.objects.length}`);
        } else {
             console.warn("Could not create mesh for preset:", preset);
        }
        statusMessage = `Added preset: ${preset.name}`;
    }

    // --- Property Update Handlers ---
    function updateSelectedObjectPosition(axis: 'x' | 'y' | 'z', value: number) {
        if (!selectedObject || !selectedObjData || !Number.isFinite(value)) return;

        // Validate and store the value
        selectedObjData[axis] = value;

        // Ensure all position values are valid
        const x = Number.isFinite(selectedObjData.x) ? selectedObjData.x : 0;
        const y = Number.isFinite(selectedObjData.y) ? selectedObjData.y : 0;
        const z = Number.isFinite(selectedObjData.z) ? selectedObjData.z : 0;

        // Create position vector with validated values
        const pos = new CANNON.Vec3(x, y, z);

        // Update mesh position
        selectedObject.mesh.position.copy(pos as unknown as THREE.Vector3);

        // Update physics body if it exists
        if (selectedObject.body) {
            selectedObject.body.position.copy(pos);
            selectedObject.body.wakeUp(); // Ensure physics body updates
        }
    }

    function updateSelectedObjectRotation(axis: 'x' | 'y' | 'z', value: number) {
         if (!selectedObject || !selectedObjData || !Number.isFinite(value)) return;

         // Store as Euler for simplicity in UI, convert to Quaternion for physics/rendering
         selectedObjData[`r${axis}`] = value; // Store Euler angle (e.g., rx, ry, rz)

         // Ensure all rotation values are valid
         const rx = Number.isFinite(selectedObjData.rx) ? selectedObjData.rx : 0;
         const ry = Number.isFinite(selectedObjData.ry) ? selectedObjData.ry : 0;
         const rz = Number.isFinite(selectedObjData.rz) ? selectedObjData.rz : 0;

         // Create Euler with validated values
         const euler = new THREE.Euler(
             THREE.MathUtils.degToRad(rx as number),
             THREE.MathUtils.degToRad(ry as number),
             THREE.MathUtils.degToRad(rz as number),
             'YXZ' // Common order, adjust if needed
         );

         // Convert to quaternion
         const quat = new THREE.Quaternion().setFromEuler(euler);

         // Validate quaternion components
         if (!Number.isFinite(quat.x) || !Number.isFinite(quat.y) ||
             !Number.isFinite(quat.z) || !Number.isFinite(quat.w)) {
             console.warn('Invalid quaternion generated, skipping rotation update');
             return;
         }

         // Apply rotation to mesh
         selectedObject.mesh.quaternion.copy(quat);

         // Update quaternion representation in data for saving
         selectedObjData.qx = quat.x;
         selectedObjData.qy = quat.y;
         selectedObjData.qz = quat.z;
         selectedObjData.qw = quat.w;

         // Update physics body if it exists
         if (selectedObject.body) {
             selectedObject.body.quaternion.copy(quat as unknown as CANNON.Quaternion);
             selectedObject.body.wakeUp();
         }
    }

     function updateSelectedObjectScale(axis: 'x' | 'y' | 'z', value: number) {
         if (!selectedObject || !selectedObjData || !Number.isFinite(value) || value <= 0) return;

         // Store the validated value
         selectedObjData[`s${axis}`] = value;

         // NOTE: Changing scale after creation is complex for physics and mesh geometry.
         // For primitives, we'd need to recreate the geometry AND the physics shape.
         // For loaded models, we can scale the mesh group, but physics shape update is hard.
         // Simplification: For now, only update the mesh scale visually for loaded models.
         // Primitive scale changes require recreating the object (more advanced).
         if (!selectedObjData.primitiveType && selectedObject.mesh) {
             try {
                 // Access scale properties directly with validation
                 if (axis === 'x') selectedObject.mesh.scale.x = value;
                 else if (axis === 'y') selectedObject.mesh.scale.y = value;
                 else if (axis === 'z') selectedObject.mesh.scale.z = value;
                 console.warn("Visual scale updated, but physics shape may not match precisely for loaded models.");
             } catch (err) {
                 console.error("Error updating scale:", err);
             }
         } else if (selectedObjData.primitiveType) {
             console.warn("Scaling primitives after creation is not fully supported yet. Recreate object for accurate physics.");
             // Ideally, find the linked object, remove it, update the record, and call a 'createObjectFromRecord' function.
         }
         // TODO: Implement robust scaling by recreating mesh/body or using more advanced physics shape scaling if available.
     }

     function updateSelectedObjectColor(value: string) {
         if (!selectedObject || !selectedObjData) return;
         selectedObjData.color = value;
         if (selectedObject.mesh instanceof THREE.Mesh && selectedObject.mesh.material instanceof THREE.MeshStandardMaterial) {
             selectedObject.mesh.material.color.set(value);
         } else {
             // Handle group materials or other types if necessary
             selectedObject.mesh.traverse(child => {
                 if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                     child.material.color.set(value);
                 }
             });
         }
     }


    // --- Object Selection ---
    function handleCanvasClick(event: MouseEvent) {
        // Skip selection if we're in player mode or already dragging
        if (!canvasElement || !camera || !scene || editorMode !== 'editor' || isDragging) return;

        debugLog("Canvas click detected");

        const rect = canvasElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true); // Check recursively

        let clickedLink: typeof selectedObject = null; // Use the same type as selectedObject

        if (intersects.length > 0) {
            let clickedMesh: THREE.Object3D | null = null;
            for (const intersect of intersects) {
                // Skip selection box in raycast results
                if (selectionBox && (intersect.object === selectionBox || intersect.object.parent === selectionBox)) {
                    continue;
                }

                let parent = intersect.object;
                while (parent && parent.userData.recordId === undefined) {
                    if (!parent.parent) break;
                    parent = parent.parent;
                }

                if (parent && parent.userData.recordId !== undefined) {
                    if (parent !== groundMesh) { // Don't select the ground
                        clickedMesh = parent;
                        debugLog(`Found clickable object: ${parent.userData.recordId}`);
                        break;
                    }
                }
            }

            if (clickedMesh && clickedMesh.userData.recordId !== undefined) {
                const recordId = clickedMesh.userData.recordId;
                clickedLink = linkedObjects.find(link => link.record.id === recordId) ?? null;
                debugLog(`Found linked object with ID: ${recordId}`);
            }
        }

        if (clickedLink) {
            selectedObject = clickedLink;
            transformControls?.attach(selectedObject.mesh); // This now calls our custom attach method
            activeEditorPanel = 'properties';
            statusMessage = `Selected object ID: ${selectedObject.record.id}`;
            debugLog(`Selected object ID: ${selectedObject.record.id}`);
        } else {
            // Clicked empty space or non-selectable object
            if (selectedObject) { // Only deselect if something was selected
                debugLog("Deselected object");
                statusMessage = 'Deselected object.';
            }
            selectedObject = null;
            transformControls?.detach(); // This now calls our custom detach method
        }
    }


	// --- Animation Loop ---
	function animate() {
		if (!renderer || !scene || !camera || !physicsWorld) return;

		animationFrameId = requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        // Update orbit controls
        if (orbitControls) orbitControls.update();

        // Only step physics if not dragging a gizmo (to prevent conflicts)
        if (!transformControls?.dragging) {
            physicsWorld.step(1 / 60, deltaTime, 3);

            for (const link of linkedObjects) {
                if (link.body) {
                    try {
                        // Skip physics update for the currently selected object if being manipulated
                        if (selectedObject === link && transformControls?.dragging) continue;

                        // Simple direct update with minimal validation
                        // Copy position from physics to visual mesh
                        link.mesh.position.copy(link.body.position as unknown as THREE.Vector3);

                        // Normalize quaternion before copying to ensure it's valid
                        const quat = link.body.quaternion;
                        const length = Math.sqrt(quat.x * quat.x + quat.y * quat.y + quat.z * quat.z + quat.w * quat.w);

                        // Only apply rotation if quaternion is valid
                        if (length > 0.0001) {
                            link.mesh.quaternion.copy(quat as unknown as THREE.Quaternion);
                        } else {
                            // Reset to identity quaternion if invalid
                            link.body.quaternion.set(0, 0, 0, 1);
                            link.body.angularVelocity.set(0, 0, 0);
                        }
                    } catch (err) {
                        console.error('Error updating physics:', err);
                        // Reset physics state if there's an error
                        link.body.velocity.set(0, 0, 0);
                        link.body.angularVelocity.set(0, 0, 0);
                    }
                }
            }
        }
		renderer.render(scene, camera);
	}

	// --- Cleanup ---
	function cleanupEngine() {
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
        canvasElement?.removeEventListener('click', handleCanvasClick);
        transformControls?.dispose(); // Dispose gizmo
        scene?.traverse(object => {
            if (object instanceof THREE.Mesh) {
                object.geometry?.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material?.dispose();
                }
            }
        });
		if (renderer) renderer.dispose();
		renderer = null; scene = null; camera = null; physicsWorld = null; transformControls = null;
		console.log('3D Engine cleaned up');
	}

    let resizeCleanup: (() => void) | undefined = undefined;

    onMount(() => {
        // Initialize renderer first
        if (!canvasElement) {
             console.error("Canvas element not found on mount!");
             return;
        }
        renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
		renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        fetchModels();
        resizeCleanup = initEngine(); // initEngine now assumes renderer exists

    });

    onDestroy(() => {
        if (resizeCleanup) resizeCleanup();
        cleanupEngine();
    });

    // Reactive effect to update gizmo mode
    $effect(() => {
        if (transformControls) {
            transformControls.mode = gizmoMode;
        }
    });

</script>

<svelte:head>
	<title>{sceneName} - Scene Editor</title>
</svelte:head>

<div class="flex flex-col h-screen">
	<!-- Header / Toolbar -->
	<header class="bg-gray-800 text-white p-2 flex justify-between items-center shadow-md">
		<div>
			<label for="sceneNameInput" class="sr-only">Scene Name:</label>
			<input
				id="sceneNameInput"
				type="text"
				bind:value={sceneName}
				class="bg-gray-700 text-white px-2 py-1 rounded mr-2"
				placeholder="Scene Name"
			/>
			<button onclick={saveScene} class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded mr-2">
				Save Scene
			</button>
			<a href="/" class="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded mr-2">Back to List</a>
		</div>
		<div>
			<span class="text-sm mr-4">{statusMessage}</span>
			<button
				onclick={() => editorMode = 'editor'}
				class="px-3 py-1 rounded mr-1 {editorMode === 'editor' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-700'}"
			>
				Editor Mode
			</button>
			<button
				onclick={() => editorMode = 'player'}
				class="px-3 py-1 rounded {editorMode === 'player' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-700'}"
			>
				Player Mode
			</button>
		</div>
	</header>

	<!-- Main Content Area -->
	<main class="flex-grow flex overflow-hidden">
		<!-- 3D Viewport -->
		<section class="flex-grow bg-gray-900 relative">
			{#if editorMode === 'editor'}
				<div class="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
					Editor Mode Active
                    {#if selectedObject} (Selected: {selectedObject.record.id}) {/if}
				</div>
			{:else}
				<div class="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
					Player Mode Active
				</div>
			{/if}
			<!-- Canvas will go here -->
			<canvas bind:this={canvasElement} id="render-canvas" class="w-full h-full block"></canvas>
		</section>

		<!-- Editor Panel (Only in Editor Mode) -->
		{#if editorMode === 'editor'}
			<aside class="w-80 bg-gray-700 text-white p-4 overflow-y-auto flex flex-col space-y-4">
				<h2 class="text-xl font-semibold border-b border-gray-600 pb-2">Editor Panel</h2>

                <!-- Panel Selection Buttons -->
                <div class="flex space-x-1">
                     <button
                        onclick={() => activeEditorPanel = 'create'}
                        class="flex-1 text-xs px-2 py-1 rounded {activeEditorPanel === 'create' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}"
                    >Create</button>
                     <button
                        onclick={() => activeEditorPanel = 'presets'}
                        class="flex-1 text-xs px-2 py-1 rounded {activeEditorPanel === 'presets' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}"
                    >Presets</button>
                     <button
                        onclick={() => activeEditorPanel = 'models'}
                        class="flex-1 text-xs px-2 py-1 rounded {activeEditorPanel === 'models' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}"
                    >Models</button>
                     <button
                        onclick={() => activeEditorPanel = 'properties'}
                        disabled={!selectedObject}
                        class="flex-1 text-xs px-2 py-1 rounded {activeEditorPanel === 'properties' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'} disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >Properties</button>
                </div>

                 <!-- Create Panel -->
                 {#if activeEditorPanel === 'create'}
                 <div class="border rounded border-gray-500 p-3">
					<h3 class="text-lg font-medium mb-2">Create / Select Object</h3>
					<!-- TODO: Add object list, selection, creation controls -->
                    <p class="text-sm text-gray-400">Object controls go here...</p>
                    <p class="text-sm text-gray-400">Click objects in the scene to select.</p>
				</div>
                {/if}

                <!-- Presets Panel -->
                {#if activeEditorPanel === 'presets'}
                <div class="border rounded border-gray-500 p-3">
                    <h3 class="text-lg font-medium mb-2">Add Preset Object</h3>
                    <div class="grid grid-cols-2 gap-2">
                        {#each presets as preset (preset.name)}
                            <button
                                onclick={() => addPresetObject(preset)}
                                class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-1 px-2 rounded"
                            >
                                {preset.name}
                            </button>
                        {/each}
                    </div>
                </div>
                {/if}

                <!-- Model Management Panel -->
                {#if activeEditorPanel === 'models'}
                <div class="border rounded border-gray-500 p-3">
                    <h3 class="text-lg font-medium mb-2">Manage Models</h3>
                    <div class="mb-2">
                        <label for="modelUpload" class="block text-sm font-medium mb-1">Upload New Model (.glb):</label>
                        <input
                            id="modelUpload"
                            type="file"
                            accept=".glb"
                            onchange={handleFileSelect}
                            class="block w-full text-sm text-gray-400 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                    {#if selectedFile}
                        <button
                            onclick={uploadModel}
                            disabled={isUploading}
                            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-3 py-1 rounded text-sm"
                        >
                            {isUploading ? 'Uploading...' : `Upload ${selectedFile.name}`}
                        </button>
                    {/if}

                    <h4 class="text-md font-medium mt-4 mb-2">Available Models:</h4>
                    {#if availableModels.length > 0}
                        <ul class="list-disc list-inside text-sm max-h-40 overflow-y-auto bg-gray-800 p-2 rounded">
                            {#each availableModels as model (model.id)}
                                <li>{model.name} ({model.originalFilename})</li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="text-sm text-gray-400">No models uploaded yet.</p>
                    {/if}
                     <!-- TODO: Add model deletion UI -->
                </div>
                {/if}

				<!-- Property Editor Panel -->
                {#if activeEditorPanel === 'properties'}
				<div class="border rounded border-gray-500 p-3 flex-grow space-y-3">
					<h3 class="text-lg font-medium mb-2">Properties</h3>
					{#if selectedObject && selectedObjData}
                        <p class="text-sm">Selected: ID {selectedObject.record.id}</p>
                        <p class="text-sm">Type: {selectedObject.record.data.type}</p>

                         <!-- Gizmo Mode -->
                         <div class="flex space-x-1">
                            <button onclick={() => gizmoMode = 'translate'} class="flex-1 text-xs px-2 py-1 rounded {gizmoMode === 'translate' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}">Move</button>
                            <button onclick={() => gizmoMode = 'rotate'} class="flex-1 text-xs px-2 py-1 rounded {gizmoMode === 'rotate' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}">Rotate</button>
                            <button onclick={() => gizmoMode = 'scale'} class="flex-1 text-xs px-2 py-1 rounded {gizmoMode === 'scale' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}">Scale</button>
                         </div>

                        <!-- Position -->
                        <div class="grid grid-cols-4 gap-1 items-center">
                            <span class="text-sm col-span-1">Pos:</span>
                            <input id="pos-x" aria-label="Position X" type="number" step="0.1" value={Number.isFinite(selectedObjData.x) ? selectedObjData.x : 0} oninput={(e) => updateSelectedObjectPosition('x', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                            <input id="pos-y" aria-label="Position Y" type="number" step="0.1" value={Number.isFinite(selectedObjData.y) ? selectedObjData.y : 0} oninput={(e) => updateSelectedObjectPosition('y', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                            <input id="pos-z" aria-label="Position Z" type="number" step="0.1" value={Number.isFinite(selectedObjData.z) ? selectedObjData.z : 0} oninput={(e) => updateSelectedObjectPosition('z', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                        </div>

                         <!-- Rotation (Euler Degrees) -->
                         <div class="grid grid-cols-4 gap-1 items-center">
                            <span class="text-sm col-span-1">Rot (°):</span>
                            <input id="rot-x" aria-label="Rotation X" type="number" step="1" value={Number.isFinite(selectedObjData.rx) ? selectedObjData.rx : 0} oninput={(e) => updateSelectedObjectRotation('x', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                            <input id="rot-y" aria-label="Rotation Y" type="number" step="1" value={Number.isFinite(selectedObjData.ry) ? selectedObjData.ry : 0} oninput={(e) => updateSelectedObjectRotation('y', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                            <input id="rot-z" aria-label="Rotation Z" type="number" step="1" value={Number.isFinite(selectedObjData.rz) ? selectedObjData.rz : 0} oninput={(e) => updateSelectedObjectRotation('z', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                        </div>

                         <!-- Scale -->
                         <div class="grid grid-cols-4 gap-1 items-center">
                            <span class="text-sm col-span-1">Scale:</span>
                            <input id="scale-x" aria-label="Scale X" type="number" step="0.1" min="0.01" value={Number.isFinite(selectedObjData.sx) ? selectedObjData.sx : 1} oninput={(e) => updateSelectedObjectScale('x', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                            <input id="scale-y" aria-label="Scale Y" type="number" step="0.1" min="0.01" value={Number.isFinite(selectedObjData.sy) ? selectedObjData.sy : 1} oninput={(e) => updateSelectedObjectScale('y', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                            <input id="scale-z" aria-label="Scale Z" type="number" step="0.1" min="0.01" value={Number.isFinite(selectedObjData.sz) ? selectedObjData.sz : 1} oninput={(e) => updateSelectedObjectScale('z', e.currentTarget.valueAsNumber)} class="col-span-1 bg-gray-800 text-white px-1 py-0.5 rounded text-sm w-full">
                        </div>

                         <!-- Color -->
                         <div>
                            <label for="color-input" class="text-sm">Color:</label>
                            <input id="color-input" type="color" value={selectedObjData.color ?? '#ffffff'} oninput={(e) => updateSelectedObjectColor(e.currentTarget.value)} class="ml-2 w-8 h-6 p-0 border-none rounded align-middle">
                         </div>

                         <!-- TODO: Add type-specific properties (e.g., mass) -->

                    {:else}
                        <p class="text-sm text-gray-400">Click an object in the scene to edit its properties.</p>
                    {/if}
				</div>
                {/if}
			</aside>
		{/if}
	</main>
</div>

<style>
	/* Add any component-specific styles here */
	/* Ensure canvas takes up space */
	#render-canvas {
		display: block;
	}
    input[type="color"] {
        -webkit-appearance: none;
        appearance: none;
        border: none;
        padding: 0; /* Remove padding for better size control */
        cursor: pointer;
    }
    input[type="color"]::-webkit-color-swatch-wrapper {
        padding: 0;
    }
    input[type="color"]::-webkit-color-swatch {
        border: none;
        border-radius: 4px; /* Optional: match rounding */
    }
     input[type="color"]::-moz-color-swatch {
        border: none;
        border-radius: 4px; /* Optional: match rounding */
    }
</style>

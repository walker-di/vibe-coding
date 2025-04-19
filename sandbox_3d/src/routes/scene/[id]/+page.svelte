<script lang="ts">
	import type { PageData } from './$types'; // Correct import for page data type
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import * as CANNON from 'cannon-es';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Import GLTFLoader
	import type { SceneObjectJsonData, UploadedModel, SceneData, BaseObjectData, PhysicalObjectData } from '$lib/types'; // Added SceneData, BaseObjectData, PhysicalObjectData

	// --- Props ---
	let { data } = $props(); // Data from +page.server.ts load function

	// --- State ---
	let sceneState = $state(data.scene); // Reactive scene data
	let isNewScene = $state(data.isNew);
	let sceneName = $state(data.scene?.name ?? 'New Scene');
	let availableModels = $state<UploadedModel[]>([]);
	let selectedFile = $state<File | null>(null);
	let isUploading = $state(false);
	let editorMode = $state<'editor' | 'player'>('editor'); // Default to editor mode
	let statusMessage = $state('');
	let canvasElement = $state<HTMLCanvasElement | null>(null);

	// --- 3D & Physics Engine Refs ---
	let renderer: THREE.WebGLRenderer | null = null;
	let scene: THREE.Scene | null = null;
	let camera: THREE.PerspectiveCamera | null = null;
	let physicsWorld: CANNON.World | null = null;
	let animationFrameId: number | null = null;
	const clock = new THREE.Clock(); // For physics step delta
	const linkedObjects: { mesh: THREE.Object3D; body: CANNON.Body }[] = []; // To link physics and visuals
    const loader = new GLTFLoader(); // Create GLTF Loader instance
    const modelCache = new Map<number, THREE.Group>(); // Simple cache for loaded models

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
		const url = sceneId ? `/api/scenes/${sceneId}` : '/api/scenes';
		const method = sceneId ? 'PUT' : 'POST';

		// Prepare payload (ensure objects are correctly formatted if modified)
		const payload = {
			name: sceneName,
			objects: sceneState?.objects ?? [] // Send current objects state
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

			// Update state if it was a new scene
			if (method === 'POST' && savedScene.id) {
				sceneState = savedScene; // Update with full scene data including ID
                isNewScene = false;
                // Optionally redirect or update URL? For now, just update state.
                window.history.replaceState(null, '', `/scene/${savedScene.id}`); // Update URL without reload
			} else if (method === 'PUT') {
                // Update timestamp or other fields if necessary
                sceneState = { ...sceneState, ...savedScene };
            }
			sceneName = savedScene.name; // Ensure name is updated
			statusMessage = `Scene '${savedScene.name}' saved successfully.`;

		} catch (err: any) {
			console.error('Error saving scene:', err);
			statusMessage = `Save error: ${err.message}`;
		}
	}

	// --- Lifecycle ---
	$effect(() => {
		// Fetch models when the component mounts or data changes (though fetchModels is called explicitly below)
		console.log('Scene data loaded:', data.scene);
		sceneState = data.scene; // Keep state in sync if data prop changes externally
        isNewScene = data.isNew;
        sceneName = data.scene?.name ?? 'New Scene';
	});

	// --- Initialize 3D Scene & Physics ---
	function initEngine() {
		if (!canvasElement) return;

		// Renderer
		renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
		renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		// renderer.outputEncoding = THREE.sRGBEncoding; // Deprecated, use outputColorSpace
		renderer.outputColorSpace = THREE.SRGBColorSpace;


		// Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x222233);

		// Camera
		camera = new THREE.PerspectiveCamera(75, canvasElement.clientWidth / canvasElement.clientHeight, 0.1, 1000);
		camera.position.set(5, 5, 5);
		camera.lookAt(0, 0, 0);

		// Basic Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(5, 10, 7.5);
		scene.add(directionalLight);

		// Physics World
		physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0), // Standard gravity
        });
        physicsWorld.broadphase = new CANNON.NaiveBroadphase(); // Simple broadphase for now
        // physicsWorld.solver.iterations = 10; // Adjust solver iterations if needed
        physicsWorld.allowSleep = true; // Allow bodies to sleep for performance

		// Ground Plane (Visual + Physics)
		const groundGeometry = new THREE.PlaneGeometry(100, 100);
		const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });
		const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
		groundMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        groundMesh.receiveShadow = true;
		scene.add(groundMesh);

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 }); // mass 0 makes it static
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Match visual rotation
        physicsWorld.addBody(groundBody);


		// Start Animation Loop
		animate();

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

        // Initial load of objects from data
        loadSceneObjects(sceneState);

		// Return cleanup function for resize observer
		return () => {
			resizeObserver.disconnect();
		};
	}

    // --- Load Scene Objects ---
    function loadSceneObjects(currentScene: SceneData | null) {
        if (!scene || !physicsWorld || !currentScene) return;

        // Clear existing objects (simple approach for now - needs improvement for updates)
        while(linkedObjects.length > 0) {
            const obj = linkedObjects.pop();
            if (obj) {
                scene?.remove(obj.mesh);
                // TODO: Dispose geometry/material on mesh?
                physicsWorld?.removeBody(obj.body);
            }
        }
        // Also remove meshes directly added to scene if not managed by linkedObjects yet
        scene?.children.slice().forEach(child => {
            if (child.userData.isSceneObject) {
                scene?.remove(child);
                // TODO: Dispose geometry/material?
            }
        });
         // Also remove bodies directly added to world if not managed by linkedObjects yet
         // Note: CANNON.Body doesn't have userData by default. Cleanup relies on linkedObjects.
        // physicsWorld?.bodies.slice().forEach(body => {
        //      if (body.userData?.isSceneObject) { // This check is invalid for CANNON.Body
        //          physicsWorld?.removeBody(body);
        //      }
        // });


        console.log(`Loading ${currentScene.objects.length} objects...`);
        currentScene.objects.forEach(objRecord => {
            const objData = objRecord.data; // This is SceneObjectJsonData { type, data }
            const baseData = objData.data as BaseObjectData; // Cast to base for common properties
            console.log('Processing object:', objData);

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
                console.log(`Creating primitive: ${baseData.primitiveType}`);
                switch (baseData.primitiveType) {
                    case 'box':
                        const boxSize = new CANNON.Vec3(scale.x / 2, scale.y / 2, scale.z / 2); // Cannon Box takes half-extents
                        shape = new CANNON.Box(boxSize);
                        const boxGeom = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
                        mesh = new THREE.Mesh(boxGeom, material);
                        break;
                    case 'sphere':
                        const radius = Math.max(scale.x, scale.y, scale.z) / 2; // Use max scale dim for radius
                        shape = new CANNON.Sphere(radius);
                        const sphereGeom = new THREE.SphereGeometry(radius, 32, 16);
                        mesh = new THREE.Mesh(sphereGeom, material);
                        // Adjust mesh scale if dimensions were non-uniform (visual only)
                        mesh.scale.set(scale.x / (radius*2), scale.y / (radius*2), scale.z / (radius*2));
                        break;
                    case 'cylinder':
                        const cylRadius = Math.max(scale.x, scale.z) / 2; // Use larger horizontal dim
                        const cylHeight = scale.y;
                        // Cannon Cylinder needs radiusTop, radiusBottom, height, numSegments
                        shape = new CANNON.Cylinder(cylRadius, cylRadius, cylHeight, 16);
                        const cylGeom = new THREE.CylinderGeometry(cylRadius, cylRadius, cylHeight, 16);
                        mesh = new THREE.Mesh(cylGeom, material);
                         // Cannon Cylinder aligns along Y axis, Three Cylinder also aligns along Y. Good.
                        break;
                    // Add other primitives if needed
                }
            }
            // --- Load Custom Model ---
            else if (baseData.modelId) {
                const modelId = baseData.modelId;
                console.log(`Loading model ID: ${modelId}`);

                // Use cache or load model
                if (modelCache.has(modelId)) {
                    mesh = modelCache.get(modelId)!.clone(); // Clone from cache
                    console.log(`Using cached model ${modelId}`);
                     // TODO: Determine physics shape based on collisionShape property
                     // For now, default to a box based on the visual bounds
                     const box = new THREE.Box3().setFromObject(mesh);
                     const size = box.getSize(new THREE.Vector3());
                     shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));

                } else {
                    // Fetch and load (async operation within the loop - consider Promise.all for parallel loading)
                    fetch(`/api/models/${modelId}/file`)
                        .then(response => {
                            if (!response.ok) throw new Error(`Failed to fetch model ${modelId}`);
                            return response.arrayBuffer();
                        })
                        .then(buffer => loader.parseAsync(buffer, ''))
                        .then(gltf => {
                            console.log(`Successfully loaded model ${modelId}`);
                            mesh = gltf.scene; // Assign loaded mesh
                            mesh.scale.set(scale.x, scale.y, scale.z); // Apply object scale to loaded model group
                            modelCache.set(modelId, mesh as THREE.Group); // Cache the original loaded model

                            // TODO: Determine physics shape based on collisionShape property
                            // For now, default to a box based on the visual bounds
                            const box = new THREE.Box3().setFromObject(mesh);
                            const size = box.getSize(new THREE.Vector3());
                            shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));

                            // --- Create Physics Body (Async Part) ---
                            if (shape && physicsWorld) {
                                let mass = 0;
                                if (objData.type === 'physical' || objData.type === 'player' || objData.type === 'item' || objData.type === 'weapon') {
                                    mass = (objData.data as PhysicalObjectData)?.mass ?? 1;
                                }
                                body = new CANNON.Body({ mass, shape, position, quaternion, allowSleep: true, sleepSpeedLimit: 0.1, sleepTimeLimit: 1 });
                                physicsWorld.addBody(body);

                                // --- Add Mesh to Scene and Link (Async Part) ---
                                if (mesh && body && scene) {
                                    mesh.position.copy(position as unknown as THREE.Vector3);
                                    mesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
                                    mesh.userData.isSceneObject = true;
                                    mesh.castShadow = true;
                                    mesh.receiveShadow = true;
                                    scene.add(mesh);
                                    linkedObjects.push({ mesh, body });
                                } else {
                                     console.warn("Could not create mesh or body for loaded model:", objData);
                                }
                            }
                        })
                        .catch(err => {
                            console.error(`Error loading model ${modelId}:`, err);
                            // Optionally create a fallback placeholder mesh
                            const fallbackGeom = new THREE.BoxGeometry(1, 1, 1);
                            const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                            mesh = new THREE.Mesh(fallbackGeom, fallbackMat);
                            shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)); // Matching fallback shape
                             // Create body/link for fallback... (similar logic as above)
                             if (shape && physicsWorld) {
                                let mass = 0;
                                if (objData.type === 'physical' || objData.type === 'player' || objData.type === 'item' || objData.type === 'weapon') {
                                    mass = (objData.data as PhysicalObjectData)?.mass ?? 1;
                                }
                                body = new CANNON.Body({ mass, shape, position, quaternion, allowSleep: true, sleepSpeedLimit: 0.1, sleepTimeLimit: 1 });
                                physicsWorld.addBody(body);
                                if (mesh && body && scene) {
                                    mesh.position.copy(position as unknown as THREE.Vector3);
                                    mesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
                                    mesh.userData.isSceneObject = true;
                                    scene.add(mesh);
                                    linkedObjects.push({ mesh, body });
                                }
                            }
                        });
                    // Note: Because loading is async, the body/mesh might not be ready immediately in the main loop.
                    // The linking happens inside the .then() block.
                    // We return here to prevent the synchronous code below from running for this async case.
                    return; // Exit the current forEach iteration for this async path
                }
            }

            // --- Create Physics Body (Synchronous Part for Primitives/Cached Models) ---
            // This code only runs if the object is a primitive or a cached model
            if (shape) {
                 // Determine mass based on object type
                let mass = 0; // Default to static
                if (objData.type === 'physical' || objData.type === 'player' || objData.type === 'item' || objData.type === 'weapon') {
                    // Use mass from specific data if available, otherwise default dynamic mass
                    mass = (objData.data as PhysicalObjectData)?.mass ?? 1;
                }

                body = new CANNON.Body({
                    mass: mass,
                    shape: shape,
                    position: position,
                    quaternion: quaternion,
                    allowSleep: true,
                    sleepSpeedLimit: 0.1, // Adjust sleep parameters as needed
                    sleepTimeLimit: 1,
                });

                // Add to physics world (with null check)
                if (physicsWorld) {
                    physicsWorld.addBody(body);
                } else {
                     console.error("Physics world is null, cannot add body for object:", objData);
                }
            }

            // --- Add Mesh to Scene and Link (Synchronous Part for Primitives/Cached Models) ---
             // This code only runs if the object is a primitive or a cached model
            if (mesh && body && scene && physicsWorld) { // Add null checks for scene and physicsWorld
                // Set initial visual state (although physics body also has it)
                mesh.position.copy(position as unknown as THREE.Vector3);
                mesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
                // Scale is already applied during geometry creation or needs to be applied to loaded model group

                mesh.userData.isSceneObject = true; // Mark for potential identification/cleanup
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                scene.add(mesh); // Safe access
                linkedObjects.push({ mesh, body });
            } else if (mesh && !body && scene) { // Handle static meshes without physics bodies (if needed) - Add scene null check
                 mesh.position.copy(position as unknown as THREE.Vector3);
                 mesh.quaternion.copy(quaternion as unknown as THREE.Quaternion);
                 mesh.userData.isSceneObject = true;
                 mesh.castShadow = true;
                 mesh.receiveShadow = true;
                 scene.add(mesh); // Safe access
                 // Not added to linkedObjects as there's no body to sync with
            } else {
                console.warn("Could not create mesh or body for object:", objData);
            }
        });
    }


	// --- Animation Loop ---
	function animate() {
		if (!renderer || !scene || !camera || !physicsWorld) return;

		animationFrameId = requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();

        // Step the physics world
        physicsWorld.step(1 / 60, deltaTime, 3); // Fixed timestep, delta, max sub-steps

        // Update visual objects from physics bodies
        for (const link of linkedObjects) {
            link.mesh.position.copy(link.body.position as unknown as THREE.Vector3);
            link.mesh.quaternion.copy(link.body.quaternion as unknown as THREE.Quaternion);
        }

		renderer.render(scene, camera);
	}

	// --- Cleanup ---
	function cleanupEngine() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		// Dispose Three.js resources
        scene?.traverse(object => {
            if (object instanceof THREE.Mesh) {
                object.geometry?.dispose();
                // Check if material is an array or single
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material?.dispose();
                }
            }
        });
		if (renderer) {
			renderer.dispose(); // Dispose renderer context
			renderer = null;
		}
		scene = null;
		camera = null;
		physicsWorld = null;
		console.log('3D Engine cleaned up');
	}

    let resizeCleanup: (() => void) | undefined = undefined; // Correct type: undefined

    onMount(() => {
        fetchModels(); // Fetch models on initial mount
        if (canvasElement) {
           resizeCleanup = initEngine();
        } else {
            console.error("Canvas element not found on mount!");
        }
    });

    onDestroy(() => {
        if (resizeCleanup) {
			resizeCleanup();
		}
        cleanupEngine();
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
				<div class="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded">
					Editor Mode Active
				</div>
			{:else}
				<div class="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-2 rounded">
					Player Mode Active
				</div>
			{/if}
			<!-- Canvas will go here -->
			<canvas bind:this={canvasElement} id="render-canvas" class="w-full h-full block"></canvas>
		</section>

		<!-- Editor Panel (Only in Editor Mode) -->
		{#if editorMode === 'editor'}
			<aside class="w-80 bg-gray-700 text-white p-4 overflow-y-auto flex flex-col">
				<h2 class="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Editor Panel</h2>

                <!-- Model Management -->
                <div class="mb-4 border rounded border-gray-500 p-3">
                    <h3 class="text-lg font-medium mb-2">Manage Models</h3>
                    <div class="mb-2">
                        <label for="modelUpload" class="block text-sm font-medium mb-1">Upload New Model (.glb, .obj):</label>
                        <input
                            id="modelUpload"
                            type="file"
                            accept=".glb,.gltf,.obj"
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


				<!-- Object Creation/Selection -->
				<div class="mb-4 border rounded border-gray-500 p-3">
					<h3 class="text-lg font-medium mb-2">Create / Select Object</h3>
					<!-- TODO: Add object list, selection, creation controls -->
                    <p class="text-sm text-gray-400">Object controls go here...</p>
				</div>

				<!-- Property Editor -->
				<div class="flex-grow border rounded border-gray-500 p-3">
					<h3 class="text-lg font-medium mb-2">Properties</h3>
					<!-- TODO: Display properties of selected object -->
                    <p class="text-sm text-gray-400">Selected object properties go here...</p>
				</div>
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
</style>

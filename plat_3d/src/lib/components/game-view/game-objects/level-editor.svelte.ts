import * as THREE from 'three';
import { TransformGizmo } from './transform-gizmo';

export class LevelEditor {
    scene: THREE.Scene;
    platforms: THREE.Mesh[];
    obstacles: THREE.Mesh[];
    goals: THREE.Mesh[];
    selectedObject: THREE.Mesh | null;
    transformGizmo: TransformGizmo;
    isDragging: boolean;

    constructor(scene: THREE.Scene) {
      this.scene = scene;
      this.platforms = [];
      this.obstacles = [];
      this.goals = [];
      this.selectedObject = null;
      this.transformGizmo = new TransformGizmo(scene);
      this.isDragging = false;
    }

    createObject(type: string, position: THREE.Vector3): THREE.Mesh | undefined {
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

    selectObject(object: THREE.Mesh | null) {
      // Deselect previous object
      if (this.selectedObject) {
        const material = this.selectedObject.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0x000000);
      }
      
      this.selectedObject = object;
      
      if (object) {
        // Highlight selected object
        const material = object.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0x333333);
        
        // Attach transform gizmo
        this.transformGizmo.attach(object);
      } else {
        // Hide transform gizmo
        this.transformGizmo.detach();
      }
    }

    // New method specifically to start dragging when a gizmo axis is clicked on mousedown
    startGizmoDrag(raycaster: THREE.Raycaster, camera: THREE.Camera): boolean {
      // Ensure gizmo position is up-to-date before checking intersection
      this.transformGizmo.updatePosition(); 
      console.log("LevelEditor.startGizmoDrag - Updated gizmo position.");

      const selectedAxis = this.transformGizmo.checkIntersection(raycaster);
      console.log(`LevelEditor.startGizmoDrag - checkIntersection returned: ${selectedAxis}`); // Add log
      if (selectedAxis) {
        console.log("LevelEditor.startGizmoDrag - Gizmo axis hit, starting drag.");
        this.transformGizmo.selectAxis(selectedAxis);
        this.transformGizmo.startDrag(raycaster, camera);
        this.isDragging = true; // Set dragging state
        console.log(`LevelEditor.startGizmoDrag - Set isDragging = ${this.isDragging}`);
        return true;
      }
      return false;
    }

    handleClick(raycaster: THREE.Raycaster, _camera: THREE.Camera) {
      // This method now ONLY handles selecting objects, not starting drags.
      // Drag initiation is handled by startGizmoDrag called from onMouseDown.

      // Check if we clicked on an object (Gizmo check is removed from here)
      const allObjects = this.getAllObjects();
      const intersects = raycaster.intersectObjects(allObjects as THREE.Object3D[]);

      if (intersects.length > 0 && intersects[0].object !== this.transformGizmo.gizmo) { // Ensure we didn't click the gizmo itself
        console.log("LevelEditor.handleClick - Object clicked, selecting object.");
        this.selectObject(intersects[0].object as THREE.Mesh);
        return true; // Indicate an object was selected
      } else {
        // If the click wasn't on a selectable object (could be ground or gizmo)
        // We don't deselect here anymore, as a gizmo click might have happened on mousedown
        // Deselection happens if mousedown didn't start a drag AND click didn't select an object.
        console.log("LevelEditor.handleClick - Clicked on empty space or gizmo (handled by mousedown).");
        return false; // Indicate no selectable object was clicked
      }
    }

    handleDrag(raycaster: THREE.Raycaster) {
      // console.log(`LevelEditor.handleDrag - Called - isDragging: ${this.isDragging}`); // Optional: Log every move event (can be noisy)
      if (this.isDragging) {
        this.transformGizmo.updateDrag(raycaster);
        return true;
      }
      return false;
    }

    endDrag() {
      console.log(`LevelEditor.endDrag - Called - Setting isDragging = false (was ${this.isDragging})`);
      this.isDragging = false;
      this.transformGizmo.endDrag();
    }

    // Add keyboard shortcut for axis selection
    handleKeyDown(key: string) {
      if (this.selectedObject) {
        if (key === 'x') {
          this.transformGizmo.selectAxis('x');
        } else if (key === 'y') {
          this.transformGizmo.selectAxis('y');
        } else if (key === 'z') {
          this.transformGizmo.selectAxis('z');
        } else if (key === 'escape') {
          this.selectObject(null);
        }
      }
    }

    clearLevel() {
      // Remove todos os objetos do nível
      this.getAllObjects().forEach(object => {
        this.scene.remove(object);
      });

      // Deselect any selected object
      this.selectObject(null);

      this.platforms = [];
      this.obstacles = [];
      this.goals = [];
    }

    saveLevel(): any {
      const levelData = {
        platforms: this.platforms.map((p: THREE.Mesh) => ({
          position: { x: p.position.x, y: p.position.y, z: p.position.z },
          scale: { x: p.scale.x, y: p.scale.y, z: p.scale.z }
        })),
        obstacles: this.obstacles.map((o: THREE.Mesh) => ({
          position: { x: o.position.x, y: o.position.y, z: o.position.z }
        })),
        goals: this.goals.map((g: THREE.Mesh) => ({
          position: { x: g.position.x, y: g.position.y, z: g.position.z }
        }))
      };

      localStorage.setItem('platformerLevel', JSON.stringify(levelData));
      return levelData;
    }

    loadLevel(): boolean {
      const levelData = localStorage.getItem('platformerLevel');
      if (!levelData) {
        return false;
      }

      this.clearLevel();
      const level = JSON.parse(levelData);

      // Carrega plataformas
      level.platforms.forEach((p: any) => {
        const platform = this.createObject('platform', new THREE.Vector3(p.position.x, p.position.y, p.position.z));
        if (platform) {
          platform.scale.set(p.scale.x, p.scale.y, p.scale.z);
        }
      });

      // Carrega obstáculos
      level.obstacles.forEach((o: any) => {
        this.createObject('obstacle', new THREE.Vector3(o.position.x, o.position.y, o.position.z));
      });

      // Carrega objetivos
      level.goals.forEach((g: any) => {
        this.createObject('goal', new THREE.Vector3(g.position.x, g.position.y, g.position.z));
      });

      return true;
    }
  }

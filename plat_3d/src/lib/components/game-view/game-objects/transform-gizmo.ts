import * as THREE from 'three';

export class TransformGizmo {
  scene: THREE.Scene;
  object: THREE.Object3D | null;
  gizmo: THREE.Group;
  
  // Visible arrows
  xArrow: THREE.Group;
  yArrow: THREE.Group;
  zArrow: THREE.Group;
  
  // Raycast meshes for interaction
  xAxis: THREE.Mesh;
  yAxis: THREE.Mesh;
  zAxis: THREE.Mesh;
  
  selectedAxis: 'x' | 'y' | 'z' | null;
  dragPlane: THREE.Plane;
  dragOffset: THREE.Vector3;
  isVisible: boolean;
  boundingBox: THREE.LineSegments;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.object = null;
    this.selectedAxis = null;
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.isVisible = false;

    // Create gizmo container
    this.gizmo = new THREE.Group();
    
    // Create axis arrows
    const arrowLength = 2;
    
    // X-axis (red)
    const xResult = this.createArrow(
      new THREE.Vector3(arrowLength, 0, 0),
      new THREE.Vector3(1, 0, 0),
      0xff0000
    );
    this.xArrow = xResult.arrow;
    this.xAxis = xResult.raycastMesh;
    
    // Y-axis (green)
    const yResult = this.createArrow(
      new THREE.Vector3(0, arrowLength, 0),
      new THREE.Vector3(0, 1, 0),
      0x00ff00
    );
    this.yArrow = yResult.arrow;
    this.yAxis = yResult.raycastMesh;
    
    // Z-axis (blue)
    const zResult = this.createArrow(
      new THREE.Vector3(0, 0, arrowLength),
      new THREE.Vector3(0, 0, 1),
      0x0000ff
    );
    this.zArrow = zResult.arrow;
    this.zAxis = zResult.raycastMesh;

    // Add visible arrows to the gizmo
    this.gizmo.add(this.xArrow);
    this.gizmo.add(this.yArrow);
    this.gizmo.add(this.zArrow);
    
    // Add yellow bounding box
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    this.boundingBox = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: 0xffff00 })
    );
    this.gizmo.add(this.boundingBox);

    // Add to scene but hide initially
    this.scene.add(this.gizmo);
    this.hide();
  }

  createArrow(direction: THREE.Vector3, axis: THREE.Vector3, color: number): { arrow: THREE.Group; raycastMesh: THREE.Mesh } {
    // Create arrow body - make it thicker and more visible
    const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, direction.length() * 0.8, 8);
    bodyGeometry.translate(0, direction.length() * 0.4, 0);
    
    // Create arrow head - make it larger and more visible
    const headGeometry = new THREE.ConeGeometry(0.25, 0.5, 8);
    headGeometry.translate(0, direction.length() * 0.9, 0);
    
    // Create material
    const material = new THREE.MeshBasicMaterial({ color });
    
    // Create mesh for body
    const body = new THREE.Mesh(bodyGeometry, material);
    
    // Create mesh for head
    const head = new THREE.Mesh(headGeometry, material);
    
    // Create group to hold both parts
    const arrow = new THREE.Group();
    arrow.add(body);
    arrow.add(head);
    
    // Rotate to align with axis
    if (axis.equals(new THREE.Vector3(1, 0, 0))) {
      arrow.rotateZ(-Math.PI / 2);
    } else if (axis.equals(new THREE.Vector3(0, 0, 1))) {
      arrow.rotateX(Math.PI / 2);
    }
    
    // Create a mesh to use for raycasting - make it slightly larger than the visible arrow for easier clicking
    const raycastRadius = 0.25; // Increased from 0.15
    const raycastGeometry = new THREE.CylinderGeometry(raycastRadius, raycastRadius, direction.length(), 8);
    const raycastMaterial = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.5,
      // Set to true to make it visible for debugging, false for production
      visible: false
    });
    
    const raycastMesh = new THREE.Mesh(raycastGeometry, raycastMaterial);
    
    // Store axis info in userData
    raycastMesh.userData.axis = axis.x === 1 ? 'x' : axis.y === 1 ? 'y' : 'z';
    
    // Apply the same transformations as the arrow
    if (axis.equals(new THREE.Vector3(1, 0, 0))) {
      raycastMesh.rotateZ(-Math.PI / 2);
    } else if (axis.equals(new THREE.Vector3(0, 0, 1))) {
      raycastMesh.rotateX(Math.PI / 2);
    }
    
    // Add raycast mesh to the gizmo
    this.gizmo.add(raycastMesh);
    
    return { arrow, raycastMesh };
  }

  attach(object: THREE.Object3D) {
    this.object = object;
    
    // Scale bounding box to match object size
    if (object instanceof THREE.Mesh && object.geometry instanceof THREE.BoxGeometry) {
      const size = new THREE.Vector3();
      const box = new THREE.Box3().setFromObject(object);
      box.getSize(size);
      
      this.boundingBox.scale.set(size.x, size.y, size.z);
    } else {
      // Default size if not a box
      this.boundingBox.scale.set(1, 1, 1);
    }
    
    this.updatePosition();
    this.show();
  }

  detach() {
    this.object = null;
    this.hide();
  }

  updatePosition() {
    if (this.object) {
      this.gizmo.position.copy(this.object.position);
    }
  }

  show() {
    this.gizmo.visible = true;
    this.isVisible = true;
  }

  hide() {
    this.gizmo.visible = false;
    this.isVisible = false;
    this.selectedAxis = null;
  }

  selectAxis(axis: 'x' | 'y' | 'z' | null) {
    this.selectedAxis = axis;
    
    // Reset all axes colors
    this.resetAxisColors();
    
    // Highlight selected axis
    if (axis === 'x') {
      this.xArrow.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.setHex(0xffff00);
        }
      });
    } else if (axis === 'y') {
      this.yArrow.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.setHex(0xffff00);
        }
      });
    } else if (axis === 'z') {
      this.zArrow.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.setHex(0xffff00);
        }
      });
    }
  }

  resetAxisColors() {
    // Reset X axis color
    this.xArrow.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.color.setHex(0xff0000);
      }
    });
    
    // Reset Y axis color
    this.yArrow.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.color.setHex(0x00ff00);
      }
    });
    
    // Reset Z axis color
    this.zArrow.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.color.setHex(0x0000ff);
      }
    });
  }

  checkIntersection(raycaster: THREE.Raycaster): 'x' | 'y' | 'z' | null {
    if (!this.isVisible) return null;
    
    const intersects = raycaster.intersectObjects([this.xAxis, this.yAxis, this.zAxis]);
    
    if (intersects.length > 0) {
      return intersects[0].object.userData.axis;
    }
    
    return null;
  }

  startDrag(raycaster: THREE.Raycaster, camera: THREE.Camera) {
    if (!this.object || !this.selectedAxis) return;
    
    // Create a drag plane perpendicular to the camera and containing the object
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Create a plane perpendicular to the selected axis
    let planeNormal;
    
    if (this.selectedAxis === 'x') {
      planeNormal = new THREE.Vector3(1, 0, 0);
    } else if (this.selectedAxis === 'y') {
      planeNormal = new THREE.Vector3(0, 1, 0);
    } else { // z
      planeNormal = new THREE.Vector3(0, 0, 1);
    }
    
    // Ensure the plane normal is not parallel to the camera direction
    if (Math.abs(planeNormal.dot(cameraDirection)) > 0.9) {
      // If too parallel, use a different plane
      if (this.selectedAxis === 'x') {
        planeNormal = new THREE.Vector3(0, 1, 0);
      } else if (this.selectedAxis === 'y') {
        planeNormal = new THREE.Vector3(1, 0, 0);
      } else { // z
        planeNormal = new THREE.Vector3(0, 1, 0);
      }
    }
    
    this.dragPlane.setFromNormalAndCoplanarPoint(
      planeNormal,
      this.object.position
    );
    
    // Calculate drag offset
    const dragPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.dragPlane, dragPoint);
    
    if (dragPoint) {
      this.dragOffset.copy(this.object.position).sub(dragPoint);
    }
  }

  updateDrag(raycaster: THREE.Raycaster) {
    if (!this.object || !this.selectedAxis) return;
    
    // Find intersection with drag plane
    const dragPoint = new THREE.Vector3();
    const intersected = raycaster.ray.intersectPlane(this.dragPlane, dragPoint);
    
    if (!intersected) return;
    
    // Add offset to get new position
    dragPoint.add(this.dragOffset);
    
    // Store original position
    const originalPosition = this.object.position.clone();
    
    // Constrain movement to selected axis
    if (this.selectedAxis === 'x') {
      this.object.position.x = Math.round(dragPoint.x);
    } else if (this.selectedAxis === 'y') {
      this.object.position.y = Math.max(0, Math.round(dragPoint.y));
    } else if (this.selectedAxis === 'z') {
      this.object.position.z = Math.round(dragPoint.z);
    }
    
    // Update gizmo position
    this.updatePosition();
    
    // Return the change in position
    return {
      axis: this.selectedAxis,
      delta: this.object.position.clone().sub(originalPosition)
    };
  }

  endDrag() {
    // Reset drag state
    this.selectedAxis = null;
    this.resetAxisColors();
  }
}

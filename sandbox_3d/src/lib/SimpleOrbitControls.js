import * as THREE from 'three';

export class SimpleOrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Configuration
        this.enabled = true;
        this.target = new THREE.Vector3();
        this.enableDamping = false;
        this.dampingFactor = 0.05;
        this.enableZoom = true;
        this.zoomSpeed = 1.0;
        this.minDistance = 0;
        this.maxDistance = Infinity;
        this.enableRotate = true;
        this.rotateSpeed = 1.0;
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;
        this.minAzimuthAngle = -Infinity;
        this.maxAzimuthAngle = Infinity;
        this.enablePan = true;
        this.keyPanSpeed = 7.0;
        this.screenSpacePanning = true;
        
        // Internal state
        this.spherical = new THREE.Spherical();
        this.sphericalDelta = new THREE.Spherical();
        this.scale = 1;
        this.panOffset = new THREE.Vector3();
        this.rotateStart = new THREE.Vector2();
        this.rotateEnd = new THREE.Vector2();
        this.rotateDelta = new THREE.Vector2();
        this.panStart = new THREE.Vector2();
        this.panEnd = new THREE.Vector2();
        this.panDelta = new THREE.Vector2();
        this.zoomChanged = false;
        
        // Event state
        this.STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };
        this.state = this.STATE.NONE;
        
        // Event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        
        // Add event listeners
        this.domElement.addEventListener('contextmenu', this.onContextMenu);
        this.domElement.addEventListener('mousedown', this.onMouseDown);
        this.domElement.addEventListener('wheel', this.onMouseWheel);
        
        // Initial update
        this.update();
    }
    
    // Public methods
    update() {
        const offset = new THREE.Vector3();
        
        // Get current camera position
        const position = this.camera.position;
        
        // Calculate offset from target
        offset.copy(position).sub(this.target);
        
        // Convert to spherical coordinates
        this.spherical.setFromVector3(offset);
        
        // Apply rotation delta
        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;
        
        // Restrict theta to be between desired limits
        this.spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this.spherical.theta));
        
        // Restrict phi to be between desired limits
        this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
        
        // Restrict phi to be between EPS and PI-EPS
        this.spherical.phi = Math.max(0.000001, Math.min(Math.PI - 0.000001, this.spherical.phi));
        
        // Scale distance
        this.spherical.radius *= this.scale;
        
        // Restrict radius to be between desired limits
        this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
        
        // Move target to panned location
        this.target.add(this.panOffset);
        
        // Convert spherical coordinates back to cartesian
        offset.setFromSpherical(this.spherical);
        
        // Update camera position
        position.copy(this.target).add(offset);
        
        // Make camera look at target
        this.camera.lookAt(this.target);
        
        // Apply damping
        if (this.enableDamping) {
            this.sphericalDelta.theta *= (1 - this.dampingFactor);
            this.sphericalDelta.phi *= (1 - this.dampingFactor);
        } else {
            this.sphericalDelta.set(0, 0, 0);
        }
        
        // Reset scale and pan offset
        this.scale = 1;
        this.panOffset.set(0, 0, 0);
        
        return true;
    }
    
    dispose() {
        this.domElement.removeEventListener('contextmenu', this.onContextMenu);
        this.domElement.removeEventListener('mousedown', this.onMouseDown);
        this.domElement.removeEventListener('wheel', this.onMouseWheel);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
    
    // Event handlers
    onMouseDown(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        if (event.button === 0 && this.enableRotate) { // Left button - rotate
            this.rotateStart.set(event.clientX, event.clientY);
            this.state = this.STATE.ROTATE;
        } else if (event.button === 1 && this.enableZoom) { // Middle button - zoom
            this.state = this.STATE.DOLLY;
        } else if (event.button === 2 && this.enablePan) { // Right button - pan
            this.panStart.set(event.clientX, event.clientY);
            this.state = this.STATE.PAN;
        }
        
        if (this.state !== this.STATE.NONE) {
            document.addEventListener('mousemove', this.onMouseMove, false);
            document.addEventListener('mouseup', this.onMouseUp, false);
        }
    }
    
    onMouseMove(event) {
        if (!this.enabled) return;
        
        event.preventDefault();
        
        if (this.state === this.STATE.ROTATE && this.enableRotate) {
            this.rotateEnd.set(event.clientX, event.clientY);
            this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
            
            const element = this.domElement;
            
            // Rotating across whole screen goes 360 degrees around
            this.sphericalDelta.theta -= 2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed;
            
            // Rotating up and down along whole screen attempts to go 360, but limited to 180
            this.sphericalDelta.phi -= 2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed;
            
            this.rotateStart.copy(this.rotateEnd);
            
            this.update();
        } else if (this.state === this.STATE.PAN && this.enablePan) {
            this.panEnd.set(event.clientX, event.clientY);
            this.panDelta.subVectors(this.panEnd, this.panStart);
            
            this.pan(this.panDelta.x, this.panDelta.y);
            
            this.panStart.copy(this.panEnd);
            
            this.update();
        }
    }
    
    onMouseUp() {
        document.removeEventListener('mousemove', this.onMouseMove, false);
        document.removeEventListener('mouseup', this.onMouseUp, false);
        
        this.state = this.STATE.NONE;
    }
    
    onMouseWheel(event) {
        if (!this.enabled || !this.enableZoom) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        if (event.deltaY < 0) {
            this.dollyOut();
        } else if (event.deltaY > 0) {
            this.dollyIn();
        }
        
        this.update();
    }
    
    onContextMenu(event) {
        if (!this.enabled) return;
        event.preventDefault();
    }
    
    // Helper methods
    pan(deltaX, deltaY) {
        const offset = new THREE.Vector3();
        const element = this.domElement;
        
        if (this.camera.isPerspectiveCamera) {
            // Perspective camera
            const position = this.camera.position;
            offset.copy(position).sub(this.target);
            let targetDistance = offset.length();
            
            // Half of the fov is center to top of screen
            targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);
            
            // We use only clientHeight here so aspect ratio does not distort speed
            const panLeft = (deltaX * targetDistance / element.clientHeight) * 2;
            const panUp = (deltaY * targetDistance / element.clientHeight) * 2;
            
            if (this.screenSpacePanning) {
                // Screen space panning
                const right = new THREE.Vector3();
                const up = new THREE.Vector3();
                
                right.setFromMatrixColumn(this.camera.matrix, 0);
                up.setFromMatrixColumn(this.camera.matrix, 1);
                
                right.multiplyScalar(-panLeft);
                up.multiplyScalar(panUp);
                
                this.panOffset.add(right);
                this.panOffset.add(up);
            } else {
                // World space panning
                const right = new THREE.Vector3();
                right.setFromMatrixColumn(this.camera.matrix, 0);
                right.multiplyScalar(-panLeft);
                
                const up = new THREE.Vector3(0, 1, 0);
                up.multiplyScalar(panUp);
                
                this.panOffset.add(right);
                this.panOffset.add(up);
            }
        } else if (this.camera.isOrthographicCamera) {
            // Orthographic camera
            const panLeft = deltaX * (this.camera.right - this.camera.left) / this.camera.zoom / element.clientWidth;
            const panUp = deltaY * (this.camera.top - this.camera.bottom) / this.camera.zoom / element.clientHeight;
            
            this.panOffset.x -= panLeft;
            this.panOffset.y += panUp;
        }
    }
    
    dollyIn() {
        if (this.camera.isPerspectiveCamera) {
            this.scale /= Math.pow(0.95, this.zoomSpeed);
        } else if (this.camera.isOrthographicCamera) {
            this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom * 1.1));
            this.camera.updateProjectionMatrix();
            this.zoomChanged = true;
        }
    }
    
    dollyOut() {
        if (this.camera.isPerspectiveCamera) {
            this.scale *= Math.pow(0.95, this.zoomSpeed);
        } else if (this.camera.isOrthographicCamera) {
            this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom / 1.1));
            this.camera.updateProjectionMatrix();
            this.zoomChanged = true;
        }
    }
}

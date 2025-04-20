import * as THREE from 'three';

export class LevelEditor {
    scene: THREE.Scene;
    platforms: THREE.Mesh[];
    obstacles: THREE.Mesh[];
    goals: THREE.Mesh[];

    constructor(scene: THREE.Scene) {
      this.scene = scene;
      this.platforms = [];
      this.obstacles = [];
      this.goals = [];
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

    clearLevel() {
      // Remove todos os objetos do nível
      this.getAllObjects().forEach(object => {
        this.scene.remove(object);
      });

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
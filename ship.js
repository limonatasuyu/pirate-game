import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class Ship {
  constructor(scene, position = new THREE.Vector3(0, 0, 0), scale = 1, onModelLoaded = () => {}) {
    this.scene = scene;
    this.position = position;
    this.scale = scale;
    this.model = null;
    this.mixer = null;
    this.animations = [];
    this.clock = new THREE.Clock();
    this.onModelLoaded = onModelLoaded;
    // Movement properties
    this.moveSpeed = 50;
    this.rotationSpeed = 0.02;
    this.keys = {};
    
    // Set up keyboard controls
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    
    this.loadModel(this.onModelLoaded);
  }
  
  loadModel(onModelLoaded) {
    const loader = new GLTFLoader();
    
    loader.load(
      // Resource Up
      'assets/models/Ship.glb',
      
      // Called when resource is loaded
      (gltf) => {
        this.model = gltf.scene;
        // Apply position and scale
        this.model.position.copy(this.position);
        this.model.scale.set(this.scale, this.scale, this.scale);
        this.model.rotation.set(0, -Math.PI/2, 0);
        // Add the model to the scene
        this.scene.add(this.model);
        
        // Store animations if available
        if (gltf.animations?.length) {
          this.mixer = new THREE.AnimationMixer(this.model);
          this.animations = gltf.animations;
          
          // Play the first animation by default
          const action = this.mixer.clipAction(this.animations[0]);
          action.play();
        }
        
        console.log('Ship model loaded successfully');
        onModelLoaded(this.model);
      },
      
      // Called while loading is in progress
      (xhr) => {
        const progress = (xhr.loaded / xhr.total) * 100;
        console.log(`Loading ship model: ${Math.round(progress)}% complete`);
      },
      
      // Called when loading has errors
      (error) => {
        console.error('Error loading ship model:', error);
      }
    );
  
  }
  
  onKeyDown(event) {
    this.keys[event.key.toLowerCase()] = true;
  }

  onKeyUp(event) {
    this.keys[event.key.toLowerCase()] = false;
  }
  
  update(deltaTime) {
    // Update animation mixer if it exists
    if (this.mixer) {
      this.mixer.update(deltaTime || this.clock.getDelta());
    }
    
    if (!this.model) return;
    
    const forward = new THREE.Vector3(-1, 0, 0);
    forward.applyQuaternion(this.model.quaternion);

    if (this.keys.shift) {
      this.moveSpeed = 100;
    } else {
      this.moveSpeed = 50;
    }

    if (this.keys.w) {
      const moveDistance = this.moveSpeed * (deltaTime || 0.016);
      this.model.position.addScaledVector(forward, moveDistance);
    }
    
    if (this.keys.d) {
      this.model.rotation.y -= this.rotationSpeed;
    }
    
    if (this.keys.a) {
      this.model.rotation.y += this.rotationSpeed;
    }
  }
  
  getPosition() {
    if (this.model) {
      return this.model.position;
    }
    return new THREE.Vector3();
  }

}

export { Ship }; 
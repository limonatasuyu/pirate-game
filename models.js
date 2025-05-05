import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const enemyShipScale = new THREE.Vector3(30, 30, 30);
const cannonBallScale = new THREE.Vector3(3, 3, 3);

class EnemyShipModel {
  static model = null;
  static animations = [];
  static modelPath = "./assets/models/animated-enemy-ship.glb";
  static isLoading = false;
  static loadPromise = null;
  
  /**
   * Load the model once and store it for reuse
   * @returns {Promise} A promise that resolves when the model is loaded
   */
  static loadModel() {
    // If model is already loaded, return it immediately
    if (this.model) {
      return Promise.resolve({
        model: this.model,
        animations: this.animations
      });
    }
    
    // If already loading, return the existing promise
    if (this.isLoading) {
      return this.loadPromise;
    }
    
    // Start loading the model
    this.isLoading = true;
    this.loadPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        this.modelPath,
        (gltf) => {
          this.model = gltf.scene;
          this.animations = gltf.animations;
          this.isLoading = false;
          resolve({
            model: this.model,
            animations: this.animations
          });
        },
        undefined,
        (error) => {
          this.isLoading = false;
          console.error("Error loading enemy ship model:", error);
          reject(error);
        }
      );
    });
    
    return this.loadPromise;
  }
  
  /**
   * Get a copy of the model for a new instance
   * @param {Array} otherEnemyPositions - Positions of other enemy ships to avoid overlap
   * @param {Function} positionCallback - Function to determine position (e.g., getRandomPosition)
   * @param {Function} rotationCallback - Function to determine rotation (e.g., getRandomRotation)
   * @returns {Promise} A promise that resolves with the copied model
   */
  static getModelCopy(otherEnemyPositions = [], positionCallback, rotationCallback) {
    return this.loadModel().then(({ model, animations }) => {
      // Create a deep clone of the model
      const modelCopy = model.clone(true);
      
      // Position and rotate the model
      if (positionCallback) {
        modelCopy.position.copy(positionCallback(otherEnemyPositions));
      }
      
      if (rotationCallback) {
        modelCopy.rotation.copy(rotationCallback());
      }
      
      // Apply standard scale
      modelCopy.scale.copy(enemyShipScale);
      
      return {
        model: modelCopy,
        animations: animations
      };
    });
  }
}

class CannonBallModel {
  static model = null;
  static modelPath = "assets/models/cannon-ball.glb";
  static isLoading = false;
  static loadPromise = null;
  
  /**
   * Load the model once and store it for reuse
   * @returns {Promise} A promise that resolves when the model is loaded
   */
  static loadModel() {
    // If model is already loaded, return it immediately
    if (this.model) {
      return Promise.resolve({
        model: this.model
      });
    }
    
    // If already loading, return the existing promise
    if (this.isLoading) {
      return this.loadPromise;
    }
    
    // Start loading the model
    this.isLoading = true;
    this.loadPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        this.modelPath,
        (gltf) => {
          this.model = gltf.scene;
          this.isLoading = false;
          resolve({
            model: this.model
          });
        },
        undefined,
        (error) => {
          this.isLoading = false;
          console.error("Error loading cannon ball model:", error);
          reject(error);
        }
      );
    });
    
    return this.loadPromise;
  }
  
  /**
   * Get a copy of the model for a new instance
   * @param {THREE.Vector3} position - Initial position for the cannon ball
   * @returns {Promise} A promise that resolves with the copied model
   */
  static getModelCopy(position) {
    return this.loadModel().then(({ model }) => {
      // Create a deep clone of the model
      const modelCopy = model.clone(true);
      
      // Position the model
      if (position) {
        modelCopy.position.copy(position);
      }
      
      // Apply standard scale
      modelCopy.scale.copy(cannonBallScale);
      
      return {
        model: modelCopy
      };
    });
  }
}

export { EnemyShipModel, CannonBallModel, enemyShipScale, cannonBallScale };
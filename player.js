import * as THREE from "three";
import { Ship } from "./ship.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { initialCameraPosition } from "./constants.js";
import { AttackProjectile } from "./attack-projectile.js";
import { cancelAllAnimationFrames, customRequestAnimationFrame } from "./utils.js";

export class Player {
  constructor(scene, camera, domElement, enemyManager) {
    this.scene = scene;
    this.camera = camera;

    this.health = 100;

    // Pre-create reusable objects to avoid garbage collection
    this._euler = new THREE.Euler(0, 0, 0, "YXZ");
    this._vector3 = new THREE.Vector3();

    // Camera position presets
    this.POSITION_ATTACK_LEFT = new THREE.Vector3(0, 7, -10);
    this.POSITION_ATTACK_RIGHT = new THREE.Vector3(0, 7, 10);

    // Initialize ship
    const shipPosition = new THREE.Vector3(0, 8, 0);
    const shipScale = 10;
    this.ship = new Ship(scene, shipPosition, shipScale, () => {
      this.ship.scene.add(this.camera);
      this.ship.model.add(this.camera);
      this.addHealthBar();
    });

    // Setup camera controls
    this.setupControls(domElement);
    this.setupEventListeners(enemyManager);
  }

  setDefaultCameraAzimuthAngle() {
    this.minAzimuthAngle = 1;
    this.maxAzimuthAngle = 2;
    this.splitAzimuthRange = false;
  }

  setAttackCameraAzimuthAngleForLeft() {
    this.minAzimuthAngle = 2.8;
    this.maxAzimuthAngle = Math.PI;
    this.minNegativeAzimuthAngle = -Math.PI;
    this.maxNegativeAzimuthAngle = -2.8;
    this.splitAzimuthRange = true;
  }

  setAttackCameraAzimuthAngleForRight() {
    this.minAzimuthAngle = -0.4;
    this.maxAzimuthAngle = 0.4;
    this.splitAzimuthRange = false;
  }

  fireCannonBall(enemyManager) {
    if (this.attackProjectile) {
      this.attackProjectile.fireCannonBall(enemyManager);
    }
  }

  addHealthBar() {
    this.healthBarContainer = document.querySelector("#health-bar-container");
    this.healthBarGreen = document.querySelector("#health-bar-green");
    this.healthBarRed = document.querySelector("#health-bar-red");
    this.updatePlayerHealth(0);
  }

  pushBack(enemyPosition) {
    const direction = enemyPosition.clone().sub(this.ship.model.position).normalize();
    const reversedDirection = direction.multiplyScalar(-25);
    const targetPosition = this.ship.model.position.clone().add(reversedDirection);
    targetPosition.y = 0; // Ensure y remains at 0
    
    const duration = 300; // milliseconds
    const startTime = Date.now();
    const startPosition = this.ship.model.position.clone();

    const animatePushBack = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      this.ship.model.position.lerpVectors(startPosition, targetPosition, easeOut);
      
      if (progress < 1) {
        customRequestAnimationFrame(animatePushBack);
      }
    };
    
    animatePushBack();
  }

  updatePlayerHealth(difference) {
    if (typeof this.health !== "number") {
      console.error("Player health is not initialized or invalid:", this.health);
      return;
    }
    this.health += difference;
    this.healthBarGreen.style.width = `${this.health}%`;
    this.healthBarRed.style.width = `${100 - this.health}%`;

    return this.health;
  }

  setupEventListeners(enemyManager) {
    this.isInAttackMode = false;

    this.handleMouseDown = (e) => {
      if (e.button === 2 && !this.isInAttackMode) {
        this.isInAttackMode = true;
        this.switchToAttackPosition();
      }
      if (e.button === 0 && this.isInAttackMode) {
        this.fireCannonBall(enemyManager);
      }
    };
    document.addEventListener("mousedown", this.handleMouseDown);

    this.handleMouseUp = (e) => {
      if (e.button === 2 && this.isInAttackMode) {
        this.isInAttackMode = false;
        this.switchToDefaultPosition();
      }
    };
    document.addEventListener("mouseup", this.handleMouseUp);
  }

  setupControls(domElement) {
    this.controls = new PointerLockControls(this.camera, domElement);
    this.controls.minPolarAngle = 1.4;
    this.controls.maxPolarAngle = 1.8;

    this.setDefaultCameraAzimuthAngle();

    const handleClick = () => {
      this.controls.lock();
    };
    domElement.addEventListener("click", handleClick);

    // Cache event handlers to allow proper cleanup if needed
    this.lockHandler = () => {};
    this.unlockHandler = () => {};

    this.controls.addEventListener("lock", this.lockHandler);
    this.controls.addEventListener("unlock", this.unlockHandler);
  }

  update(deltaTime) {
    if (this.ship) {
      this.ship.update(deltaTime);
    }

    this.controls?.update();

    if (this.controls?.isLocked) {
      this.applyAzimuthConstraints();

      if (this.attackProjectile) {
        this.attackProjectile.update(this._euler.y, this._euler.x);
      }
    }
  }

  addAttackProjectile(direction) {
    this.attackProjectile = new AttackProjectile(this.ship);

    if (direction === "left") {
      this.attackProjectile.updateCurve([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 10, 10),
        new THREE.Vector3(-5, 0, 20),
      ]);
    } else if (direction === "right") {
      this.attackProjectile.updateCurve([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 10, -10),
        new THREE.Vector3(-5, 0, -20),
      ]);
    } else {
      throw new Error("Invalid direction");
    }
  }

  removeAttackProjectile() {
    if (this.attackProjectile) {
      if (this.attackProjectile.curveMesh) {
        this.attackProjectile.curveMesh.removeFromParent();
        this.attackProjectile.curveMesh.geometry.dispose();
        this.attackProjectile.curveMesh.material.dispose();
      }
      this.attackProjectile = null;
    }
  }

  switchToAttackPosition() {
    if (!this.ship?.model || !this._euler) return;

    this._euler.setFromQuaternion(this.camera.quaternion);
    const currentAzimuthAngle = this._euler.y;

    if (currentAzimuthAngle > Math.PI / 2) {
      this.camera.position.copy(this.POSITION_ATTACK_LEFT);
      this.setAttackCameraAzimuthAngleForLeft();
      this.addAttackProjectile("left");
    } else if (!this.splitAzimuthRange) {
      this.camera.position.copy(this.POSITION_ATTACK_RIGHT);
      this.setAttackCameraAzimuthAngleForRight();
      this.addAttackProjectile("right");
    }
  }

  switchToDefaultPosition() {
    if (!this.ship?.model) return;

    // Use cached default quaternion
    this.camera.quaternion.set(
      -0.04282574486378726,
      0.7058087244975528,
      0.04282574486378742,
      0.7058087244975518
    );
    this.camera.position.copy(initialCameraPosition);
    this.setDefaultCameraAzimuthAngle();
    this.removeAttackProjectile();
  }

  // Simplified to avoid redundant method call in update
  applyAzimuthConstraints() {
    this._euler.setFromQuaternion(this.camera.quaternion);

    if (this.splitAzimuthRange) {
      // Handle split range case (for left attack position)
      if (this._euler.y > -2.8 && this._euler.y < 2.8) {
        // If angle is in the forbidden middle zone, snap to nearest allowed edge
        this._euler.y = this._euler.y >= 0 ? 2.8 : -2.8;
      } else {
        // Otherwise, clamp to the appropriate range
        if (this._euler.y >= 0) {
          this._euler.y = THREE.MathUtils.clamp(this._euler.y, this.minAzimuthAngle, this.maxAzimuthAngle);
        } else {
          this._euler.y = THREE.MathUtils.clamp(
            this._euler.y,
            this.minNegativeAzimuthAngle,
            this.maxNegativeAzimuthAngle
          );
        }
      }
    } else {
      // Handle continuous range case (for default and right attack positions)
      this._euler.y = THREE.MathUtils.clamp(this._euler.y, this.minAzimuthAngle, this.maxAzimuthAngle);
    }

    // Update camera orientation with constrained Euler angles
    this.camera.quaternion.setFromEuler(this._euler, "YXZ");
  }

  getPosition() {
    return this.ship ? this.ship.getPosition() : this._vector3.set(0, 0, 0);
  }

  gameOver() {
    document.querySelector("#game-over-screen").style.display = "block";
    cancelAllAnimationFrames()
  }

  youWon() {
    document.querySelector("#you-won-screen").style.display = "flex";
    cancelAllAnimationFrames()
  }

  dispose() {
    // Remove event listeners
    document.removeEventListener("mousedown", this.handleMouseDown);
    document.removeEventListener("mouseup", this.handleMouseUp);

    // Clean up controls
    if (this.controls) {
      this.controls.removeEventListener("lock", this.lockHandler);
      this.controls.removeEventListener("unlock", this.unlockHandler);
      this.controls.dispose();
      this.controls = null;
    }
  }
}

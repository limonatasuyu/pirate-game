import * as THREE from "three";
import { PlaySound } from "./utils.js";
import {
  customRequestAnimationFrame,
  getRandomDestination,
  getRandomPosition,
  getRandomRotation,
} from "./utils.js";
import { EnemyShipModel, CannonBallModel } from "./models.js";

class EnemyShip {
  constructor(scene, enemyManager) {
    this.enemyManager = enemyManager;
    this.scene = scene;
    this.health = 100;
    this.animations = [];
    this.isHostile = false;
    this.id = new Date().getTime();
  }

  addHealthBar() {
    this.healthBarContainer = new THREE.Object3D();
    this.healthBarContainer.position.set(0, 5, 0);
    this.model.add(this.healthBarContainer);

    this.healthBarGreen = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.2, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    this.healthBarGreen.position.set(0, 0, 0);
    this.healthBarContainer.add(this.healthBarGreen);

    this.healthBarRed = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.2, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    this.healthBarRed.position.set(0, 0, 0);
    this.healthBarContainer.add(this.healthBarRed);

    this.updateHealthBar();
  }

  updateHealthBar() {
    if (!this.healthBarGreen || !this.healthBarRed) return;

    const healthPercent = this.health / 100;

    this.healthBarGreen.scale.set(healthPercent, 1, 1);
    this.healthBarGreen.position.set((healthPercent - 1) / 2, 0, 0);

    this.healthBarRed.scale.set(1 - healthPercent, 1, 1);
    this.healthBarRed.position.set(healthPercent / 2, 0, 0);
  }

  addShip(callback, otherEnemyShips = []) {
    const otherEnemyPositions = otherEnemyShips
      .filter((enemy) => enemy.model)
      .map((enemy) => enemy.model.position);
    
    EnemyShipModel.getModelCopy(otherEnemyPositions, getRandomPosition, getRandomRotation)
      .then(({ model, animations }) => {
        this.model = model;
        this.animations = animations;
        
        this.scene.add(model);
        
        this.addHealthBar();
        if (callback) callback();
      })
      .catch(error => {
        console.error("Failed to load enemy ship model:", error);
      });
  }

  smoothLookAt(targetPosition, rotationSpeed = 0.1) {
    if (!this.model) return;

    const originalQuaternion = this.model.quaternion.clone();
    this.model.lookAt(targetPosition);
    const targetQuaternion = this.model.quaternion.clone();

    this.model.quaternion.copy(originalQuaternion);

    this.model.quaternion.slerp(targetQuaternion, rotationSpeed);
  }

  wanderAround(deltaTime) {
    if (!this.destination) {
      this.destination = getRandomDestination();
    }

    const currentPosition = this.model.position;
    const destination = this.destination;

    const direction = new THREE.Vector3(
      destination.x - currentPosition.x,
      destination.y - currentPosition.y,
      destination.z - currentPosition.z
    );

    if (direction.length() < 0.1) {
      this.destination = getRandomDestination();
      return;
    }

    direction.normalize();

    const speed = 10;
    const moveDistance = speed * deltaTime;

    const moveStep = direction.multiplyScalar(moveDistance);

    this.smoothLookAt(destination);
    this.model.position.add(moveStep);
  }

  attackToPlayer(deltaTime, playerInstance, playerPosition) {
    if (!this.enemyManager.isEnemyExists(this.id)) return;
    const currentPosition = this.model.position;

    const direction = new THREE.Vector3(
      playerPosition.x - currentPosition.x,
      playerPosition.y - currentPosition.y,
      playerPosition.z - currentPosition.z
    );

    const distanceToPlayer = direction.length();
    const desiredDistance = 200;

    if (distanceToPlayer > desiredDistance) {
      direction.normalize();

      const speed = 10;
      const moveDistance = speed * deltaTime;

      const moveStep = direction.clone().multiplyScalar(moveDistance);

      this.smoothLookAt(playerPosition);
      this.model.position.add(moveStep);
    } else {
      this.smoothLookAt(playerPosition);

      if (!this.lastFireTime) this.lastFireTime = 0;
      this.lastFireTime += deltaTime;

      if (this.lastFireTime >= 4) {
        this.fireCannonBall(playerInstance, playerPosition);
        this.lastFireTime = 0;
      }
    }
  }

  fireCannonBall(playerInstance, playerPosition) {
    PlaySound("assets/sounds/cannon-fire.mp3", 0.7);
    const raisedPlayerPositon = new THREE.Vector3(playerPosition.x, playerPosition.y + 10, playerPosition.z);
    const raisedModelPosition = new THREE.Vector3(
      this.model.position.x,
      this.model.position.y + 10,
      this.model.position.z
    );
    const points = [raisedModelPosition, raisedPlayerPositon];
    
    CannonBallModel.getModelCopy(points[0]).then(({ model }) => {
      const cannonBall = model;
      this.scene.add(cannonBall);


      const curve = new THREE.CatmullRomCurve3(points);

      const totalLength = curve.getLength();
      const speed = 100;
      const totalDuration = Math.min(totalLength / speed, 6);

      let startTime = null;
      let isHit = false;
      const animateCannonBall = (timestamp) => {
        if (startTime === null) startTime = timestamp;
        const elapsedTime = (timestamp - startTime) / 1000; // Convert to seconds
        const isEnemyExists = this.enemyManager.isEnemyExists(this.id);
        if (isEnemyExists && elapsedTime < totalDuration) {
          // Calculate progress based on consistent speed
          const progress = elapsedTime / totalDuration;
          const position = curve.getPointAt(progress);
          cannonBall.position.copy(position);

          const distanceBetweenCannonBallAndPlayer = cannonBall
            .getWorldPosition(new THREE.Vector3())
            .distanceTo(playerPosition);
          const threshold = 50;
          if (distanceBetweenCannonBallAndPlayer < threshold && !isHit) {
            PlaySound("assets/sounds/explosion.mp3", 0.3);
            const newPlayerHealth = playerInstance.updatePlayerHealth(-10);
            isHit = true;
            if (newPlayerHealth <= 0) {
              playerInstance.gameOver();
            }
          }

          customRequestAnimationFrame(animateCannonBall);
        } else {
          this.scene.remove(cannonBall);
          cannonBall.traverse((child) => {
            if (child.isMesh) {
              child.geometry.dispose();
              child.material.dispose();
            }
          });
        }
      };

      customRequestAnimationFrame(animateCannonBall);
    });
  }

  updateMovement(deltaTime, playerInstance, playerPosition) {
    if (!this.model) return;
    if (!this.isHostile) {
      this.wanderAround(deltaTime);
    } else {
      this.attackToPlayer(deltaTime, playerInstance, playerPosition);
    }
  }
}
export default EnemyShip;

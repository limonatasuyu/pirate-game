import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PlaySound } from "./utils.js";
import { customRequestAnimationFrame } from "./utils.js";

const getDestination = () => {
  const x = Math.random() * 800 - 200;
  const z = Math.random() * 200 - 200;

  const position = new THREE.Vector3(x, 0, z);
  return position;
};

const getRandomPosition = (otherEnemyPositions) => {
  const x = Math.random() * 800 - 400;
  const z = Math.random() * 800 - 400;
  const position = new THREE.Vector3(x, 0, z);

  const distanceThreshold = 200;
  const isItTooCloseToOtherEnemies = otherEnemyPositions.some(
    (enemyPosition) => position.distanceTo(enemyPosition) < distanceThreshold
  );
  const isItTooCloseToTheCenter = position.distanceTo(new THREE.Vector3(0, 0, 0)) < distanceThreshold;
  if (isItTooCloseToOtherEnemies || isItTooCloseToTheCenter) {
    return getRandomPosition(otherEnemyPositions);
  }
  return position;
};

const getRandomRotation = () => {
  // Randomize X and Z rotation, keep Y at 0
  return new THREE.Euler(
    Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
    0,
    Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
    "XYZ"
  );
};

const enemyShipScale = new THREE.Vector3(30, 30, 30);

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
    const loader = new GLTFLoader();
    loader.load("./assets/models/animated-enemy-ship.glb", (gltf) => {
      const ship = gltf.scene;
      this.model = ship;
      this.animations = gltf.animations;
      // Only get positions from ships that have loaded models
      const otherEnemyPositions = otherEnemyShips
        .filter((enemy) => enemy.model)
        .map((enemy) => enemy.model.position);

      ship.position.copy(getRandomPosition(otherEnemyPositions));
      ship.rotation.copy(getRandomRotation());
      ship.scale.copy(enemyShipScale);
      this.scene.add(ship);

      this.addHealthBar();
      if (callback) callback();
    });
  }

  smoothLookAt(targetPosition, rotationSpeed = 0.1) {
    if (!this.model) return;

    // Save the original rotation
    const originalQuaternion = this.model.quaternion.clone();

    // Temporarily look at the target
    this.model.lookAt(targetPosition);
    const targetQuaternion = this.model.quaternion.clone();

    // Restore original rotation
    this.model.quaternion.copy(originalQuaternion);

    // Smoothly interpolate toward the target rotation
    this.model.quaternion.slerp(targetQuaternion, rotationSpeed);
  }

  wanderAround(deltaTime) {
    if (!this.destination) {
      this.destination = getDestination();
    }

    const currentPosition = this.model.position;
    const destination = this.destination;

    // Create a direction vector
    const direction = new THREE.Vector3(
      destination.x - currentPosition.x,
      destination.y - currentPosition.y,
      destination.z - currentPosition.z
    );

    if (direction.length() < 0.1) {
      this.destination = getDestination();
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

    // Direction from enemy to player
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
    const loader = new GLTFLoader();

    loader.load("assets/models/cannon-ball.glb", (gltf) => {
      const cannonBall = gltf.scene;
      const scale = 3;
      cannonBall.scale.set(scale, scale, scale);

      this.scene.add(cannonBall);

      cannonBall.position.copy(points[0]);

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
            isHit = true
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

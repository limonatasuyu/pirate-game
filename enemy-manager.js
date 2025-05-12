import * as THREE from "three";
import EnemyShip from "./enemy-ship.js";
import { isColliding } from "./utils.js";
import { getRandomDestination } from "./utils.js";
const enemyNumber = 3;

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.isEnemiesSpawned = false;
    this.enemies = [];
    this.addEnemies();
    this.isDying = false;
  }

  addEnemies() {
    this.addNextEnemy();
    this.isEnemiesSpawned = true;
  }

  addNextEnemy(index = 0) {
    if (index >= enemyNumber) return;
    const enemy = new EnemyShip(this.scene, this);
    this.enemies.push(enemy);

    const loadedEnemies = this.enemies.filter((e) => e.model !== undefined);

    enemy.addShip(() => {
      this.addNextEnemy(index + 1);
    }, loadedEnemies);
  }


  hasEnemies() {
    return this.enemies.length > 0 && this.enemies[0].model !== undefined;
  }

  getMainEnemyPosition() {
    if (!this.hasEnemies()) return null;

    const objectWorldPosition = new THREE.Vector3();
    this.enemies[0].model.getWorldPosition(objectWorldPosition);
    return objectWorldPosition;
  }

  update(deltaTime, playerInstance, playerPosition) {
    if (this.enemies.length === 0 && this.isEnemiesSpawned) {
        playerInstance.youWon();
      };
    for (const enemy of this.enemies) {
      if (enemy.mixer) {
        enemy.mixer.update(deltaTime / 4);
      }

      if (enemy.model && playerInstance && playerPosition) {
        enemy.updateMovement(deltaTime, playerInstance, playerPosition);
      }

      if (!enemy.isDying && isColliding(playerPosition, enemy.model.position)) {
        enemy.isHostile = true;
        enemy.health -= 1;
        enemy.updateHealthBar();
        playerInstance.updatePlayerHealth(-1);
        playerInstance.pushBack(enemy.model.position);
        enemy.pushBack(playerPosition);
        if (enemy.health <= 0) {
          this.removeEnemy(enemy);
        }
      }

      for (const secondEnemy of this.enemies) {
        if (secondEnemy.id === enemy.id) continue;

        if (!enemy.isDying && isColliding(enemy.model.position, secondEnemy.model.position)) {
          enemy.pushBack(secondEnemy.model.position);
          enemy.destination = getRandomDestination();
        }
      }
    }
  }

  removeEnemy(enemy) {
    enemy.isDying=true;
    if (enemy.model) {
      if (enemy.animations) {
        enemy.mixer = new THREE.AnimationMixer(enemy.model);
        const action1 = enemy.mixer.clipAction(enemy.animations[0]);
        const action2 = enemy.mixer.clipAction(enemy.animations[1]);
        // Play the animation once and then remove from scene
        action1.setLoop(THREE.LoopOnce);
        action1.clampWhenFinished = true;
        action2.setLoop(THREE.LoopOnce);
        action2.clampWhenFinished = true;

        // When animation completes, remove the model from the scene
        enemy.mixer.addEventListener("finished", () => {
          this.scene.remove(enemy.model);
          this.enemies = this.enemies.filter((i) => i.id !== enemy.id);
        });

        action1.play();
        action2.play();

        // Keep the enemy in the array until animation completes
        //this.enemies.push(enemy);
      } else {
        // If no animations, remove immediately
        this.scene.remove(enemy.model);
        this.enemies = this.enemies.filter((i) => i.id !== enemy.id);
      }
    }
  }

  isEnemyExists(enemyId) {
    //console.log("this.enemies: ", this.enemies);
    return Boolean(this.enemies.some((i) => i.id === enemyId));
  }
}

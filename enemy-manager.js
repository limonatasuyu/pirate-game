import * as THREE from "three";
import EnemyShip from "./enemy-ship.js";
const enemyNumber = 10;

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.addEnemies();
  }

  addEnemies() {
    const addNextEnemy = (index = 0) => {
      if (index >= enemyNumber) return;
      const enemy = new EnemyShip(this.scene, this);
      this.enemies.push(enemy);

      // Only pass enemies that already have models loaded
      const loadedEnemies = this.enemies.filter((e) => e.model !== undefined);

      // Wait for this enemy to load before adding the next one
      enemy.addShip(() => {
        addNextEnemy(index + 1);
      }, loadedEnemies);
    };

    addNextEnemy();
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
    for (const enemy of this.enemies) {
      // Update animation if mixer exists
      if (enemy.mixer) {
        enemy.mixer.update(deltaTime / 4); // slow down the animation
      }

      // Move enemy if it has a model and there's a valid player position
      if (enemy.model && playerInstance && playerPosition) {
        // Call the enemy's move method or implement movement logic
        enemy.updateMovement(deltaTime, playerInstance, playerPosition);
      }
    }
  }

  removeEnemy(enemy) {
    if (enemy.model) {
      // Create a death/removal animation
      if (enemy.animations) {
        // Store the mixer on the enemy object so it can be updated
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

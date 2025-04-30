import * as THREE from "three";
import { Environment } from "./environment.js";
import { Player } from "./player.js";
import { EnemyManager } from "./enemy-manager.js";
import { UI } from "./ui.js";
import { initialCameraPosition } from "./constants.js";
import { customRequestAnimationFrame } from "./utils.js";

class Game {
  constructor() {
    // Core scene setup
    this.scene = new THREE.Scene();
    this.setupRenderer();
    this.setupCamera();
    this.clock = new THREE.Clock();

    // Initialize components
    this.environment = new Environment(this.scene, this.renderer);
    this.ui = new UI();
    this.enemyManager = new EnemyManager(this.scene);

    this.gameState = {
      enemyOnSight: false,
      enemyManager: this.enemyManager,
    };
    this.player = new Player(this.scene, this.camera, this.renderer.domElement, this.gameState);

    // Start game loop
    this.animate();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.querySelector("#game-container").appendChild(this.renderer.domElement);

    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.copy(initialCameraPosition);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  checkEnemyInSight() {
    if (!this.enemyManager.hasEnemies() || !this.ui.crosshair) return;

    const enemyPosition = this.enemyManager.getMainEnemyPosition();
    if (!enemyPosition) return;

    const screenPosition = enemyPosition.clone().project(this.camera);
    const threshold = 0.05;

    const isCentered = Math.abs(screenPosition.x) < threshold && Math.abs(screenPosition.y) < threshold;

    this.gameState.enemyOnSight = isCentered;
    this.ui.updateCrosshair(isCentered);
  }

  animate() {
    customRequestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    // Update components
    this.environment.update(deltaTime);
    this.player.update(deltaTime);
    this.checkEnemyInSight();
    this.enemyManager.update(deltaTime, this.player, this.player.getPosition());
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game
new Game();

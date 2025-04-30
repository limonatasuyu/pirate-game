import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PlaySound } from "./utils.js";
import { customRequestAnimationFrame } from "./utils.js";
class AttackArrow {
  constructor(ship) {
    this.ship = ship;
    this.model = null;
    this.curveMesh = null;
    this.material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0.2,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.AddEquation,
      depthWrite: false,
    });
  }

  createCurve(points) {
    if (this.curveMesh) {
      this.ship.model.remove(this.curveMesh);
      this.curveMesh.geometry.dispose();
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.5, 8, false);
    this.curveMesh = new THREE.Mesh(tubeGeometry, this.material);

    this.ship.model.add(this.curveMesh);
  }

  fireCannonBall(enemyManager) {
    PlaySound("assets/sounds/cannon-fire.mp3", 0.7);
    const loader = new GLTFLoader();

    loader.load("assets/models/cannon-ball.glb", (gltf) => {
      const cannonBall = gltf.scene;
      cannonBall.scale.set(0.3, 0.3, 0.3);

      this.ship.model.add(cannonBall);

      cannonBall.position.copy(this.points[0]);

      const extendedPoints = [...this.points];

      const lastPoint = this.points[this.points.length - 1];
      const secondLastPoint = this.points[this.points.length - 2];
      const direction = new THREE.Vector3().subVectors(lastPoint, secondLastPoint).normalize();

      const segmentLength = lastPoint.distanceTo(secondLastPoint);
      for (let i = 1; i <= 20; i++) {
        const newPoint = lastPoint.clone().add(direction.clone().multiplyScalar(segmentLength * i));
        extendedPoints.push(newPoint);
      }

      const curve = new THREE.CatmullRomCurve3(extendedPoints);

      const totalLength = curve.getLength();
      const speed = 20;
      const totalDuration = Math.min(totalLength / speed, 6);

      let startTime = null;
      let isHit = false;
      const animateCannonBall = (timestamp) => {
        
        if (startTime === null) startTime = timestamp;
        const elapsedTime = (timestamp - startTime) / 1000; // Convert to seconds

        if (elapsedTime < totalDuration) {
          // Calculate progress based on consistent speed
          const progress = elapsedTime / totalDuration;
          const position = curve.getPointAt(progress);
          cannonBall.position.copy(position);

          for (const enemy of enemyManager.enemies) {
            const distanceBetweenCannonBallAndEnemy = cannonBall.getWorldPosition(new THREE.Vector3()).distanceTo(enemy.model.getWorldPosition(new THREE.Vector3()));
            const threshold = 50
            if (distanceBetweenCannonBallAndEnemy < threshold && !isHit) {
              PlaySound("assets/sounds/explosion.mp3", 0.3);
              isHit = true;
              enemy.health -= 10;
              if (!enemy.isHostile) {
                enemy.isHostile = true
              }
              enemy.updateHealthBar();
              if (enemy.health <= 0) {
                enemyManager.removeEnemy(enemy);
              }
            }
          }

          // Continue animation
          customRequestAnimationFrame(animateCannonBall);
        } else {
          // Animation complete, remove the cannon ball
          this.ship.model.remove(cannonBall);
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

  updateCurve(points) {
    this.points = points;
    this.createCurve(points);
  }

  update(cameraAzimuthAngle, cameraPolarAngle) {
    if (!this.previousRotation) {
      this.previousRotation = cameraAzimuthAngle;
    }
    if (!this.previousPolarAngle) {
      this.previousPolarAngle = cameraPolarAngle;
    }

    const rotationDelta = cameraAzimuthAngle - this.previousRotation;
    const polarDelta = cameraPolarAngle - this.previousPolarAngle;
    const lastPointIndex = this.points.length - 1;
    const secondLastPoint = this.points[lastPointIndex - 1];
    const lastPoint = this.points[lastPointIndex].clone();

    // Calculate the relative position from second-last point to last point
    const relativePos = lastPoint.clone().sub(secondLastPoint);

    // Create rotation matrix around Y axis (assuming Y is up)
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationY(rotationDelta);

    // Apply rotation to the relative position
    relativePos.applyMatrix4(rotationMatrix);

    // Adjust length based on polar angle change
    // When looking down (increasing polar angle), point gets closer
    // When looking up (decreasing polar angle), point gets farther
    const scaleFactor = 1 - polarDelta * 5; // Increased multiplier for more dramatic scaling
    relativePos.multiplyScalar(Math.max(0.1, scaleFactor)); // Ensure minimum distance is 10% of original

    // Add back to the second-last point position to get new last point
    const newLastPoint = secondLastPoint.clone().add(relativePos);

    this.updateCurve([...this.points.slice(0, lastPointIndex), newLastPoint]);

    this.previousRotation = cameraAzimuthAngle;
    this.previousPolarAngle = cameraPolarAngle;
  }
}

export { AttackArrow };

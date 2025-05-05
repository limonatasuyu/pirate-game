import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


export class Environment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.setupLights();
    this.setupWater();
    this.setupSky();
    //this.setupIslands();
  }

  setupIslands() {
    const loader = new GLTFLoader();

    loader.load(
      // Resource Up
      "assets/models/islands.glb",

      // Called when resource is loaded
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);

        // Store animations if available
        if (gltf.animations?.length) {
          this.mixer = new THREE.AnimationMixer(this.model);
          this.animations = gltf.animations;

          // Play the first animation by default
          const action = this.mixer.clipAction(this.animations[0]);
          action.play();
        }

        console.log("Islands model loaded successfully");
        onModelLoaded(this.model);
      },

      // Called while loading is in progress
      (xhr) => {
        const progress = (xhr.loaded / xhr.total) * 100;
        console.log(`Loading islands model: ${Math.round(progress)}% complete`);
      },

      // Called when loading has errors
      (error) => {
        console.error("Error loading islands model:", error);
      }
    );
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    this.scene.add(directionalLight);
  }

  setupWater() {
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg",
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xffffff,
      waterColor: 0x0077ff,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.scene.add(this.water);
  }

  setupSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    this.skyUniforms = this.sky.material.uniforms;

    this.skyUniforms.turbidity.value = 10;
    this.skyUniforms.rayleigh.value = 2;
    this.skyUniforms.mieCoefficient.value = 0.005;
    this.skyUniforms.mieDirectionalG.value = 0.8;

    this.parameters = {
      elevation: 2,
      azimuth: 180,
    };

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.renderTarget = undefined;

    this.updateSun();
  }

  updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - this.parameters.elevation);
    const theta = THREE.MathUtils.degToRad(this.parameters.azimuth);

    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms.sunPosition.value.copy(sun);
    this.water.material.uniforms.sunDirection.value.copy(sun).normalize();

    if (this.renderTarget !== undefined) this.renderTarget.dispose();

    this.renderTarget = this.pmremGenerator.fromScene(this.sky);
    this.scene.environment = this.renderTarget.texture;
  }

  update(deltaTime) {
    // Animate water
    if (this.water) {
      this.water.material.uniforms.time.value += 1.0 / 60.0;
    }
  }
}

import * as THREE from "three";
const rafHandles = new Set();

/**
 * Enhanced version of requestAnimationFrame that automatically tracks request IDs
 * for easier cleanup when cancellation is needed.
 * 
 * @param {(time: DOMHighResTimeStamp) => void} callback - Function to call on animation frame
 * @returns {number} The request ID that can be used to cancel the animation frame
 */
function customRequestAnimationFrame(callback) {
  const id = requestAnimationFrame((time) => {
    rafHandles.delete(id); // clean up after call
    callback(time);
  });
  rafHandles.add(id);
  return id;
}

/**
 * Cancels all tracked animation frame requests.
 * Useful for cleaning up when transitioning between scenes or when component unmounts.
 */
function cancelAllAnimationFrames() {
  for (const id of rafHandles) {
    cancelAnimationFrame(id);
  }
  rafHandles.clear();
}

/**
 * Audio context for sound playback with cross-browser compatibility
 * @type {AudioContext}
 */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Cache for storing decoded audio buffers to avoid redundant fetching and decoding
 * @type {Map<string, AudioBuffer>}
 */
const audioBufferCache = new Map();

/**
 * Plays a sound file with caching for improved performance.
 * Fetches, decodes, and caches audio files on first use, then reuses from cache.
 * 
 * @async
 * @param {string} path - The path to the sound file to play
 * @param {number} [volume=1] - Volume level from 0 (silent) to 1 (full volume)
 * @returns {Promise<void>}
 */
async function PlaySound(path, volume = 1) {
  // If not cached, fetch and decode the audio file
  if (!audioBufferCache.has(path)) {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBufferCache.set(path, audioBuffer);
  }

  // Get the decoded audio buffer from cache
  const audioBuffer = audioBufferCache.get(path);

  // Create a new source for playback
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create gain node to control volume
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;

  source.connect(gainNode).connect(audioContext.destination);
  source.start(0);
}


/**
 * Generates a random destination position within a predefined area.
 * Creates positions primarily in the positive X range with varied Z coordinates.
 * 
 * @returns {THREE.Vector3} A random position vector with y=0 (on the horizontal plane)
 */
function getRandomDestination() {
  const x = Math.random() * 800 - 200;
  const z = Math.random() * 200 - 200;

  const position = new THREE.Vector3(x, 0, z);
  return position;
}

/**
 * Generates a random position that maintains minimum distance from other positions and the center.
 * Uses recursion to ensure proper spacing between entities in the game world.
 * 
 * @param {Array<THREE.Vector3>} otherEnemyPositions - Array of existing enemy positions to avoid
 * @returns {THREE.Vector3} A random position that maintains proper spacing
 */
function getRandomPosition(otherEnemyPositions) {
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
}

/**
 * Generates a random rotation with slight tilt on X and Z axes, keeping Y rotation at 0.
 * Creates a natural-looking variation in object orientation while maintaining upright positioning.
 * 
 * @returns {THREE.Euler} A random rotation with small variations on X and Z axes
 */
function getRandomRotation() {
  // Randomize X and Z rotation, keep Y at 0
  return new THREE.Euler(
    Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
    0,
    Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
    "XYZ"
  );
}

/**
 * Determines if two objects are colliding based on their positions and a fixed distance threshold.
 * 
 * @param {THREE.Vector3} position1 - Position vector of the first object
 * @param {THREE.Vector3} position2 - Position vector of the second object
 * @returns {boolean} True if objects are colliding (distance < threshold), false otherwise
 */
function isColliding(position1, position2) {
  const distance = position1.distanceTo(position2);
  const threshold = 100;
  if (distance < threshold) {
    return true;
  }
  return false;
}

export {
  PlaySound,
  customRequestAnimationFrame,
  cancelAllAnimationFrames,
  getRandomDestination,
  getRandomPosition,
  getRandomRotation,
  isColliding,
};

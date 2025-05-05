import * as THREE from "three";

const rafHandles = new Set();

function customRequestAnimationFrame(callback) {
  const id = requestAnimationFrame((time) => {
    rafHandles.delete(id); // clean up after call
    callback(time);
  });
  rafHandles.add(id);
  return id;
}

function cancelAllAnimationFrames() {
  for (const id of rafHandles) {
    cancelAnimationFrame(id);
  }
  rafHandles.clear();
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBufferCache = new Map();

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


function getRandomDestination() {
  const x = Math.random() * 800 - 200;
  const z = Math.random() * 200 - 200;

  const position = new THREE.Vector3(x, 0, z);
  return position;
}

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

function getRandomRotation() {
  // Randomize X and Z rotation, keep Y at 0
  return new THREE.Euler(
    Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
    0,
    Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
    "XYZ"
  );
}

export {
  PlaySound,
  customRequestAnimationFrame,
  cancelAllAnimationFrames,
  getRandomDestination,
  getRandomPosition,
  getRandomRotation,
};

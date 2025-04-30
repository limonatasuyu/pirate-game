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

function PlaySound(path, volume = 1) {
  const audio = new Audio(path);
  audio.volume = volume;
  audio.play();
}

export { PlaySound, customRequestAnimationFrame, cancelAllAnimationFrames };

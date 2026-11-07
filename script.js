import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const root = document.querySelector("#space");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .1, 2000);
camera.position.set(0, 2, 18);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; root.appendChild(renderer.domElement);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.45, .55, .08));

let dome = null;
new THREE.TextureLoader().load("./images/image.png", texture => {
  texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.repeat.set(1.35, 1);
  dome = new THREE.Mesh(new THREE.SphereGeometry(700, 64, 40), new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false }));
  scene.add(dome);
}, undefined, error => console.error("Could not load space background.", error));

let blackHole = null; let blackHoleRadius = 4;
new GLTFLoader().load("./models/blackhole.glb", asset => {
  blackHole = asset.scene;
  const size = new THREE.Box3().setFromObject(blackHole).getSize(new THREE.Vector3());
  blackHole.scale.setScalar(40 / Math.max(size.x, size.y, size.z)); blackHole.position.set(0, 0, -18); scene.add(blackHole);
  blackHoleRadius = Math.max(size.x, size.y, size.z) * blackHole.scale.x * .34;
}, undefined, error => console.error("Could not load black hole model.", error));

const keys = {}; let active = true; let entering = false; let entered = false;
let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0, ignoreMouse = false;
const velocity = new THREE.Vector3(), targetVelocity = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), input = new THREE.Vector3();
const clock = new THREE.Clock(); const transition = document.querySelector("#transition");

addEventListener("keydown", event => { keys[event.code] = true; if (["Space", "ShiftLeft", "ShiftRight"].includes(event.code)) event.preventDefault(); });
addEventListener("keyup", event => keys[event.code] = false);
addEventListener("mousemove", event => {
  if (!active || document.pointerLockElement !== renderer.domElement) return;
  if (ignoreMouse) { ignoreMouse = false; return; }
  targetYaw -= THREE.MathUtils.clamp(event.movementX, -50, 50) * .0012;
  targetPitch = THREE.MathUtils.clamp(targetPitch - THREE.MathUtils.clamp(event.movementY, -50, 50) * .0012, -1.35, 1.35);
});
document.addEventListener("pointerdown", () => {
  if (entering || entered) return;
  active = true; ignoreMouse = true; renderer.domElement.requestPointerLock?.();
});
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === renderer.domElement;
  document.body.classList.toggle("pointer-locked", locked);
  if (locked) ignoreMouse = true;
  else if (!entering && !entered) { active = false; velocity.set(0, 0, 0); }
});
function enterDestination() {
  if (entered) return;
  entered = true;
  document.exitPointerLock?.();
  transition.classList.add("active");
  setTimeout(() => { window.location.href = "./portfolio.html"; }, 2600);
}

function animate() {
  requestAnimationFrame(animate); const delta = Math.min(clock.getDelta(), .05);
  if (blackHole) blackHole.rotation.y += delta * .08;
  if (dome) { dome.rotation.y += delta * .004; dome.position.copy(camera.position).multiplyScalar(.08); }
  input.set((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), (keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.ShiftRight ? 1 : 0), (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0));
  if (active && !entering) {
    const blend = 1 - Math.exp(-22 * delta); yaw = THREE.MathUtils.lerp(yaw, targetYaw, blend); pitch = THREE.MathUtils.lerp(pitch, targetPitch, blend);
    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    targetVelocity.set(0, 0, 0).addScaledVector(right, input.x).addScaledVector(forward, -input.z);
    if (targetVelocity.lengthSq() > 1) targetVelocity.normalize(); targetVelocity.multiplyScalar(keys.ControlLeft ? 14 : 8); targetVelocity.y = input.y * 6;
    velocity.lerp(targetVelocity, 1 - Math.exp(-18 * delta)); camera.position.addScaledVector(velocity, delta);
  } else velocity.lerp(targetVelocity.set(0, 0, 0), 1 - Math.exp(-24 * delta));
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  if (active && !entering && blackHole && camera.position.distanceTo(blackHole.position) < blackHoleRadius * 1.15) { entering = true; active = false; document.exitPointerLock?.(); }
  if (entering && blackHole) {
    const distance = camera.position.distanceTo(blackHole.position); const pull = blackHole.position.clone().sub(camera.position).normalize();
    camera.position.addScaledVector(pull, delta * Math.min(24, 2.5 + (blackHoleRadius * 1.15 - distance) * 1.7));
    camera.fov = THREE.MathUtils.lerp(camera.fov, 47, delta * 1.4); camera.updateProjectionMatrix();
    if (distance < blackHoleRadius * .72) transition.classList.add("active");
    if (distance < .8) { entering = false; enterDestination(); }
  }
  composer.render();
}
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });
animate();

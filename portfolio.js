import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const root = document.querySelector("#room");
const portfolioMusic = document.querySelector("#portfolio-music");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const keys = new Set();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const officeCenter = new THREE.Vector3(0, 0, -16);
const playerRadius = .45;
const eyeHeight = 1.7;
const gravity = 22;
const walkSpeed = 5.5;
const jumpSpeed = 8;
let yaw = 0;
let pitch = 0;
let grounded = true;
let started = false;
let office = null;
let officeCollision = null;
const roomObstacles = [];
let aboutLabel = null;
let aboutMessage = null;
let aboutMessageVisible = false;
let contactLabel = null;
let contactMessage = null;
let contactMessageVisible = false;
let activitiesLabel = null;
let activitiesMessage = null;
let activitiesMessageVisible = false;
let goalsLabel = null;
let goalsMessage = null;
let goalsMessageVisible = false;

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

scene.background = new THREE.Color(0xffffff);
scene.add(new THREE.AmbientLight(0xffffff, 3));

const treeLeafTexture = new THREE.TextureLoader().load("./images/tree-leaf.png");
treeLeafTexture.colorSpace = THREE.SRGBColorSpace;
treeLeafTexture.flipY = false;
const treeBarkTexture = new THREE.TextureLoader().load("./images/tree-bark.png");
treeBarkTexture.colorSpace = THREE.SRGBColorSpace;
treeBarkTexture.flipY = false;

const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

function useUnlitMaterial(object) {
  if (!object.isMesh) return;
  const createMaterial = material => {
    if (!material) return new THREE.MeshBasicMaterial({ color: 0xffffff });
    const flatMaterial = new THREE.MeshBasicMaterial({
      map: material.map || null,
      color: material.map ? 0xffffff : (material.color || 0xffffff),
      transparent: material.transparent,
      opacity: material.opacity,
      alphaTest: material.alphaTest,
      side: material.side
    });
    flatMaterial.toneMapped = false;
    return flatMaterial;
  };
  object.material = Array.isArray(object.material)
    ? object.material.map(createMaterial)
    : createMaterial(object.material);
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), wallMaterial);
ceiling.position.y = 12;
ceiling.rotation.x = Math.PI / 2;
scene.add(ceiling);

function addWall(position, size) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMaterial);
  wall.position.set(...position);
  scene.add(wall);
}

addWall([0, 6, -28], [80, 12, .3]);
addWall([-40, 6, 0], [.3, 12, 80]);
addWall([40, 6, 0], [.3, 12, 80]);
addWall([0, 6, 40], [80, 12, .3]);

roomObstacles.push(
  { minX: -39.5, maxX: 39.5, minZ: -28, maxZ: -27.5 },
  { minX: -39.5, maxX: 39.5, minZ: 39.5, maxZ: 40 },
  { minX: -40, maxX: -39.5, minZ: -27.5, maxZ: 39.5 },
  { minX: 39.5, maxX: 40, minZ: -27.5, maxZ: 39.5 }
);

function addRoomLabel(text, position) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 180;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(255,255,255,.92)";
  context.fillRect(22, 22, canvas.width - 44, canvas.height - 44);
  context.strokeStyle = "#111";
  context.lineWidth = 3;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  context.fillStyle = "#111";
  context.font = "500 42px 'DM Mono', monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthTest: false
  }));
  label.position.set(...position);
  label.scale.set(3.1, .62, 1);
  scene.add(label);
  if (text === "About me") {
    aboutLabel = label;
  } else if (text === "Contact") {
    contactLabel = label;
  } else if (text === "Goals") {
    goalsLabel = label;
  }
}

addRoomLabel("About me", [-4.8, 1.7, -15.8]);
addRoomLabel("Goals", [-6, 1.7, -7.7]);
addRoomLabel("Contact", [4.8, 1.7, -15.8]);

function addMessageImage(path, position, scale, onLoad) {
  new THREE.TextureLoader().load(path, texture => {
    const message = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    }));
    message.position.set(...position);
    message.scale.set(...scale, 1);
    message.visible = false;
    scene.add(message);
    onLoad(message);
  }, undefined, error => console.error(`Could not load ${path}.`, error));
}

addMessageImage("./images/aboutme.png", [-4.8, 4.55, -15.8], [8.5, 4.5], message => {
  aboutMessage = message;
});
addMessageImage("./images/goals.png", [-6, 4.2, -7.7], [6.5, 3], message => {
  goalsMessage = message;
});
addMessageImage("./images/contact.png", [4.8, 4.2, -15.8], [6.2, 3.3], message => {
  contactMessage = message;
});
addMessageImage("./images/activities.png", [8.2, 5.3, -7.7], [5.8, 3.2], message => {
  activitiesMessage = message;
});

addRoomLabel("Activities", [8.2, 3.45, -7.7]);
activitiesLabel = scene.children[scene.children.length - 1];

const activityArea = { minX: 6.3, maxX: 10.1, minZ: -9.8, maxZ: -6.2 };
const tapeThickness = .22;
roomObstacles.push(
  { minX: activityArea.minX, maxX: activityArea.maxX, minZ: activityArea.minZ, maxZ: activityArea.minZ + tapeThickness },
  { minX: activityArea.minX, maxX: activityArea.maxX, minZ: activityArea.maxZ - tapeThickness, maxZ: activityArea.maxZ },
  { minX: activityArea.minX, maxX: activityArea.minX + tapeThickness, minZ: activityArea.minZ, maxZ: activityArea.maxZ },
  { minX: activityArea.maxX - tapeThickness, maxX: activityArea.maxX, minZ: activityArea.minZ, maxZ: activityArea.maxZ }
);

loader.load("./models/low_poly_computer_desk.glb", asset => {
  office = asset.scene;
  const bounds = new THREE.Box3().setFromObject(office);
  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  const scale = 4 / largest;
  office.scale.setScalar(scale);
  office.rotation.y = Math.PI * 2;
  office.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(office);
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
  office.position.set(
    officeCenter.x - scaledCenter.x,
    -scaledBounds.min.y,
    officeCenter.z - scaledCenter.z
  );
  const removeDecorations = /^(PinBoard|Poster|PhotoFrame|Clipboard|Paper_|Photo_|Pin_|Vent|Vend_|Cigarette|Ashtray)/i;
  office.traverse(object => {
    if (removeDecorations.test(object.name)) {
      object.visible = false;
      return;
    }
    if (!object.isMesh) return;
    useUnlitMaterial(object);
    object.castShadow = false;
    object.receiveShadow = false;
  });

  function loadRoomAsset(path, position, targetSize, rotation = 0, collidable = false) {
    loader.load(path, asset => {
      const model = asset.scene;
      const isFileCabinet = path.includes("file_cabinet");
      const isBirchTree = path.includes("psx_birch_tree");
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      model.scale.setScalar(targetSize / Math.max(size.x, size.y, size.z));
      model.rotation.y = rotation;
      model.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(model);
      const center = scaledBounds.getCenter(new THREE.Vector3());
      model.position.set(
        position.x - center.x,
        -scaledBounds.min.y + position.y,
        position.z - center.z
      );
      model.traverse(object => {
        if (!object.isMesh) return;
        useUnlitMaterial(object);
        object.castShadow = false;
        object.receiveShadow = false;
        if (isFileCabinet) {
          const fullBrightnessMaterial = material => {
            if (!material) return material;
            const brightMaterial = new THREE.MeshBasicMaterial({
              map: material.map || null,
              color: 0xffffff,
              transparent: material.transparent,
              opacity: material.opacity,
              alphaTest: material.alphaTest,
              side: material.side
            });
            brightMaterial.toneMapped = false;
            return brightMaterial;
          };
          object.material = Array.isArray(object.material)
            ? object.material.map(fullBrightnessMaterial)
            : fullBrightnessMaterial(object.material);
        }
        if (isBirchTree) {
          const isLeaf = object.name.toLowerCase().includes("leaf");
          object.material = new THREE.MeshBasicMaterial({
            map: isLeaf ? treeLeafTexture : treeBarkTexture,
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: isLeaf,
            alphaTest: isLeaf ? .15 : 0
          });
        }
      });
      scene.add(model);
      if (collidable) {
        const collisionBounds = new THREE.Box3().setFromObject(model);
        roomObstacles.push({
          minX: collisionBounds.min.x - playerRadius,
          maxX: collisionBounds.max.x + playerRadius,
          minZ: collisionBounds.min.z - playerRadius,
          maxZ: collisionBounds.max.z + playerRadius
        });
      }
    }, undefined, error => {
      console.error(`Could not load ${path}.`, error);
    });
  }

  loadRoomAsset("./models/police_tape_132067.glb", new THREE.Vector3(8.2, 0, -8), 4.2, Math.PI / 2);
  loadRoomAsset("./models/file_cabinet.glb", new THREE.Vector3(8.2, 0, -7.7), 2.8, Math.PI);
  const pillarPositions = [
    [-14, -25], [14, -25],
    [-14, -8], [14, -8],
    [-14, 10], [14, 10]
  ];
  pillarPositions.forEach(([x, z]) => {
    loadRoomAsset(
      "./models/marble_pillar.glb",
      new THREE.Vector3(x, 0, z),
      8,
      0,
      true
    );
  });
  const treePositions = [];
  let forestSeed = 48271;
  const randomForestValue = () => {
    forestSeed = (forestSeed * 16807) % 2147483647;
    return (forestSeed - 1) / 2147483646;
  };
  [
    [-17, -14, 5.2, 0],
    [17, -14, 5.6, 0],
    [-25, -2, 5.8, 0],
    [13, -20, 5.1, 0],
    [-20, -27, 5.2, 0],
    [-5, -27, 5.8, 0],
    [7, -27, 5.1, 0],
    [20, -27, 5.4, 0],
    [-12, 3, 5.1, 0],
    [10, 4, 5.5, 0]
  ].forEach(tree => treePositions.push(tree));
  const protectedAreas = [
    [-4.8, -15.8, 7],
    [-6, -7.7, 7],
    [4.8, -15.8, 7],
    [8.2, -7.7, 8]
  ];
  const isProtected = (x, z) => protectedAreas.some(([areaX, areaZ, radius]) =>
    Math.hypot(x - areaX, z - areaZ) < radius
  );
  for (let attempt = 0; attempt < 600 && treePositions.length < 28; attempt += 1) {
    const x = -36 + randomForestValue() * 72;
    const z = -25 + randomForestValue() * 60;
    const nearOffice = Math.hypot(x, z - officeCenter.z) < 8;
    const nearSpawn = Math.hypot(x, z + 5) < 5;
    const nearPillar = pillarPositions.some(([pillarX, pillarZ]) =>
      Math.hypot(x - pillarX, z - pillarZ) < 9
    );
    const tooCloseToTree = treePositions.some(([treeX, treeZ]) =>
      Math.hypot(x - treeX, z - treeZ) < 6
    );
    if (nearOffice || nearSpawn || nearPillar || isProtected(x, z) || tooCloseToTree) continue;
    const size = 4.4 + randomForestValue() * 3.4;
    const rotation = 0;
    treePositions.push([x, z, size, rotation]);
  }
  const spacedTreePositions = [];
  treePositions.forEach(tree => {
    const [x, z] = tree;
    if (spacedTreePositions.some(([treeX, treeZ]) =>
      Math.hypot(x - treeX, z - treeZ) < 6
    )) return;
    spacedTreePositions.push(tree);
  });
  spacedTreePositions.forEach(([x, z, size, rotation]) => {
    loadRoomAsset(
      "./models/psx_birch_tree.glb",
      new THREE.Vector3(x, 0, z),
      size,
      rotation
    );
  });
  office.updateMatrixWorld(true);
  const collisionBounds = new THREE.Box3().setFromObject(office);
  officeCollision = {
    minX: collisionBounds.min.x - .35,
    maxX: collisionBounds.max.x + .35,
    minZ: collisionBounds.min.z - .35,
    maxZ: collisionBounds.max.z + .35
  };
  roomObstacles.push(officeCollision);
  scene.add(office);
}, undefined, error => {
  console.error("Could not load the office model.", error);
});

function lockPointer() {
  renderer.domElement.requestPointerLock();
}

function toggleAboutMessage() {
  aboutMessageVisible = !aboutMessageVisible;
  if (aboutMessage) aboutMessage.visible = aboutMessageVisible;
}

function toggleContactMessage() {
  contactMessageVisible = !contactMessageVisible;
  if (contactMessage) contactMessage.visible = contactMessageVisible;
}

function toggleActivitiesMessage() {
  activitiesMessageVisible = !activitiesMessageVisible;
  if (activitiesMessage) activitiesMessage.visible = activitiesMessageVisible;
}

function toggleGoalsMessage() {
  goalsMessageVisible = !goalsMessageVisible;
  if (goalsMessage) goalsMessage.visible = goalsMessageVisible;
}

function activateLabelUnderCrosshair() {
  if (!started || document.pointerLockElement !== renderer.domElement) return;
  pointer.set(0, 0);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([aboutLabel, goalsLabel, contactLabel, activitiesLabel], false)[0];
  if (hit?.object === aboutLabel) toggleAboutMessage();
  if (hit?.object === goalsLabel) toggleGoalsMessage();
  if (hit?.object === contactLabel) toggleContactMessage();
  if (hit?.object === activitiesLabel) toggleActivitiesMessage();
}

renderer.domElement.addEventListener("click", () => {
  portfolioMusic?.play().catch(error => console.warn("Portfolio music could not start.", error));
  if (document.pointerLockElement !== renderer.domElement) {
    lockPointer();
    return;
  }
  activateLabelUnderCrosshair();
});

document.addEventListener("pointerlockchange", () => {
  started = document.pointerLockElement === renderer.domElement;
  document.body.classList.toggle("pointer-locked", started);
});

addEventListener("keydown", event => {
  portfolioMusic?.play().catch(error => console.warn("Portfolio music could not start.", error));
  keys.add(event.code);
  if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) event.preventDefault();
  if (event.code === "Space" && grounded && started) {
    velocity.y = jumpSpeed;
    grounded = false;
  }
});

addEventListener("keyup", event => keys.delete(event.code));

addEventListener("mousemove", event => {
  if (!started) return;
  yaw -= THREE.MathUtils.clamp(event.movementX, -45, 45) * .0022;
  pitch -= THREE.MathUtils.clamp(event.movementY, -45, 45) * .0018;
  pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
});

function updatePlayer(delta) {
  direction.set(
    (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
    0,
    (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0)
  );
  if (direction.lengthSq() > 0) direction.normalize();

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const desired = new THREE.Vector3()
    .addScaledVector(right, direction.x)
    .addScaledVector(forward, -direction.z)
    .multiplyScalar(walkSpeed);
  velocity.x = THREE.MathUtils.damp(velocity.x, desired.x, 14, delta);
  velocity.z = THREE.MathUtils.damp(velocity.z, desired.z, 14, delta);
  velocity.y -= gravity * delta;
  camera.position.addScaledVector(velocity, delta);

  if (camera.position.y <= eyeHeight) {
    camera.position.y = eyeHeight;
    velocity.y = 0;
    grounded = true;
  }

  roomObstacles.forEach(obstacle => {
    const insideX = camera.position.x > obstacle.minX && camera.position.x < obstacle.maxX;
    const insideZ = camera.position.z > obstacle.minZ && camera.position.z < obstacle.maxZ;
    if (insideX && insideZ) {
      const pushX = Math.min(camera.position.x - obstacle.minX, obstacle.maxX - camera.position.x);
      const pushZ = Math.min(camera.position.z - obstacle.minZ, obstacle.maxZ - camera.position.z);
      if (pushX < pushZ) {
        camera.position.x = camera.position.x < (obstacle.minX + obstacle.maxX) / 2
          ? obstacle.minX
          : obstacle.maxX;
        velocity.x = 0;
      } else {
        camera.position.z = camera.position.z < (obstacle.minZ + obstacle.maxZ) / 2
          ? obstacle.minZ
          : obstacle.maxZ;
        velocity.z = 0;
      }
    }
  });

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -38 + playerRadius, 38 - playerRadius);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -38 + playerRadius, 38 - playerRadius);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  if (started) updatePlayer(delta);
  renderer.render(scene, camera);
}

camera.position.set(0, eyeHeight, -5);
camera.rotation.order = "YXZ";

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

animate();

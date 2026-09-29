import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("scene");
const fpsEl = document.getElementById("fps");
const glitchBtn = document.getElementById("glitch");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05080f, 0.045);
scene.background = new THREE.Color(0x05080f);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);
camera.position.set(0, 2.2, 8.5);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.85,
  0.55,
  0.15
);
composer.addPass(bloom);

scene.add(new THREE.AmbientLight(0x1a2a3a, 0.8));
const key = new THREE.PointLight(0x3ecfef, 2.4, 40);
key.position.set(4, 6, 4);
scene.add(key);
const rim = new THREE.PointLight(0x6a5cff, 1.4, 35);
rim.position.set(-6, 3, -2);
scene.add(rim);

/* Infinite grid floor */
const grid = new THREE.GridHelper(80, 80, 0x1a8aa3, 0x0d1a28);
grid.position.y = -1.2;
scene.add(grid);

/* Wireframe torus knot — the “crazy” centerpiece */
const knotGeo = new THREE.TorusKnotGeometry(1.35, 0.38, 220, 28);
const knotMat = new THREE.MeshStandardMaterial({
  color: 0x0a121c,
  emissive: 0x3ecfef,
  emissiveIntensity: 0.55,
  metalness: 0.85,
  roughness: 0.25,
  wireframe: true,
});
const knot = new THREE.Mesh(knotGeo, knotMat);
knot.position.set(0, 1.1, 0);
scene.add(knot);

const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.35, 1),
  new THREE.MeshBasicMaterial({
    color: 0x3ecfef,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  })
);
shell.position.copy(knot.position);
scene.add(shell);

/* Particle field */
const COUNT = 1800;
const positions = new Float32Array(COUNT * 3);
const speeds = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 40;
  positions[i * 3 + 1] = Math.random() * 18 - 2;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  speeds[i] = 0.15 + Math.random() * 0.55;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const pMat = new THREE.PointsMaterial({
  color: 0x3ecfef,
  size: 0.035,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const points = new THREE.Points(pGeo, pMat);
scene.add(points);

/* Floating data panels */
function makePanel(w, h, x, y, z, rotY) {
  const g = new THREE.PlaneGeometry(w, h);
  const m = new THREE.MeshBasicMaterial({
    color: 0x3ecfef,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(g),
    new THREE.LineBasicMaterial({ color: 0x3ecfef, transparent: true, opacity: 0.55 })
  );
  mesh.add(edge);
  scene.add(mesh);
  return mesh;
}
const panels = [
  makePanel(1.8, 1.1, -4.2, 1.6, -1.5, 0.4),
  makePanel(1.4, 0.9, 4.5, 2.2, -0.8, -0.55),
  makePanel(1.2, 1.6, 3.2, 0.8, 2.5, -0.25),
];

let pulse = 0;
let targetPulse = 0;
glitchBtn?.addEventListener("click", () => {
  targetPulse = 1;
  bloom.strength = 1.6;
});

const mouse = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

let zoom = 8.5;
window.addEventListener(
  "wheel",
  (e) => {
    zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.004, 4.5, 14);
  },
  { passive: true }
);

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
}
window.addEventListener("resize", onResize);

const clock = new THREE.Clock();
let frames = 0;
let lastFps = 0;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  pulse = THREE.MathUtils.lerp(pulse, targetPulse, 0.08);
  targetPulse *= 0.96;
  bloom.strength = THREE.MathUtils.lerp(bloom.strength, 0.85 + pulse * 0.9, 0.08);

  knot.rotation.x = t * 0.35;
  knot.rotation.y = t * 0.55;
  shell.rotation.y = -t * 0.2;
  shell.rotation.z = t * 0.12;
  shell.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04 + pulse * 0.12);

  knotMat.emissiveIntensity = 0.45 + Math.sin(t * 2.2) * 0.15 + pulse * 0.8;

  const pos = points.geometry.attributes.position.array;
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3 + 1] += speeds[i] * 0.02;
    if (pos[i * 3 + 1] > 16) pos[i * 3 + 1] = -2;
  }
  points.geometry.attributes.position.needsUpdate = true;
  points.rotation.y = t * 0.03;

  panels.forEach((p, i) => {
    p.position.y += Math.sin(t * 1.2 + i) * 0.0015;
    p.material.opacity = 0.06 + Math.sin(t * 2 + i) * 0.03 + pulse * 0.08;
  });

  grid.position.z = (t * 0.8) % 1;

  const camX = mouse.x * 1.8;
  const camY = 2.2 + mouse.y * 0.9;
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, 0.05);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, 0.05);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, zoom, 0.05);
  camera.lookAt(0, 1.0, 0);

  composer.render();

  frames++;
  if (t - lastFps > 0.5) {
    if (fpsEl) fpsEl.textContent = Math.round(frames / (t - lastFps)) + " FPS";
    frames = 0;
    lastFps = t;
  }
}

animate();

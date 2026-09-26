import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildEnvironment } from './environment.js';
import { Player } from './player.js';
import { startAmbience } from './audio.js';

const canvas = document.querySelector('#world'), gate = document.querySelector('#gate'), enter = document.querySelector('#enter'), notice = document.querySelector('#notice');
const mobile = document.querySelector('#mobile');
if (matchMedia('(pointer: coarse)').matches || innerWidth < 700) { gate.hidden = true; mobile.hidden = false; }

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x030304, 1);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030304); scene.fog = new THREE.Fog(0x030304, CONFIG.world.fogNear, CONFIG.world.fogFar);
scene.add(new THREE.HemisphereLight(0x11131b, 0x050506, 0.34));
const moon = new THREE.DirectionalLight(0x252532, 0.12); moon.position.set(-4, 8, 2); scene.add(moon);
buildEnvironment(scene);
const camera = new THREE.PerspectiveCamera(CONFIG.player.fov, 1, .08, 70); const player = new Player(camera, canvas);

function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(Math.max(2, Math.floor(w * CONFIG.render.pixelScale)), Math.max(2, Math.floor(h * CONFIG.render.pixelScale)), false);
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`; camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let ambience, active = false;
async function requestLock() {
  try {
    if (!canvas.requestPointerLock) { notice.textContent = 'Pointer lock is unavailable here. Use a desktop browser that supports pointer lock.'; return; }
    await canvas.requestPointerLock();
  } catch { notice.textContent = 'Click again to enter. Your browser did not allow pointer lock.'; }
}
enter.addEventListener('click', requestLock);
document.addEventListener('pointerlockchange', () => {
  active = document.pointerLockElement === canvas; gate.classList.toggle('visible', !active && !mobile.hidden); notice.textContent = '';
  if (active && !ambience) ambience = startAmbience();
  if (!active) player.keys.clear();
});
document.addEventListener('pointerlockerror', () => { notice.textContent = 'Pointer lock was blocked. Click to try again.'; });

const clock = new THREE.Clock();
function frame() { requestAnimationFrame(frame); const dt = Math.min(clock.getDelta(), .05); if (active) player.update(dt); renderer.render(scene, camera); }
frame();

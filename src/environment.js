import * as THREE from 'three';
import { CONFIG } from './config.js';

function makeFloorTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d'); c.fillStyle = '#090a0c'; c.fillRect(0, 0, 64, 64);
  let seed = 9841;
  for (let i = 0; i < 180; i++) {
    seed = (seed * 16807) % 2147483647; const v = 11 + seed % 9;
    seed = (seed * 16807) % 2147483647; const x = seed % 64;
    seed = (seed * 16807) % 2147483647; const y = seed % 64;
    c.fillStyle = `rgb(${v},${v},${v + 1})`; c.fillRect(x, y, 1 + seed % 3, 1);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(12, 12); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function makeTreeTexture() {
  // Original low-resolution pixel art: broad, irregular crimson crown and stark dark trunk.
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 96;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  const px = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  // Asymmetric stair-step crown silhouette, laid out in large pixel clusters.
  const rows = [
    [20,24],[12,40],[8,48],[4,56],[8,56],[0,60],[4,60],[0,56],[4,60],[0,52],[4,60],[8,56],[4,52],[12,44],[16,40],[20,32]
  ];
  rows.forEach(([x,w], i) => px(x, i * 4, w, 4, i % 3 === 0 ? '#690914' : '#7d0b19'));
  // Larger crimson facets preserve a deliberately restricted, pixel-sized palette.
  [[16,8,12,8,'#9a1523'],[36,12,12,8,'#8d101d'],[4,24,16,8,'#8c101e'],[24,20,12,8,'#a01826'],[40,28,12,8,'#67101a'],[12,36,16,8,'#8c111f'],[32,40,16,8,'#991522'],[4,48,16,8,'#74101b'],[24,52,12,8,'#92101e'],[40,48,12,8,'#7e0d1a']].forEach(([x,y,w,h,col]) => px(x,y,w,h,col));
  // Dark limbs remain visible through gaps in the red canopy.
  px(28,32,8,24,'#25080d'); px(24,40,8,8,'#30090f'); px(36,36,8,8,'#30090f'); px(20,48,8,8,'#29080d');
  // Broad, almost black trunk with a few square roots.
  px(28,52,12,32,'#16090c'); px(24,60,8,24,'#20090d'); px(36,60,8,24,'#19080c');
  px(20,76,12,8,'#16090c'); px(36,76,12,8,'#16090c'); px(16,80,12,4,'#12080a'); px(40,80,12,4,'#12080a');
  const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function buildEnvironment(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.world.width, CONFIG.world.depth), new THREE.MeshBasicMaterial({ color: 0x090a0c, map: makeFloorTexture() }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.035; scene.add(ground);

  // The only path: a narrow, flat strip leading directly toward the tree.
  const pathLength = CONFIG.path.startZ - CONFIG.path.endZ;
  const path = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.path.width, pathLength), new THREE.MeshBasicMaterial({ color: 0x77777b }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, -0.018, (CONFIG.path.startZ + CONFIG.path.endZ) / 2); scene.add(path);

  // Dark enclosing shell is intentionally indistinguishable from the distance fog.
  const shell = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.world.width, 18, CONFIG.world.depth), new THREE.MeshBasicMaterial({ color: 0x030304, side: THREE.BackSide }));
  shell.position.y = 8.9; scene.add(shell);

  const tree = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTreeTexture(), transparent: true, alphaTest: 0.5, depthWrite: true, fog: true }));
  tree.scale.set(18, 27, 1); tree.position.set(CONFIG.tree.x, 13.45, CONFIG.tree.z); scene.add(tree);
}

export function collides(x, z) {
  const halfW = CONFIG.world.width / 2 - CONFIG.player.radius - 0.2;
  const halfD = CONFIG.world.depth / 2 - CONFIG.player.radius - 0.2;
  if (Math.abs(x) > halfW || Math.abs(z) > halfD) return true;
  // Keep the player outside the tree's trunk while leaving the surrounding clearing open.
  const dx = x - CONFIG.tree.x, dz = z - CONFIG.tree.z;
  return dx * dx + dz * dz < 0.8 * 0.8;
}

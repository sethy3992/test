import * as THREE from 'three';
import { CONFIG } from './config.js';

function makeFloorTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d'); c.fillStyle = '#101012'; c.fillRect(0, 0, 128, 128);
  let seed = 9841;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1500; i++) {
    const v = 15 + Math.floor(rand() * 28); c.fillStyle = `rgb(${v},${v},${v + 2})`;
    c.fillRect(Math.floor(rand() * 128), Math.floor(rand() * 128), 1 + Math.floor(rand() * 3), 1);
  }
  const t = new THREE.CanvasTexture(canvas); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildEnvironment(scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.world.width, CONFIG.world.depth), new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 1, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.04; floor.receiveShadow = true; scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 1, side: THREE.BackSide });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.world.width, 12, CONFIG.world.depth), wallMat); shell.position.y = 5.8; scene.add(shell);
  const farGround = new THREE.Mesh(new THREE.CircleGeometry(32, 14), new THREE.MeshBasicMaterial({ color: 0x030304 })); farGround.rotation.x = -Math.PI / 2; farGround.position.y = -0.02; scene.add(farGround);

  // The tree is deliberately angular and slightly impossible in its proportions.
  const group = new THREE.Group(); group.position.set(CONFIG.tree.x, 0, CONFIG.tree.z); group.scale.setScalar(CONFIG.tree.scale); scene.add(group);
  const bark = new THREE.MeshStandardMaterial({ color: 0x641019, roughness: 1, flatShading: true, emissive: 0x190306, emissiveIntensity: 0.45 });
  const darkBark = new THREE.MeshStandardMaterial({ color: 0x35090f, roughness: 1, flatShading: true });
  function limb(a, b, r1, r2, material = bark, sides = 5) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, d.length(), sides, 1), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); group.add(mesh); return mesh;
  }
  limb([0, 0, 0], [-0.2, 2.1, 0.1], 0.48, 0.32, darkBark, 6);
  limb([-0.2, 1.8, 0.1], [0.18, 4.3, 0], 0.34, 0.19, bark, 5);
  limb([0.18, 3.2, 0], [-0.9, 5.0, 0.1], 0.23, 0.1);
  limb([-0.9, 5.0, 0.1], [-1.9, 6.2, -0.1], 0.1, 0.015);
  limb([-0.1, 3.0, 0], [1.1, 4.3, -0.2], 0.22, 0.1);
  limb([1.1, 4.3, -0.2], [2.25, 4.8, -0.4], 0.1, 0.012);
  limb([0.05, 2.5, 0.05], [0.0, 3.7, 0.8], 0.19, 0.08, bark, 5);
  limb([0, 3.7, 0.8], [-0.55, 4.8, 1.1], 0.08, 0.01);
  limb([-0.1, 0.25, 0], [-1.3, 0.05, 0.5], 0.28, 0.025, darkBark);
  limb([-0.1, 0.22, 0], [1.2, 0.04, -0.55], 0.24, 0.018, darkBark);
  const treeLight = new THREE.PointLight(0x78101b, 1.5, 10, 2.2); treeLight.position.set(0, 3.1, 0.4); group.add(treeLight);

  // Bare stone forms and broken silhouettes, only caught at the edge of the light.
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 1, flatShading: true });
  for (const [x, z, sx, sy, sz, ry] of [[-7,-4,1.2,.55,.8,.3],[8,-11,.8,1.3,.9,-.2],[-11,5,.6,1.8,.7,.1],[10,5,1.5,.4,.7,.5],[3,-18,.7,1.1,.6,0],[-4,-14,1.1,.6,.8,.4]]) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), stoneMat); m.position.set(x, sy * .42, z); m.scale.set(sx, sy, sz); m.rotation.y = ry; scene.add(m);
  }
  for (const [x,z] of [[-12,-12],[13,-3],[-15,10],[6,15]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.5, .08), new THREE.MeshBasicMaterial({color:0x121318})); p.position.set(x,1.2,z); p.rotation.z = .1; scene.add(p);
  }
}

export function collides(x, z) {
  const halfW = CONFIG.world.width / 2 - CONFIG.player.radius - 0.2;
  const halfD = CONFIG.world.depth / 2 - CONFIG.player.radius - 0.2;
  if (Math.abs(x) > halfW || Math.abs(z) > halfD) return true;
  const dx = x - CONFIG.tree.x, dz = z - CONFIG.tree.z;
  if (dx * dx + dz * dz < 1.15 * 1.15) return true;
  return false;
}

import * as THREE from 'three';
import { CONFIG } from './config.js';

// Pixel rows form a single stair-stepped silhouette. ExtrudeGeometry gives each
// row-mask a continuous front surface and real, visible thickness at the sides.
const CELL = 0.09;
const CROWN_CELL_Y = 0.10;
const CANOPY_BASE_Y = 1.72;
const CROWN = [
  [27,34],[26,36],[20,39],[15,41],[12,44],[8,46],[4,47],[0,47],
  [1,47],[2,46],[5,44],[9,42],[13,39],[10,42],[14,38],[18,34],
  [21,31],[24,29]
];

function shapesFromRows(rows, cellY = CELL) {
  const shapes = []; let i = 0;
  while (i < rows.length) {
    while (i < rows.length && !rows[i]) i++;
    if (i >= rows.length) break;
    const first = i, part = [];
    while (i < rows.length && rows[i]) part.push(rows[i++]);
    const height = rows.length * cellY, shape = new THREE.Shape();
    const xLeft = n => (n - 24) * CELL, xRight = n => (n - 23) * CELL;
    let [left, right] = part[0];
    shape.moveTo(xLeft(left), height - first * CELL);
    shape.lineTo(xRight(right), height - first * CELL);
    for (let j = 0; j < part.length; j++) {
      const y = height - (first + j + 1) * cellY;
      shape.lineTo(xRight(part[j][1]), y);
      if (j + 1 < part.length && part[j + 1][1] !== part[j][1]) shape.lineTo(xRight(part[j + 1][1]), y);
    }
    for (let j = part.length - 1; j >= 0; j--) {
      const y = height - (first + j + 1) * cellY;
      shape.lineTo(xLeft(part[j][0]), y);
      if (j > 0 && part[j - 1][0] !== part[j][0]) shape.lineTo(xLeft(part[j - 1][0]), y);
    }
    shape.closePath(); shapes.push(shape);
  }
  return shapes;
}

function extrudedRows(rows, { y = 0, z = 0, depth = 1, color, sideColor = color, expand = 0, cellY = CELL, angle = 0, materialSide = THREE.DoubleSide } = {}) {
  const expanded = rows.map(span => span && [span[0] - expand, span[1] + expand]);
  const front = new THREE.MeshBasicMaterial({ color, side: materialSide, fog: true });
  const sides = new THREE.MeshBasicMaterial({ color: sideColor, side: materialSide, fog: true });
  const group = new THREE.Group(); group.position.set(CONFIG.tree.x, y, CONFIG.tree.z); group.rotation.y = angle;
  const volume = new THREE.Group(); volume.position.z = z; group.add(volume);
  for (const shape of shapesFromRows(expanded, cellY)) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 });
    volume.add(new THREE.Mesh(geometry, [front, sides]));
  }
  return group;
}

function makeStoneTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#42204c'; ctx.fillRect(0, 0, 96, 96);
  let seed = 17391;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // A repeatable scatter of small, angular, pixel-edged paving stones.
  const palette = ['#573061', '#61386c', '#4d2858', '#694174', '#50305b'];
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(random() * 88) + 4, y = Math.floor(random() * 88) + 4;
    const w = 7 + Math.floor(random() * 15), h = 5 + Math.floor(random() * 9);
    const color = palette[Math.floor(random() * palette.length)];
    for (let row = -1; row <= h; row++) {
      const inset = (row === -1 || row === h) ? 3 : (random() < .2 ? 2 : 0);
      const run = Math.max(3, w - inset - (random() < .17 ? 2 : 0));
      ctx.fillStyle = '#32183b'; ctx.fillRect(x + Math.floor(inset / 2), y + row, run, 1);
    }
    for (let row = 0; row < h; row++) {
      const inset = random() < .24 ? 2 : 0;
      ctx.fillStyle = color; ctx.fillRect(x + inset, y + row, w - inset - (random() < .2 ? 2 : 0), 1);
    }
    ctx.fillStyle = '#886294'; ctx.fillRect(x + 3, y + 1, Math.max(2, Math.floor(w * .28)), 1);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.generateMipmaps = true; return texture;
}

function trailMaterial(texture) { return new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff, side: THREE.DoubleSide, fog: true }); }

function makePath(texture) {
  const startZ = CONFIG.path.startZ, endZ = CONFIG.path.endZ;
  const vertices = new Float32Array([-2.5,0.012,startZ, 2.5,0.012,startZ, 2.5,0.012,endZ, -2.5,0.012,endZ]);
  const uvs = new Float32Array([-2.5,startZ, 2.5,startZ, 2.5,endZ, -2.5,endZ]);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); geometry.setIndex([0,2,1, 0,3,2]); geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, trailMaterial(texture));
}

function makeTreeTrail(texture) {
  const cx = CONFIG.tree.x, cz = CONFIG.tree.z, diskY = 0.014, ringY = 0.018, segments = 48;
  const material = trailMaterial(texture);
  function disk(radius) {
    const positions = [cx,diskY,cz], uvs = [cx,cz], indices = [];
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2, x = cx + Math.cos(a) * radius, z = cz + Math.sin(a) * radius;
      positions.push(x,diskY,z); uvs.push(x,z);
    }
    for (let i = 1; i <= segments; i++) indices.push(0,i,i+1);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  }
  function ring(inner, outer) {
    const positions = [], uvs = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      for (const r of [inner, outer]) { const x = cx + c*r, z = cz + s*r; positions.push(x,ringY,z); uvs.push(x,z); }
    }
    for (let i = 0; i < segments; i++) { const n = i*2; indices.push(n,n+1,n+3, n,n+3,n+2); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  }
  const area = new THREE.Group(); area.add(disk(3.55), ring(3.4, 4.65)); return area;
}

export function buildEnvironment(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.width, CONFIG.world.depth),
    new THREE.MeshBasicMaterial({ color: 0x050407, fog: true })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04; scene.add(ground);
  const stoneTexture = makeStoneTexture();
  scene.add(makePath(stoneTexture));
  scene.add(makeTreeTrail(stoneTexture));

  const shell = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.world.width, 18, CONFIG.world.depth), new THREE.MeshBasicMaterial({ color: 0x020203, side: THREE.BackSide }));
  shell.position.y = 8.9; scene.add(shell);

  // Each pixel silhouette is extruded in two perpendicular directions. From
  // front, back, and either side the same crown and palette remain visible.
  const crownOutline = [CROWN[0], ...CROWN, CROWN[CROWN.length - 1]];
  const trunkRows = [[21,26],[21,26],[21,26],[20,26],[20,26],[21,26],[20,27],[19,28],[18,29],[18,30],[17,31],[16,32],[18,30],[19,29],[20,28],[18,30],[16,32],[14,34],[12,36]];
  const directions = [0, Math.PI / 2];
  for (const angle of directions) {
    // The outline is a narrow, slightly expanded shell behind the red surfaces.
    scene.add(extrudedRows(crownOutline, { y: CANOPY_BASE_Y - CROWN_CELL_Y, z: -0.9, depth: 1.45, color: 0xc41491, sideColor: 0x74105e, expand: 1, cellY: CROWN_CELL_Y, angle }));
    scene.add(extrudedRows(CROWN, { y: CANOPY_BASE_Y, z: -0.72, depth: 1.5, color: 0xd7193f, sideColor: 0x78132d, cellY: CROWN_CELL_Y, angle }));
    // Dark pixel branches join the canopy to the trunk; matching orientation keeps the rear coherent.
    const leftBranch = [null,null,null,null,null,null,[17,20],[16,20],[15,20],[14,21],[13,22],[12,23]];
    const rightBranch = [null,null,null,null,null,null,null,[26,29],[27,31],[28,33],[29,35],[30,36]];
    scene.add(extrudedRows(leftBranch, { y: 0.55, z: -0.55, depth: 1.1, color: 0x28142d, sideColor: 0x160d1b, angle }));
    scene.add(extrudedRows(rightBranch, { y: 0.55, z: -0.55, depth: 1.1, color: 0x28142d, sideColor: 0x160d1b, angle }));
    scene.add(extrudedRows(trunkRows, { y: 0.035, z: -0.78, depth: 1.55, color: 0xc41491, sideColor: 0x74105e, expand: 1, angle }));
    scene.add(extrudedRows(trunkRows, { y: 0.035, z: -0.62, depth: 1.35, color: 0x24142b, sideColor: 0x140e1a, angle }));
  }
}

export function collides(x, z) {
  const halfW = CONFIG.world.width / 2 - CONFIG.player.radius - 0.2;
  const halfD = CONFIG.world.depth / 2 - CONFIG.player.radius - 0.2;
  if (Math.abs(x) > halfW || Math.abs(z) > halfD) return true;
  // Only the physical trunk blocks walking. The elevated canopy can be explored beneath,
  // and its real depth is visible while walking around the trunk from either side.
  return ((x - CONFIG.tree.x) / 1.5) ** 2 + ((z - CONFIG.tree.z) / 1.5) ** 2 < 1;
}

import * as THREE from 'three';
import { CONFIG } from './config.js';

// Pixel rows form a single stair-stepped silhouette. ExtrudeGeometry gives each
// row-mask a continuous front surface and real, visible thickness at the sides.
const CELL = 0.55;
const CROWN_CELL_Y = 0.75;
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

function extrudedRows(rows, { y = 0, z = 0, depth = 1, color, sideColor = color, expand = 0, cellY = CELL, materialSide = THREE.DoubleSide } = {}) {
  const expanded = rows.map(span => span && [span[0] - expand, span[1] + expand]);
  const front = new THREE.MeshBasicMaterial({ color, side: materialSide, fog: true });
  const sides = new THREE.MeshBasicMaterial({ color: sideColor, side: materialSide, fog: true });
  const group = new THREE.Group(); group.position.set(CONFIG.tree.x, y, CONFIG.tree.z + z);
  for (const shape of shapesFromRows(expanded, cellY)) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 });
    group.add(new THREE.Mesh(geometry, [front, sides]));
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
  const area = new THREE.Group(); area.add(disk(5.25), ring(5.05, 7.2)); return area;
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

  // A continuous pixel outline volume peeks around the entire crown. It is
  // slightly wider and deeper than the red mass, so it remains visible at all angles.
  const outlineRows = [CROWN[0], ...CROWN, CROWN[CROWN.length - 1]];
  scene.add(extrudedRows(outlineRows, { y: 10.28 - CROWN_CELL_Y, z: -4.0, depth: 6.0, color: 0xe51aa7, sideColor: 0x86126e, expand: 1, cellY: CROWN_CELL_Y }));

  // Rear, middle and front crown masses overlap as solid extrusions rather than cards.
  const rearRows = CROWN.map(([a,b], i) => [a + (i < 7 ? 2 : 4), b - (i > 12 ? 2 : 1)]);
  scene.add(extrudedRows(rearRows, { y: 10.28, z: -2.8, depth: 5.4, color: 0x760e36, sideColor: 0x3b0c2e, cellY: CROWN_CELL_Y }));
  scene.add(extrudedRows(CROWN, { y: 10.28, z: -1.65, depth: 4.3, color: 0xd9173e, sideColor: 0x700f34, cellY: CROWN_CELL_Y }));

  // Dark magenta pixel masses break up the scarlet face in the reference's
  // characteristic left and lower areas. Their shallow extrusions add volume.
  const leftShadow = [null,null,null,null,null,null,[2,19],[0,24],[1,27],[2,29],[5,29],[9,27],[13,26],[10,25],null,null,null,null];
  const lowerShadow = [null,null,null,null,null,null,null,null,null,null,null,[27,41],[24,40],[21,38],[18,35],[21,31],[24,29],null];
  scene.add(extrudedRows(leftShadow, { y: 10.28, z: 2.72, depth: 0.18, color: 0xa70b82, sideColor: 0x5a104f, cellY: CROWN_CELL_Y }));
  scene.add(extrudedRows(lowerShadow, { y: 10.28, z: 2.92, depth: 0.16, color: 0x980c75, sideColor: 0x531044, cellY: CROWN_CELL_Y }));
  const redPixels = [null,[27,34],[25,36],[21,39],[18,41],[17,38],null,[31,37],[34,38],null,null,null,[30,35],null,null,null,null,null];
  scene.add(extrudedRows(redPixels, { y: 10.28, z: 3.10, depth: 0.13, color: 0xee2048, sideColor: 0x891337, cellY: CROWN_CELL_Y }));

  // Thick pixel-shaped branches sit behind the crown and connect it to the trunk.
  const leftBranch = [null,null,null,null,null,null,[17,20],[16,20],[15,20],[14,21],[13,22],[12,23]];
  const rightBranch = [null,null,null,null,null,null,null,[26,29],[27,31],[28,33],[29,35],[30,36]];
  scene.add(extrudedRows(leftBranch, { y: 7.0, z: -1.9, depth: 3.9, color: 0x27152f, sideColor: 0x160c20 }));
  scene.add(extrudedRows(rightBranch, { y: 7.0, z: -1.9, depth: 3.9, color: 0x27152f, sideColor: 0x160c20 }));

  // Chunky, tapered trunk and roots, also extruded and outlined in pixel steps.
  const trunkRows = [[21,26],[21,26],[21,26],[20,26],[20,26],[21,26],[20,27],[19,28],[18,29],[18,30],[17,31],[16,32],[18,30],[19,29],[20,28],[18,30],[16,32],[14,34],[12,36]];
  scene.add(extrudedRows(trunkRows, { y: 0.04, z: -4.0, depth: 6.0, color: 0xe51aa7, sideColor: 0x81106a, expand: 1 }));
  scene.add(extrudedRows(trunkRows, { y: 0.04, z: -2.5, depth: 5.1, color: 0x25152d, sideColor: 0x120d19 }));
  const trunkDetail = [null,null,null,null,null,null,null,null,null,null,null,[22,25],[21,25],[21,26],[20,27],[19,28],[18,29],null];
  scene.add(extrudedRows(trunkDetail, { y: 0.04, z: 2.62, depth: 0.14, color: 0x321638, sideColor: 0x1c1024 }));
}

export function collides(x, z) {
  const halfW = CONFIG.world.width / 2 - CONFIG.player.radius - 0.2;
  const halfD = CONFIG.world.depth / 2 - CONFIG.player.radius - 0.2;
  if (Math.abs(x) > halfW || Math.abs(z) > halfD) return true;
  // Only the physical trunk blocks walking. The elevated canopy can be explored beneath,
  // and its real depth is visible while walking around the trunk from either side.
  return Math.abs(x - CONFIG.tree.x) < 1.85 && Math.abs(z - CONFIG.tree.z) < 2.9;
}

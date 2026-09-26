import * as THREE from 'three';
import { CONFIG } from './config.js';

// Pixel rows form a single stair-stepped silhouette. ExtrudeGeometry gives each
// row-mask a continuous front surface and real, visible thickness at the sides.
const CELL = 0.55;
const CROWN = [
  [27,34],[26,36],[20,39],[15,41],[12,44],[8,46],[4,47],[0,47],
  [1,47],[2,46],[5,44],[9,42],[13,39],[10,42],[14,38],[18,34],
  [21,31],[24,29]
];

function shapesFromRows(rows) {
  const shapes = []; let i = 0;
  while (i < rows.length) {
    while (i < rows.length && !rows[i]) i++;
    if (i >= rows.length) break;
    const first = i, part = [];
    while (i < rows.length && rows[i]) part.push(rows[i++]);
    const height = rows.length * CELL, shape = new THREE.Shape();
    const xLeft = n => (n - 24) * CELL, xRight = n => (n - 23) * CELL;
    let [left, right] = part[0];
    shape.moveTo(xLeft(left), height - first * CELL);
    shape.lineTo(xRight(right), height - first * CELL);
    for (let j = 0; j < part.length; j++) {
      const y = height - (first + j + 1) * CELL;
      shape.lineTo(xRight(part[j][1]), y);
      if (j + 1 < part.length && part[j + 1][1] !== part[j][1]) shape.lineTo(xRight(part[j + 1][1]), y);
    }
    for (let j = part.length - 1; j >= 0; j--) {
      const y = height - (first + j + 1) * CELL;
      shape.lineTo(xLeft(part[j][0]), y);
      if (j > 0 && part[j - 1][0] !== part[j][0]) shape.lineTo(xLeft(part[j - 1][0]), y);
    }
    shape.closePath(); shapes.push(shape);
  }
  return shapes;
}

function extrudedRows(rows, { y = 0, z = 0, depth = 1, color, sideColor = color, expand = 0, materialSide = THREE.DoubleSide } = {}) {
  const expanded = rows.map(span => span && [span[0] - expand, span[1] + expand]);
  const front = new THREE.MeshBasicMaterial({ color, side: materialSide, fog: true });
  const sides = new THREE.MeshBasicMaterial({ color: sideColor, side: materialSide, fog: true });
  const group = new THREE.Group(); group.position.set(CONFIG.tree.x, y, CONFIG.tree.z + z);
  for (const shape of shapesFromRows(expanded)) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 });
    group.add(new THREE.Mesh(geometry, [front, sides]));
  }
  return group;
}

function makePath() {
  const startZ = CONFIG.path.startZ, endZ = CONFIG.path.endZ;
  const vertices = new Float32Array([
    -2.5, 0.005, startZ,  2.5, 0.005, startZ,
     1.45,0.005, endZ,   -1.45,0.005, endZ
  ]);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0,2,1, 0,3,2]); geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x54225f, side: THREE.DoubleSide, fog: true }));
}

export function buildEnvironment(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.width, CONFIG.world.depth),
    new THREE.MeshBasicMaterial({ color: 0x050407, fog: true })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04; scene.add(ground);
  scene.add(makePath());

  const shell = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.world.width, 18, CONFIG.world.depth), new THREE.MeshBasicMaterial({ color: 0x020203, side: THREE.BackSide }));
  shell.position.y = 8.9; scene.add(shell);

  // A continuous pixel outline volume peeks around the entire crown. It is
  // slightly wider and deeper than the red mass, so it remains visible at all angles.
  const outlineRows = [CROWN[0], ...CROWN, CROWN[CROWN.length - 1]];
  scene.add(extrudedRows(outlineRows, { y: 10.28 - CELL, z: -3.0, depth: 6.3, color: 0xe51aa7, sideColor: 0x86126e, expand: 1 }));

  // Rear, middle and front crown masses overlap as solid extrusions rather than cards.
  const rearRows = CROWN.map(([a,b], i) => [a + (i < 7 ? 2 : 4), b - (i > 12 ? 2 : 1)]);
  scene.add(extrudedRows(rearRows, { y: 10.28, z: -2.8, depth: 5.4, color: 0x760e36, sideColor: 0x3b0c2e }));
  scene.add(extrudedRows(CROWN, { y: 10.28, z: -1.65, depth: 4.3, color: 0xd9173e, sideColor: 0x700f34 }));

  // Dark magenta pixel masses break up the scarlet face in the reference's
  // characteristic left and lower areas. Their shallow extrusions add volume.
  const leftShadow = [null,null,null,null,null,null,[2,19],[0,24],[1,27],[2,29],[5,29],[9,27],[13,26],[10,25],null,null,null,null];
  const lowerShadow = [null,null,null,null,null,null,null,null,null,null,null,[27,41],[24,40],[21,38],[18,35],[21,31],[24,29],null];
  scene.add(extrudedRows(leftShadow, { y: 10.28, z: 0.58, depth: 0.9, color: 0xa70b82, sideColor: 0x5a104f }));
  scene.add(extrudedRows(lowerShadow, { y: 10.28, z: 0.62, depth: 0.75, color: 0x980c75, sideColor: 0x531044 }));
  const redPixels = [null,[27,34],[25,36],[21,39],[18,41],[17,38],null,[31,37],[34,38],null,null,null,[30,35],null,null,null,null,null];
  scene.add(extrudedRows(redPixels, { y: 10.28, z: 0.72, depth: 0.58, color: 0xee2048, sideColor: 0x891337 }));

  // Thick pixel-shaped branches sit behind the crown and connect it to the trunk.
  const leftBranch = [null,null,null,null,null,null,[17,20],[16,20],[15,20],[14,21],[13,22],[12,23]];
  const rightBranch = [null,null,null,null,null,null,null,[26,29],[27,31],[28,33],[29,35],[30,36]];
  scene.add(extrudedRows(leftBranch, { y: 7.0, z: -1.9, depth: 3.9, color: 0x27152f, sideColor: 0x160c20 }));
  scene.add(extrudedRows(rightBranch, { y: 7.0, z: -1.9, depth: 3.9, color: 0x27152f, sideColor: 0x160c20 }));

  // Chunky, tapered trunk and roots, also extruded and outlined in pixel steps.
  const trunkRows = [[21,26],[21,26],[21,26],[20,26],[20,26],[21,26],[20,27],[19,28],[18,29],[18,30],[17,31],[16,32],[18,30],[19,29],[20,28],[18,30],[16,32],[14,34],[12,36]];
  scene.add(extrudedRows(trunkRows, { y: 0.04, z: -2.8, depth: 5.6, color: 0xe51aa7, sideColor: 0x81106a, expand: 1 }));
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

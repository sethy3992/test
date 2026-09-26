import * as THREE from 'three';
import { CONFIG } from './config.js';
import { collides } from './environment.js';

export class Player {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom; this.yaw = 0; this.pitch = 0; this.velocity = new THREE.Vector2(); this.keys = new Set(); this.walkTime = 0;
    this.position = new THREE.Vector3(0, CONFIG.player.height, 21); camera.position.copy(this.position); camera.rotation.order = 'YXZ';
    this.yaw = 0; // Three.js camera forward at yaw zero is world -Z, toward the tree.
    this.onKeyDown = e => { if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) { this.keys.add(e.code); e.preventDefault(); } };
    this.onKeyUp = e => this.keys.delete(e.code); this.onMouse = e => { if (!document.pointerLockElement) return; this.yaw -= e.movementX * CONFIG.player.sensitivity; this.pitch -= e.movementY * CONFIG.player.sensitivity; this.pitch = THREE.MathUtils.clamp(this.pitch, -1.35, 1.35); };
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp); document.addEventListener('mousemove', this.onMouse);
  }
  update(dt) {
    // Apply the latest pointer-lock rotation before deriving this frame's movement basis.
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const strafe = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const mag = Math.hypot(forward, strafe) || 1;
    // Derive the basis from the camera itself, then flatten it so pitch never affects walking.
    const forward3 = this.camera.getWorldDirection(new THREE.Vector3()); forward3.y = 0; forward3.normalize();
    const right3 = new THREE.Vector3().crossVectors(forward3, new THREE.Vector3(0, 1, 0)).normalize();
    const move3 = forward3.multiplyScalar(forward).add(right3.multiplyScalar(strafe));
    if (move3.lengthSq() > 1) move3.normalize();
    const desired = new THREE.Vector2(move3.x, move3.z).multiplyScalar(CONFIG.player.speed);
    this.velocity.lerp(desired, 1 - Math.exp(-CONFIG.player.acceleration * dt));
    const nx = this.position.x + this.velocity.x * dt, nz = this.position.z + this.velocity.y * dt;
    if (!collides(nx, this.position.z)) this.position.x = nx; else this.velocity.x = 0;
    if (!collides(this.position.x, nz)) this.position.z = nz; else this.velocity.y = 0;
    const moving = this.velocity.length() > .15; if (moving) this.walkTime += dt * 7.2;
    this.camera.position.set(this.position.x, CONFIG.player.height + (moving ? Math.sin(this.walkTime) * CONFIG.player.bob : 0), this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}

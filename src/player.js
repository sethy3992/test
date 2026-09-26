import * as THREE from 'three';
import { CONFIG } from './config.js';
import { collides } from './environment.js';

export class Player {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom; this.yaw = 0; this.pitch = 0; this.velocity = new THREE.Vector2(); this.keys = new Set(); this.walkTime = 0;
    this.position = new THREE.Vector3(0, CONFIG.player.height, 7); camera.position.copy(this.position); camera.rotation.order = 'YXZ';
    this.onKeyDown = e => { if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) { this.keys.add(e.code); e.preventDefault(); } };
    this.onKeyUp = e => this.keys.delete(e.code); this.onMouse = e => { if (!document.pointerLockElement) return; this.yaw -= e.movementX * CONFIG.player.sensitivity; this.pitch -= e.movementY * CONFIG.player.sensitivity; this.pitch = THREE.MathUtils.clamp(this.pitch, -1.35, 1.35); };
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp); document.addEventListener('mousemove', this.onMouse);
  }
  update(dt) {
    const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const strafe = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const mag = Math.hypot(forward, strafe) || 1;
    const desired = new THREE.Vector2((strafe * Math.cos(this.yaw) + forward * Math.sin(this.yaw)) / mag, (strafe * Math.sin(this.yaw) - forward * Math.cos(this.yaw)) / mag).multiplyScalar(CONFIG.player.speed);
    this.velocity.lerp(desired, 1 - Math.exp(-CONFIG.player.acceleration * dt));
    const nx = this.position.x + this.velocity.x * dt, nz = this.position.z + this.velocity.y * dt;
    if (!collides(nx, this.position.z)) this.position.x = nx; else this.velocity.x = 0;
    if (!collides(this.position.x, nz)) this.position.z = nz; else this.velocity.y = 0;
    const moving = this.velocity.length() > .15; if (moving) this.walkTime += dt * 7.2;
    this.camera.position.set(this.position.x, CONFIG.player.height + (moving ? Math.sin(this.walkTime) * CONFIG.player.bob : 0), this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}

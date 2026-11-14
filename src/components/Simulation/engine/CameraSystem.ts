// ═══════════════════════════════════════════════════════════════════════
// Camera System — Cinematic phases, free orbit, onboard HUD
// Smooth ease-in-out, dt-based interpolation
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { CameraMode } from './config';

export class CameraSystem {
  camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'cinematic';
  private time = 0;

  // Cinematic interpolation state
  private currentPos = new THREE.Vector3();
  private targetPos = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private currentFOV = 45;
  private targetFOV = 45;

  // Free orbit state
  private orbitAngle = 0;
  private orbitRadius = 30;
  private orbitHeight = 10;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Time scale
  private _timeScale = 1;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    this.camera.position.set(30, 50, 60);
    this.currentPos.copy(this.camera.position);
    this.currentLookAt.set(0, 0, 0);
  }

  get timeScale() { return this._timeScale; }
  set timeScale(v: number) { this._timeScale = v; }

  setMode(mode: CameraMode) {
    this.mode = mode;
  }

  getMode() { return this.mode; }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // Smooth interpolation factor
  private smoothStep(current: number, target: number, speed: number, dt: number): number {
    return current + (target - current) * (1 - Math.exp(-speed * dt));
  }

  update(
    dt: number,
    landerPos: THREE.Vector3,
    landerAlt: number,
    isComplete: boolean,
    failureType: string,
    elapsedTime: number
  ) {
    this.time += dt;

    if (this.mode === 'cinematic') {
      this.updateCinematic(dt, landerPos, landerAlt, isComplete, failureType, elapsedTime);
    } else if (this.mode === 'free_orbit') {
      this.updateFreeOrbit(dt, landerPos);
    } else {
      this.updateOnboard(dt, landerPos, landerAlt);
    }

    // Smooth camera motion
    const lerpSpeed = 3.0;
    this.currentPos.x = this.smoothStep(this.currentPos.x, this.targetPos.x, lerpSpeed, dt);
    this.currentPos.y = this.smoothStep(this.currentPos.y, this.targetPos.y, lerpSpeed, dt);
    this.currentPos.z = this.smoothStep(this.currentPos.z, this.targetPos.z, lerpSpeed, dt);

    this.currentLookAt.x = this.smoothStep(this.currentLookAt.x, this.targetLookAt.x, lerpSpeed * 1.5, dt);
    this.currentLookAt.y = this.smoothStep(this.currentLookAt.y, this.targetLookAt.y, lerpSpeed * 1.5, dt);
    this.currentLookAt.z = this.smoothStep(this.currentLookAt.z, this.targetLookAt.z, lerpSpeed * 1.5, dt);

    this.currentFOV = this.smoothStep(this.currentFOV, this.targetFOV, 2.0, dt);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
    this.camera.fov = this.currentFOV;
    this.camera.updateProjectionMatrix();
  }

  private updateCinematic(
    dt: number,
    landerPos: THREE.Vector3,
    landerAlt: number,
    isComplete: boolean,
    failureType: string,
    elapsedTime: number
  ) {
    if (isComplete) {
      // Post-touchdown: slow orbit
      const orbitSpeed = 0.15;
      const angle = this.time * orbitSpeed;
      const radius = 15 + Math.sin(this.time * 0.1) * 3;
      this.targetPos.set(
        landerPos.x + Math.cos(angle) * radius,
        landerPos.y + 5 + Math.sin(this.time * 0.2) * 2,
        landerPos.z + Math.sin(angle) * radius
      );
      this.targetLookAt.copy(landerPos);
      this.targetLookAt.y += 2;
      this.targetFOV = 40;
      return;
    }

    if (landerAlt > 1000) {
      // Phase 1: High altitude — wide angle, lander and horizon
      const offset = new THREE.Vector3(40, landerAlt * 0.3 + 20, 50);
      this.targetPos.copy(landerPos).add(offset);
      this.targetLookAt.copy(landerPos);
      this.targetFOV = 55;
    } else if (landerAlt > 100) {
      // Phase 2: Mid descent — closer tracking
      const t = (landerAlt - 100) / 900;
      const dist = 15 + t * 30;
      const angle = this.time * 0.08;
      this.targetPos.set(
        landerPos.x + Math.cos(angle) * dist,
        landerPos.y + 5 + t * 15,
        landerPos.z + Math.sin(angle) * dist
      );
      this.targetLookAt.copy(landerPos);
      this.targetFOV = 45 + (1 - t) * 10;
    } else if (landerAlt > 5) {
      // Phase 3: Final 100m — camera dollies down, surface detail
      const t = landerAlt / 100;
      const dist = 8 + t * 10;
      const angle = this.time * 0.12;
      this.targetPos.set(
        landerPos.x + Math.cos(angle) * dist,
        landerPos.y + 3 + t * 5,
        landerPos.z + Math.sin(angle) * dist
      );
      this.targetLookAt.copy(landerPos);
      this.targetLookAt.y -= 1;
      this.targetFOV = 50 + (1 - t) * 15; // FOV increase for speed sensation
    } else {
      // Phase 4: Touchdown moment — side view of legs
      this.targetPos.set(
        landerPos.x + 8,
        landerPos.y + 2,
        landerPos.z + 4
      );
      this.targetLookAt.copy(landerPos);
      this.targetLookAt.y += 0.5;
      this.targetFOV = 42;
    }
  }

  private updateFreeOrbit(dt: number, landerPos: THREE.Vector3) {
    this.orbitAngle += dt * 0.3;
    this.targetPos.set(
      landerPos.x + Math.cos(this.orbitAngle) * this.orbitRadius,
      landerPos.y + this.orbitHeight,
      landerPos.z + Math.sin(this.orbitAngle) * this.orbitRadius
    );
    this.targetLookAt.copy(landerPos);
    this.targetFOV = 45;
  }

  private updateOnboard(dt: number, landerPos: THREE.Vector3, landerAlt: number) {
    // Onboard downward-looking camera
    this.targetPos.set(landerPos.x, landerPos.y - 1, landerPos.z);
    this.targetLookAt.set(landerPos.x, 0, landerPos.z);
    this.targetFOV = 60;
  }

  setupMouseControls(element: HTMLElement) {
    element.addEventListener('mousedown', (e) => {
      if (this.mode === 'free_orbit') {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    element.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.mode === 'free_orbit') {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.orbitAngle -= dx * 0.01;
        this.orbitHeight += dy * 0.1;
        this.orbitHeight = Math.max(2, Math.min(100, this.orbitHeight));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    element.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    element.addEventListener('wheel', (e) => {
      if (this.mode === 'free_orbit') {
        this.orbitRadius += e.deltaY * 0.02;
        this.orbitRadius = Math.max(5, Math.min(100, this.orbitRadius));
      }
    });
  }

  dispose() {
    // Nothing to dispose
  }
}

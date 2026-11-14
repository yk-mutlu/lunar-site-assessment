// ═══════════════════════════════════════════════════════════════════════
// CameraFlyController.ts
// Cinematic delta-time based 3D Camera Fly-To & Return Controller
// Ease-in-out-cubic interpolation with parabolic altitude arc
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov?: number;
}

export class CameraFlyController {
  private isFlying = false;
  private flightTimer = 0;
  private flightDuration = 2.8; // seconds

  private startState: CameraState = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
  };

  private endState: CameraState = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
  };

  private overviewState: CameraState = {
    position: new THREE.Vector3(0, 85, 240),
    target: new THREE.Vector3(0, 16, 0),
  };

  private arcHeight = 35.0; // parabolic apex elevation during fly-to
  private onCompleteCallback?: () => void;

  public get active(): boolean {
    return this.isFlying;
  }

  // Ease-in-out-cubic polynomial
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public flyTo(
    currentPos: THREE.Vector3,
    currentTarget: THREE.Vector3,
    destTarget: THREE.Vector3,
    duration = 2.8,
    onComplete?: () => void
  ) {
    this.startState.position.copy(currentPos);
    this.startState.target.copy(currentTarget);

    // Cinematic low-angle approach position relative to destination
    const offsetDistance = 28.0;
    const offsetHeight = 9.5;
    this.endState.position.set(
      destTarget.x + offsetDistance * 0.7,
      destTarget.y + offsetHeight,
      destTarget.z + offsetDistance * 0.7
    );
    this.endState.target.copy(destTarget);

    // Save overview state if this is the first departure from high orbit
    if (currentPos.y > 60) {
      this.overviewState.position.copy(currentPos);
      this.overviewState.target.copy(currentTarget);
    }

    this.flightDuration = Math.max(1.5, duration);
    this.flightTimer = 0;
    this.isFlying = true;
    this.onCompleteCallback = onComplete;
  }

  public flyBackToOverview(
    currentPos: THREE.Vector3,
    currentTarget: THREE.Vector3,
    duration = 2.5,
    onComplete?: () => void
  ) {
    this.startState.position.copy(currentPos);
    this.startState.target.copy(currentTarget);

    this.endState.position.copy(this.overviewState.position);
    this.endState.target.copy(this.overviewState.target);

    this.flightDuration = Math.max(1.5, duration);
    this.flightTimer = 0;
    this.isFlying = true;
    this.onCompleteCallback = onComplete;
  }

  public interrupt() {
    this.isFlying = false;
    this.onCompleteCallback = undefined;
  }

  public update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    cameraTarget: THREE.Vector3
  ): boolean {
    if (!this.isFlying) return false;

    this.flightTimer += dt;
    const progress = Math.min(1.0, this.flightTimer / this.flightDuration);
    const ease = this.easeInOutCubic(progress);

    // 1. Interpolate look-at target
    cameraTarget.lerpVectors(this.startState.target, this.endState.target, ease);

    // 2. Interpolate position along parabolic arc
    camera.position.lerpVectors(this.startState.position, this.endState.position, ease);

    // Parabolic arc: sin(progress * PI)
    const arcBonus = Math.sin(progress * Math.PI) * this.arcHeight;
    camera.position.y += arcBonus;

    camera.lookAt(cameraTarget);

    if (progress >= 1.0) {
      this.isFlying = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
      return false;
    }

    return true;
  }
}

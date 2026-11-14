// ═══════════════════════════════════════════════════════════════════════
// Failure Animations System
// 5 distinct failure sequences:
// 1. Crash Speed: High velocity impact, leg buckling, debris explosion
// 2. Tipover: Slope instability, slow motion tilt, antenna breaking
// 3. Fuel Starvation: Flame extinguishes, RCS shudder, free-fall drop
// 4. Insufficient Thrust: TWR < 1 warning, slow uncontrollable descent
// 5. Radar Lock Loss: HUD corruption, horizontal drift, chaotic tumble
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { FailureType } from './config';
import type { SpacecraftParts } from './SpacecraftModel';
import type { DebrisSystem } from './EffectsSystem';
import type { AudioEngine } from './AudioEngine';

export interface FailureAnimationState {
  active: boolean;
  type: FailureType;
  timer: number;
  phase: number;
}

export class FailureAnimator {
  private state: FailureAnimationState = {
    active: false,
    type: 'none',
    timer: 0,
    phase: 0,
  };

  private soundTriggered = false;

  trigger(type: FailureType, audio: AudioEngine, debris: DebrisSystem, landerPos: THREE.Vector3, terrainY: number) {
    if (type === 'none') return;
    this.state.active = true;
    this.state.type = type;
    this.state.timer = 0;
    this.state.phase = 0;
    this.soundTriggered = false;

    if (type === 'crash_speed' || type === 'fuel_starvation') {
      audio.playAlarm();
    }
  }

  update(
    dt: number,
    parts: SpacecraftParts,
    debris: DebrisSystem,
    audio: AudioEngine,
    slopeDeg: number
  ): { cameraShake: number; hudCorrupted: boolean } {
    if (!this.state.active || this.state.type === 'none') {
      return { cameraShake: 0, hudCorrupted: false };
    }

    this.state.timer += dt;
    const t = this.state.timer;
    const { group, legs, body, nozzle } = parts;

    let cameraShake = 0;
    let hudCorrupted = false;

    switch (this.state.type) {
      case 'crash_speed': {
        // Impact occurs: heavy buckled legs and catastrophic debris release
        if (!this.soundTriggered) {
          audio.playCrash();
          this.soundTriggered = true;
          debris.explode(group.position, 0, 45);
        }

        // Camera violent impulse that quickly damps
        cameraShake = Math.max(0, 1.2 * Math.exp(-t * 2.5));

        // Squish body and buckle landing legs
        if (t < 0.6) {
          const comp = 1.0 - t * 0.4;
          body.scale.set(1.0 + t * 0.2, Math.max(0.4, comp), 1.0 + t * 0.2);
          legs.forEach((leg, idx) => {
            leg.rotation.z += (idx % 2 === 0 ? 0.05 : -0.05);
            leg.position.y = Math.max(-0.2, leg.position.y - dt * 2);
          });
        }
        break;
      }

      case 'tipover': {
        // Dramatic slow-motion tilt over slope
        const tiltDir = slopeDeg >= 0 ? 1 : -1;
        const targetAngle = (tiltDir * 78 * Math.PI) / 180;

        if (t < 2.0) {
          const progress = Math.min(1.0, t / 1.8);
          // Ease-in polynomial lean
          const ease = Math.pow(progress, 2.2);
          group.rotation.z = ease * targetAngle;
          group.position.y = Math.max(0.3, 1.5 * (1 - ease * 0.7));

          // Break one leg on touchdown pivot
          if (progress > 0.4 && legs.length > 0) {
            legs[0].rotation.x += dt * 1.5;
            legs[0].position.x += dt * 0.5;
          }
        }

        if (t > 1.4 && !this.soundTriggered) {
          audio.playCrash();
          debris.explode(group.position, 0, 15);
          this.soundTriggered = true;
          cameraShake = 0.4;
        }
        break;
      }

      case 'fuel_starvation': {
        // Flame already died in physics engine. Lander falls helplessly.
        if (group.position.y <= 0.2) {
          if (!this.soundTriggered) {
            audio.playCrash();
            debris.explode(group.position, 0, 35);
            this.soundTriggered = true;
          }
          cameraShake = Math.max(0, 0.9 * Math.exp(-(t - 0.2) * 2));
          group.rotation.x = 0.35;
          group.rotation.z = -0.25;
        } else {
          // Shudder / roll as it plummets
          group.rotation.y += dt * 1.2;
          group.rotation.z = Math.sin(t * 12) * 0.08;
        }
        break;
      }

      case 'insufficient_thrust': {
        // Cannot overcome lunar gravity, settling with excessive sink rate
        if (group.position.y <= 0.3) {
          if (!this.soundTriggered) {
            audio.playCrash();
            debris.explode(group.position, 0, 20);
            this.soundTriggered = true;
          }
          cameraShake = 0.35;
          // Partial gear collapse
          legs.forEach((leg) => {
            leg.scale.y = 0.6;
          });
        }
        break;
      }

      case 'radar_lock_loss': {
        // Glitchy HUD, aggressive lateral drift and ground impact off-axis
        hudCorrupted = true;
        group.rotation.z += dt * 0.8;
        group.rotation.x += dt * 0.5;
        group.position.x += dt * 3.5;

        if (group.position.y <= 0.2 && !this.soundTriggered) {
          audio.playCrash();
          debris.explode(group.position, 0, 25);
          this.soundTriggered = true;
          cameraShake = 0.6;
        }
        break;
      }
    }

    return { cameraShake, hudCorrupted };
  }

  reset() {
    this.state = {
      active: false,
      type: 'none',
      timer: 0,
      phase: 0,
    };
    this.soundTriggered = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Effects System — Plume, RCS, Dust Particles, Debris
// GPU instancing for particles, shader-based plume
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { LanderProfile } from './config';
import { LUNAR_G } from './config';

// ── Main Engine Plume ────────────────────────────────────────────────
export class EnginePlume {
  group: THREE.Group;
  private coreMesh: THREE.Mesh;
  private outerMesh: THREE.Mesh;
  private glowMesh: THREE.Mesh;
  private time = 0;

  constructor(scale: number) {
    this.group = new THREE.Group();

    // Core plume (bright blue-white)
    const coreGeo = new THREE.ConeGeometry(0.3 * scale, 4 * scale, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coreMesh.rotation.x = Math.PI;
    this.coreMesh.position.y = -2.5 * scale;
    this.group.add(this.coreMesh);

    // Outer plume (dim orange, wider)
    const outerGeo = new THREE.ConeGeometry(0.8 * scale, 6 * scale, 12);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.outerMesh = new THREE.Mesh(outerGeo, outerMat);
    this.outerMesh.rotation.x = Math.PI;
    this.outerMesh.position.y = -3.5 * scale;
    this.group.add(this.outerMesh);

    // Glow sprite
    const glowGeo = new THREE.PlaneGeometry(3 * scale, 3 * scale);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6699ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.position.y = -1 * scale;
    this.group.add(this.glowMesh);

    this.group.visible = false;
  }

  update(throttle: number, dt: number) {
    this.time += dt;

    if (throttle < 0.01) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;

    // Flicker
    const flicker = 0.85 + Math.sin(this.time * 47) * 0.05 + Math.sin(this.time * 73) * 0.05 + Math.random() * 0.05;

    // Core scales with throttle
    const coreScale = throttle * flicker;
    this.coreMesh.scale.set(coreScale, 0.5 + throttle * 0.8, coreScale);
    (this.coreMesh.material as THREE.MeshBasicMaterial).opacity = throttle * 0.9;

    // Outer plume
    const outerScale = throttle * 0.8 * flicker;
    this.outerMesh.scale.set(outerScale * 1.2, 0.3 + throttle * 0.7, outerScale * 1.2);
    (this.outerMesh.material as THREE.MeshBasicMaterial).opacity = throttle * 0.2;

    // Glow
    const glowScale = throttle * flicker * 1.2;
    this.glowMesh.scale.setScalar(glowScale);
    (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = throttle * 0.3;

    // Glow faces camera (billboard)
    this.glowMesh.rotation.z = this.time * 0.3;
  }

  dispose() {
    this.coreMesh.geometry.dispose();
    (this.coreMesh.material as THREE.Material).dispose();
    this.outerMesh.geometry.dispose();
    (this.outerMesh.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
  }
}

// ── RCS Jet Pulses ───────────────────────────────────────────────────
export class RCSJets {
  private jets: THREE.Mesh[] = [];
  private timers: number[] = [];

  constructor(positions: THREE.Vector3[], parent: THREE.Group, scale: number) {
    const geo = new THREE.ConeGeometry(0.06 * scale, 0.4 * scale, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (const pos of positions) {
      const jet = new THREE.Mesh(geo.clone(), mat.clone());
      jet.position.copy(pos);
      jet.position.x *= 1.1;
      jet.position.z *= 1.1;
      // Point outward from center
      const dir = new THREE.Vector3(pos.x, 0, pos.z).normalize();
      jet.lookAt(pos.x + dir.x * 2, pos.y, pos.z + dir.z * 2);
      jet.visible = false;
      parent.add(jet);
      this.jets.push(jet);
      this.timers.push(0);
    }
  }

  fire(indices: number[]) {
    for (const i of indices) {
      if (i < this.jets.length) {
        this.timers[i] = 0.15; // 150ms burst
        this.jets[i].visible = true;
      }
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.jets.length; i++) {
      if (this.timers[i] > 0) {
        this.timers[i] -= dt;
        const mat = this.jets[i].material as THREE.MeshBasicMaterial;
        mat.opacity = Math.min(1, this.timers[i] * 8);
        if (this.timers[i] <= 0) {
          this.jets[i].visible = false;
          mat.opacity = 0;
        }
      }
    }
  }

  dispose() {
    for (const jet of this.jets) {
      jet.geometry.dispose();
      (jet.material as THREE.Material).dispose();
    }
  }
}

// ── Regolith Blowoff Particles ───────────────────────────────────────
interface DustParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class RegolithParticles {
  private mesh: THREE.InstancedMesh;
  private particles: DustParticle[] = [];
  private maxParticles: number;
  private dummy = new THREE.Object3D();
  private spawnRate = 0;

  constructor(maxParticles: number, scene: THREE.Scene) {
    this.maxParticles = maxParticles;

    const geo = new THREE.SphereGeometry(0.05, 4, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.6,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  update(dt: number, landerAlt: number, landerPosX: number, landerPosZ: number, throttle: number, terrainY: number) {
    // Only spawn below 40m altitude
    if (landerAlt < 40 && throttle > 0.05) {
      this.spawnRate = (1 - landerAlt / 40) * throttle * 200;

      const spawnCount = Math.floor(this.spawnRate * dt);
      for (let i = 0; i < spawnCount && this.particles.length < this.maxParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 15;
        const upSpeed = 0.5 + Math.random() * 3;

        this.particles.push({
          position: new THREE.Vector3(
            landerPosX + (Math.random() - 0.5) * 4,
            terrainY + 0.1,
            landerPosZ + (Math.random() - 0.5) * 4,
          ),
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            upSpeed,
            Math.sin(angle) * speed,
          ),
          life: 0,
          maxLife: 2 + Math.random() * 4,
          size: 0.02 + Math.random() * 0.12,
        });
      }
    }

    // Update existing particles — ballistic in vacuum
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life > p.maxLife || p.position.y < terrainY - 1) {
        this.particles.splice(i, 1);
        continue;
      }

      // Ballistic: no drag, just lunar gravity
      p.velocity.y -= LUNAR_G * dt;
      p.position.add(p.velocity.clone().multiplyScalar(dt));

      // Bounce off terrain
      if (p.position.y < terrainY + 0.05) {
        p.position.y = terrainY + 0.05;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.7;
        p.velocity.z *= 0.7;
      }
    }

    // Update instanced mesh
    this.mesh.count = Math.min(this.particles.length, this.maxParticles);
    for (let i = 0; i < this.mesh.count; i++) {
      const p = this.particles[i];
      this.dummy.position.copy(p.position);
      const fadeOut = 1 - p.life / p.maxLife;
      this.dummy.scale.setScalar(p.size * (0.5 + fadeOut * 0.5));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (this.mesh.count > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  clear() {
    this.particles.length = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}

// ── Debris System (for crash animations) ─────────────────────────────
interface DebrisPiece {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVel: THREE.Vector3;
  life: number;
  size: number;
  type: 'metal' | 'foil' | 'panel';
}

export class DebrisSystem {
  private mesh: THREE.InstancedMesh;
  private pieces: DebrisPiece[] = [];
  private dummy = new THREE.Object3D();

  constructor(maxPieces: number, scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(1, 0.1, 0.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, maxPieces);
    this.mesh.count = 0;
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  explode(origin: THREE.Vector3, terrainY: number, count: number = 30) {
    this.pieces.length = 0;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const upAngle = 0.3 + Math.random() * 0.7;
      const speed = 2 + Math.random() * 10;

      this.pieces.push({
        position: origin.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2,
          (Math.random() - 0.5) * 3
        )),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * Math.cos(upAngle),
          speed * Math.sin(upAngle),
          Math.sin(angle) * speed * Math.cos(upAngle),
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        angularVel: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        life: 0,
        size: 0.1 + Math.random() * 0.5,
        type: ['metal', 'foil', 'panel'][Math.floor(Math.random() * 3)] as DebrisPiece['type'],
      });
    }
  }

  update(dt: number, terrainY: number) {
    for (const p of this.pieces) {
      p.life += dt;
      p.velocity.y -= LUNAR_G * dt;
      p.position.add(p.velocity.clone().multiplyScalar(dt));

      p.rotation.x += p.angularVel.x * dt;
      p.rotation.y += p.angularVel.y * dt;
      p.rotation.z += p.angularVel.z * dt;

      if (p.position.y < terrainY + p.size * 0.5) {
        p.position.y = terrainY + p.size * 0.5;
        p.velocity.y *= -0.2;
        p.velocity.x *= 0.8;
        p.velocity.z *= 0.8;
        p.angularVel.multiplyScalar(0.7);
      }
    }

    this.mesh.count = Math.min(this.pieces.length, this.mesh.count + 5); // gradual reveal
    for (let i = 0; i < this.mesh.count; i++) {
      const p = this.pieces[i];
      this.dummy.position.copy(p.position);
      this.dummy.rotation.copy(p.rotation);
      this.dummy.scale.setScalar(p.size);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (this.mesh.count > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  clear() {
    this.pieces.length = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}

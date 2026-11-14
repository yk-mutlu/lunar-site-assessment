// ═══════════════════════════════════════════════════════════════════════
// Procedural Spacecraft Model Builder
// PBR materials, gold foil, legs, nozzle, RCS clusters
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { LanderProfile } from './config';

export interface SpacecraftParts {
  group: THREE.Group;
  body: THREE.Mesh;
  legs: THREE.Group[];
  footpads: THREE.Mesh[];
  nozzle: THREE.Mesh;
  engineLight: THREE.PointLight;
  rcsPositions: THREE.Vector3[];
  rcsMeshes: THREE.Mesh[];
}

export function buildSpacecraft(profile: LanderProfile): SpacecraftParts {
  const s = profile.modelScale;
  const group = new THREE.Group();

  // ── Main body (octagonal bus) ────────────────────────────────
  const bodyGeo = new THREE.CylinderGeometry(2.2 * s, 2.8 * s, 2.5 * s, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xc8cbd4,
    metalness: 0.7,
    roughness: 0.25,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2.2 * s;
  body.castShadow = true;
  group.add(body);

  // ── Gold foil MLI panels ─────────────────────────────────────
  const foilGeo = new THREE.CylinderGeometry(2.25 * s, 2.85 * s, 2.6 * s, 8, 1, true);
  const foilMat = new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    metalness: 0.85,
    roughness: 0.3,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const foil = new THREE.Mesh(foilGeo, foilMat);
  foil.position.y = 2.2 * s;
  foil.castShadow = true;
  group.add(foil);

  // ── Upper equipment deck ─────────────────────────────────────
  const deckGeo = new THREE.CylinderGeometry(2.0 * s, 2.2 * s, 0.3 * s, 8);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = 3.6 * s;
  deck.castShadow = true;
  group.add(deck);

  // ── Antenna ──────────────────────────────────────────────────
  const antennaGeo = new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 1.5 * s);
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.2 });
  const antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.set(0.5 * s, 4.3 * s, 0);
  group.add(antenna);

  const dishGeo = new THREE.CircleGeometry(0.4 * s, 16);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0.5 * s, 5.0 * s, 0);
  dish.rotation.x = -0.3;
  group.add(dish);

  // ── Fuel tanks (4 spheres with gold insulation) ──────────────
  const tankGeo = new THREE.SphereGeometry(0.8 * s, 16, 16);
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.85,
    roughness: 0.15,
  });
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(Math.cos(angle) * 1.8 * s, 2.2 * s, Math.sin(angle) * 1.8 * s);
    tank.castShadow = true;
    group.add(tank);
  }

  // ── Engine nozzle ────────────────────────────────────────────
  const nozzleGeo = new THREE.ConeGeometry(
    profile.nozzleDiameterM * s,
    1.2 * s,
    16, 1, true
  );
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.92,
    roughness: 0.35,
  });
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.position.y = 0.5 * s;
  nozzle.rotation.x = Math.PI;
  nozzle.castShadow = true;
  group.add(nozzle);

  // ── Engine glow light ────────────────────────────────────────
  const engineLight = new THREE.PointLight(0x6699ff, 0, 50 * s);
  engineLight.position.y = -0.5 * s;
  group.add(engineLight);

  // ── Landing legs & footpads ──────────────────────────────────
  const legs: THREE.Group[] = [];
  const footpads: THREE.Mesh[] = [];
  const legMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.25 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.4, roughness: 0.5 });

  for (let i = 0; i < profile.legCount; i++) {
    const angle = (i * Math.PI * 2) / profile.legCount + Math.PI / 4;
    const legGroup = new THREE.Group();

    // Primary strut
    const strutGeo = new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 3.5 * s);
    const strut = new THREE.Mesh(strutGeo, legMat);
    strut.position.set(
      Math.cos(angle) * 2.0 * s,
      0.8 * s,
      Math.sin(angle) * 2.0 * s
    );
    const tiltAngle = 0.45;
    strut.rotation.z = Math.cos(angle) * tiltAngle;
    strut.rotation.x = -Math.sin(angle) * tiltAngle;
    strut.castShadow = true;
    legGroup.add(strut);

    // Secondary strut (shock absorber visual)
    const shockGeo = new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 2.0 * s);
    const shockMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
    const shock = new THREE.Mesh(shockGeo, shockMat);
    shock.position.set(
      Math.cos(angle) * 2.3 * s,
      1.2 * s,
      Math.sin(angle) * 2.3 * s
    );
    shock.rotation.z = Math.cos(angle) * 0.35;
    shock.rotation.x = -Math.sin(angle) * 0.35;
    legGroup.add(shock);

    // Footpad
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 * s, 0.45 * s, 0.08 * s, 16),
      padMat
    );
    pad.position.set(
      Math.cos(angle) * profile.legRadiusM * s * 0.5,
      0.04 * s,
      Math.sin(angle) * profile.legRadiusM * s * 0.5
    );
    pad.castShadow = true;
    legGroup.add(pad);
    footpads.push(pad);

    group.add(legGroup);
    legs.push(legGroup);
  }

  // ── RCS thruster clusters ────────────────────────────────────
  const rcsPositions: THREE.Vector3[] = [];
  const rcsMeshes: THREE.Mesh[] = [];
  const rcsGeo = new THREE.ConeGeometry(0.08 * s, 0.2 * s, 6);
  const rcsMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });

  const rcsCount = Math.min(profile.rcsClusterCount, 12);
  for (let i = 0; i < rcsCount; i++) {
    const angle = (i * Math.PI * 2) / rcsCount;
    const rcs = new THREE.Mesh(rcsGeo, rcsMat);
    const yPos = 2.2 * s + (i % 3 - 1) * 0.5 * s;
    rcs.position.set(
      Math.cos(angle) * 2.9 * s,
      yPos,
      Math.sin(angle) * 2.9 * s
    );
    // Point outward
    rcs.lookAt(
      Math.cos(angle) * 5 * s,
      yPos,
      Math.sin(angle) * 5 * s
    );
    group.add(rcs);
    rcsPositions.push(rcs.position.clone());
    rcsMeshes.push(rcs);
  }

  // ── Solar panel stubs ────────────────────────────────────────
  const panelGeo = new THREE.BoxGeometry(1.5 * s, 0.04 * s, 0.6 * s);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, metalness: 0.3, roughness: 0.6 });
  for (let side = -1; side <= 1; side += 2) {
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(side * 3.2 * s, 3.0 * s, 0);
    panel.castShadow = true;
    group.add(panel);
  }

  return { group, body, legs, footpads, nozzle, engineLight, rcsPositions, rcsMeshes };
}

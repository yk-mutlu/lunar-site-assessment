// ═══════════════════════════════════════════════════════════════════════
// Procedural Lunar Terrain Generator
// Multi-octave fBm noise + crater stamping + boulders
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { QualityConfig } from './config';

// ── Seeded PRNG ──────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Simplex-like value noise ─────────────────────────────────────────
function hash2d(x: number, y: number, seed: number): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);

  const n00 = hash2d(ix, iy, seed);
  const n10 = hash2d(ix + 1, iy, seed);
  const n01 = hash2d(ix, iy + 1, seed);
  const n11 = hash2d(ix + 1, iy + 1, seed);

  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}

// ── fBm (fractal Brownian motion) ────────────────────────────────────
function fbm(x: number, y: number, seed: number, octaves: number, lacunarity: number, gain: number): number {
  let value = 0, amplitude = 1, frequency = 1, maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, seed + i * 31);
    maxVal += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxVal;
}

// ── Ridged noise ─────────────────────────────────────────────────────
function ridgedNoise(x: number, y: number, seed: number, octaves: number): number {
  let value = 0, amplitude = 1, frequency = 1, weight = 1;
  for (let i = 0; i < octaves; i++) {
    let signal = smoothNoise(x * frequency, y * frequency, seed + i * 47);
    signal = 1.0 - Math.abs(signal * 2 - 1);
    signal *= signal * weight;
    weight = Math.min(1, Math.max(0, signal * 2));
    value += signal * amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value * 0.5;
}

// ── Crater profile ───────────────────────────────────────────────────
interface Crater {
  cx: number;
  cy: number;
  radius: number;
  depth: number;
  rimHeight: number;
}

function craterProfile(dist: number, crater: Crater): number {
  const r = crater.radius;
  const normDist = dist / r;

  if (normDist > 2.5) return 0;

  if (normDist < 0.8) {
    // Bowl interior — smooth parabolic
    const t = normDist / 0.8;
    return -crater.depth * (1 - t * t);
  } else if (normDist < 1.0) {
    // Inner wall — steep slope from bowl to rim
    const t = (normDist - 0.8) / 0.2;
    return -crater.depth * (1 - t) * (1 - t) * 0;
  } else if (normDist < 1.3) {
    // Rim crest
    const t = (normDist - 1.0) / 0.3;
    const rimShape = Math.cos(t * Math.PI) * 0.5 + 0.5;
    return crater.rimHeight * rimShape;
  } else {
    // Ejecta blanket — gradual falloff
    const t = (normDist - 1.3) / 1.2;
    return crater.rimHeight * 0.3 * Math.exp(-t * 3);
  }
}

// ── Generate terrain heightmap ───────────────────────────────────────
export function generateHeightmap(
  segments: number,
  size: number,
  seed: number,
  craterCount: number,
  slopeDeg: number,
  externalHeightmap?: Float32Array
): { heightmap: Float32Array; craters: Crater[] } {
  const rng = mulberry32(seed);
  const count = (segments + 1) * (segments + 1);
  const heightmap = new Float32Array(count);
  const step = size / segments;

  // Base terrain: multi-octave fBm
  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const idx = iy * (segments + 1) + ix;
      const wx = (ix - segments / 2) * step;
      const wy = (iy - segments / 2) * step;

      // Large-scale undulations
      const scale1 = 0.003;
      let h = fbm(wx * scale1, wy * scale1, seed, 6, 2.1, 0.48) * 60;

      // Medium-scale ridges
      h += ridgedNoise(wx * 0.008, wy * 0.008, seed + 100, 4) * 15;

      // Fine-scale roughness
      h += fbm(wx * 0.05, wy * 0.05, seed + 200, 4, 2.3, 0.4) * 3;

      // Micro-roughness (regolith granularity)
      h += fbm(wx * 0.2, wy * 0.2, seed + 300, 3, 2.0, 0.35) * 0.5;

      heightmap[idx] = h;
    }
  }

  // Blend external heightmap if provided
  if (externalHeightmap && externalHeightmap.length === count) {
    for (let i = 0; i < count; i++) {
      heightmap[i] = heightmap[i] * 0.3 + externalHeightmap[i] * 0.7;
    }
  }

  // Crater stamping (power-law size distribution)
  const craters: Crater[] = [];
  for (let i = 0; i < craterCount; i++) {
    // Power-law: many small, few large
    const u = rng();
    const radius = 3 + Math.pow(u, 3) * 80; // 3m to ~83m
    const cx = (rng() - 0.5) * size;
    const cy = (rng() - 0.5) * size;
    const depth = radius * (0.15 + rng() * 0.1);
    const rimHeight = depth * (0.3 + rng() * 0.2);

    const crater: Crater = { cx, cy, radius, depth, rimHeight };
    craters.push(crater);

    // Stamp crater onto heightmap
    const rPx = Math.ceil(radius * 2.5 / step);
    const cix = Math.round(cx / step + segments / 2);
    const ciy = Math.round(cy / step + segments / 2);

    for (let dy = -rPx; dy <= rPx; dy++) {
      for (let dx = -rPx; dx <= rPx; dx++) {
        const px = cix + dx;
        const py = ciy + dy;
        if (px < 0 || px > segments || py < 0 || py > segments) continue;

        const wx = (px - segments / 2) * step;
        const wy = (py - segments / 2) * step;
        const dist = Math.sqrt((wx - cx) ** 2 + (wy - cy) ** 2);

        const contribution = craterProfile(dist, crater);
        heightmap[py * (segments + 1) + px] += contribution;
      }
    }
  }

  // Apply landing zone slope
  const slopeRad = slopeDeg * Math.PI / 180;
  const slopeGradient = Math.tan(slopeRad);
  const landingZoneRadius = 25; // meters

  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const wx = (ix - segments / 2) * step;
      const wy = (iy - segments / 2) * step;
      const distFromCenter = Math.sqrt(wx * wx + wy * wy);
      const idx = iy * (segments + 1) + ix;

      if (distFromCenter < landingZoneRadius) {
        // Smooth landing pad with applied slope
        const slopeH = wx * slopeGradient;
        const blend = Math.pow(distFromCenter / landingZoneRadius, 2);
        const flatH = slopeH + fbm(wx * 0.1, wy * 0.1, seed + 500, 2, 2.0, 0.3) * 0.3;
        heightmap[idx] = flatH * (1 - blend) + heightmap[idx] * blend;
      } else if (distFromCenter < landingZoneRadius * 2) {
        // Blend zone
        const blend = (distFromCenter - landingZoneRadius) / landingZoneRadius;
        const slopeH = wx * slopeGradient;
        const flatH = slopeH + fbm(wx * 0.1, wy * 0.1, seed + 500, 2, 2.0, 0.3) * 0.3;
        heightmap[idx] = flatH * (1 - blend) + heightmap[idx] * blend;
      }
    }
  }

  return { heightmap, craters };
}

// ── Build terrain mesh ───────────────────────────────────────────────
export function buildTerrainMesh(
  heightmap: Float32Array,
  segments: number,
  size: number,
  craters: Crater[]
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const normals = geometry.attributes.normal as THREE.BufferAttribute;

  // Apply heightmap to Y
  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, heightmap[i]);
  }

  // Compute normals from heightmap
  geometry.computeVertexNormals();

  // Albedo variation based on height/slope
  const colors = new Float32Array(positions.count * 3);
  const step = size / segments;

  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const idx = iy * (segments + 1) + ix;
      const h = heightmap[idx];

      // Base regolith gray
      let albedo = 0.18 + h * 0.001;

      // Brighter ejecta near crater rims
      const wx = (ix - segments / 2) * step;
      const wy = (iy - segments / 2) * step;
      for (const crater of craters) {
        const dist = Math.sqrt((wx - crater.cx) ** 2 + (wy - crater.cy) ** 2);
        const normDist = dist / crater.radius;
        if (normDist > 0.9 && normDist < 1.8) {
          // Ejecta ray brightness
          const ejectaBright = Math.exp(-Math.pow(normDist - 1.0, 2) * 5) * 0.08;
          albedo += ejectaBright;
        }
        if (normDist < 0.7) {
          // Dark bowl
          albedo -= 0.03 * (1 - normDist / 0.7);
        }
      }

      albedo = Math.max(0.08, Math.min(0.35, albedo));
      colors[idx * 3] = albedo;
      colors[idx * 3 + 1] = albedo;
      colors[idx * 3 + 2] = albedo;
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  return mesh;
}

// ── Generate instanced boulders ──────────────────────────────────────
export function createBoulders(
  heightmap: Float32Array,
  segments: number,
  size: number,
  count: number,
  craters: Crater[],
  seed: number
): THREE.InstancedMesh {
  const rng = mulberry32(seed + 777);
  const step = size / segments;

  // Simple boulder geometry — irregular icosahedron
  const baseGeo = new THREE.IcosahedronGeometry(1, 1);
  // Randomize vertices slightly for variety
  const bPos = baseGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bPos.count; i++) {
    bPos.setX(i, bPos.getX(i) * (0.7 + rng() * 0.6));
    bPos.setY(i, bPos.getY(i) * (0.5 + rng() * 0.7));
    bPos.setZ(i, bPos.getZ(i) * (0.7 + rng() * 0.6));
  }
  baseGeo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.95,
    metalness: 0.02,
  });

  const mesh = new THREE.InstancedMesh(baseGeo, material, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let placed = 0;

  for (let attempt = 0; attempt < count * 5 && placed < count; attempt++) {
    const wx = (rng() - 0.5) * size * 0.9;
    const wy = (rng() - 0.5) * size * 0.9;

    // Higher density near crater rims
    let nearRim = false;
    for (const crater of craters) {
      const dist = Math.sqrt((wx - crater.cx) ** 2 + (wy - crater.cy) ** 2);
      const normDist = dist / crater.radius;
      if (normDist > 0.8 && normDist < 1.5) {
        nearRim = true;
        break;
      }
    }

    // 60% chance near rims, 15% chance elsewhere
    if (!nearRim && rng() > 0.15) continue;

    // Sample height
    const ix = Math.round(wx / step + segments / 2);
    const iy = Math.round(wy / step + segments / 2);
    if (ix < 0 || ix > segments || iy < 0 || iy > segments) continue;

    const h = heightmap[iy * (segments + 1) + ix];

    // Size: mostly small, some larger
    const scale = 0.2 + Math.pow(rng(), 3) * 2.5;

    dummy.position.set(wx, h + scale * 0.3, wy);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI * 2, rng() * Math.PI);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();

    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }

  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;

  return mesh;
}

// ── Sample height at world position ──────────────────────────────────
export function sampleHeight(
  heightmap: Float32Array,
  segments: number,
  size: number,
  wx: number,
  wz: number
): number {
  const step = size / segments;
  const fx = wx / step + segments / 2;
  const fy = wz / step + segments / 2;

  const ix = Math.floor(fx);
  const iy = Math.floor(fy);

  if (ix < 0 || ix >= segments || iy < 0 || iy >= segments) return 0;

  const tx = fx - ix;
  const ty = fy - iy;

  const h00 = heightmap[iy * (segments + 1) + ix];
  const h10 = heightmap[iy * (segments + 1) + ix + 1];
  const h01 = heightmap[(iy + 1) * (segments + 1) + ix];
  const h11 = heightmap[(iy + 1) * (segments + 1) + ix + 1];

  return h00 * (1 - tx) * (1 - ty) + h10 * tx * (1 - ty) + h01 * (1 - tx) * ty + h11 * tx * ty;
}

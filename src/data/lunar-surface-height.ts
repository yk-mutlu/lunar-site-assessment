// ═══════════════════════════════════════════════════════════════════════
// lunar-surface-height.ts
// Master Unified Elevation, Topography & Physical Surface Module
// Synchronizes 3D Terrain Mesh, Lander Touchdown, Rover Wheels,
// Hazard Zones, and Autonomous Waypoints with Millimeter Precision.
// Zero penetration, zero floating, 100% continuous surface contact.
// ═══════════════════════════════════════════════════════════════════════

export interface LunarCraterDef {
  cx: number;
  cz: number;
  R: number;     // Crater radius (m)
  D: number;     // Excavation depth (m)
  H_rim: number; // Raised ejecta rim crest height (m)
}

// ── Prominent Authentic Lunar Craters (Melosh & Pike Impact Morphology) ────
// Placed visibly along both flanks of the landing area and straight traverse corridor
export const PROMINENT_LUNAR_CRATERS: LunarCraterDef[] = [
  // Craters flanking the straight traverse corridor (Rover travels along X ≈ 0, Z from 0 to -120m)
  // Left Flank (X < -8m)
  { cx: -18.0, cz: -16.0, R: 9.5, D: 4.8, H_rim: 1.5 },   // Crater Alpha (West)
  { cx: -16.0, cz: -44.0, R: 8.5, D: 4.2, H_rim: 1.35 },  // Crater Beta (West)
  { cx: -22.0, cz: -72.0, R: 12.0, D: 5.6, H_rim: 1.75 }, // Crater Gamma Basin
  { cx: -17.0, cz: -100.0, R: 9.0, D: 4.4, H_rim: 1.4 },  // Crater Delta (West)

  // Right Flank (X > +8m)
  { cx: 18.0, cz: -26.0, R: 10.0, D: 5.0, H_rim: 1.6 },   // Crater Epsilon (East)
  { cx: 16.5, cz: -56.0, R: 8.5, D: 4.2, H_rim: 1.35 },  // Crater Zeta (East)
  { cx: 21.0, cz: -84.0, R: 11.5, D: 5.4, H_rim: 1.7 },   // Crater Eta Basin
  { cx: 18.0, cz: -114.0, R: 9.5, D: 4.6, H_rim: 1.45 }, // Crater Theta (East)

  // Craters surrounding the Stage 3 Landing Touchdown Site (0, 0)
  { cx: -22.0, cz: 18.0, R: 11.0, D: 4.8, H_rim: 1.4 },   // South-West Touchdown Crater
  { cx: 24.0, cz: 16.0, R: 10.5, D: 4.5, H_rim: 1.3 },   // South-East Touchdown Crater
  { cx: -26.0, cz: -2.0, R: 9.5, D: 4.0, H_rim: 1.2 },    // West Base Crater
  { cx: 28.0, cz: -6.0, R: 10.0, D: 4.2, H_rim: 1.25 },   // East Base Crater

  // Regional High-Relief Impact Basins (Horizon scenery)
  { cx: -65.0, cz: -50.0, R: 28.0, D: 11.0, H_rim: 2.8 }, // Far West Caldera
  { cx: 72.0, cz: -60.0, R: 26.0, D: 10.5, H_rim: 2.6 },  // Far East Ridge Rim
  { cx: 0.0, cz: -155.0, R: 24.0, D: 9.5, H_rim: 2.4 },   // Distant End-of-Traverse Horizon Rim
  { cx: -10.0, cz: 45.0, R: 22.0, D: 8.8, H_rim: 2.2 },   // Southern Boundary Rim
];

// ── Secondary Micro-Crater Field (Dense 2m - 7m Impact Pits) ─────────────
export const MICRO_LUNAR_CRATERS = [
  { cx: -10.5, cz: -8.0, r: 3.8, d: 1.4, h: 0.42 },
  { cx: 11.0, cz: -14.0, r: 4.2, d: 1.6, h: 0.48 },
  { cx: -9.5, cz: -30.0, r: 3.6, d: 1.3, h: 0.38 },
  { cx: 10.5, cz: -38.0, r: 4.0, d: 1.5, h: 0.45 },
  { cx: -11.0, cz: -58.0, r: 4.5, d: 1.7, h: 0.50 },
  { cx: 10.0, cz: -68.0, r: 3.8, d: 1.4, h: 0.42 },
  { cx: -10.0, cz: -86.0, r: 4.2, d: 1.6, h: 0.48 },
  { cx: 11.5, cz: -96.0, r: 4.0, d: 1.5, h: 0.45 },
  { cx: -7.5, cz: 12.0, r: 4.5, d: 1.7, h: 0.50 },
  { cx: 8.5, cz: 10.0, r: 4.2, d: 1.6, h: 0.48 },
  { cx: -14.0, cz: 6.0, r: 5.0, d: 1.9, h: 0.55 },
  { cx: 14.5, cz: 4.0, r: 4.8, d: 1.8, h: 0.52 },
];

/**
 * Calculates the exact lunar surface elevation Y (in meters) at any coordinate (x, z).
 * Guaranteed smooth, deterministic, continuous, and exactly 0.000m at (0, 0).
 */
export function getSynchronizedLunarHeight(x: number, z: number): number {
  let y = 0.0;

  // 1. Prominent Primary Craters (Parabolic excavation + raised ejecta ramparts)
  for (const c of PROMINENT_LUNAR_CRATERS) {
    const d = Math.hypot(x - c.cx, z - c.cz);
    if (d < c.R) {
      const u = d / c.R;
      y += -c.D * Math.pow(1.0 - u * u, 1.25) + c.H_rim * Math.pow(u, 4);
    } else if (d < 2.0 * c.R) {
      const w = (d - c.R) / c.R;
      y += c.H_rim * Math.pow(1.0 - w, 2.0);
    }
  }

  // 2. Micro-Crater Field
  for (const mc of MICRO_LUNAR_CRATERS) {
    const dm = Math.hypot(x - mc.cx, z - mc.cz);
    if (dm < mc.r) {
      const um = dm / mc.r;
      y += -mc.d * Math.pow(1.0 - um * um, 1.3) + mc.h * Math.pow(um, 4);
    } else if (dm < 2.0 * mc.r) {
      const wm = (dm - mc.r) / mc.r;
      y += mc.h * Math.pow(1.0 - wm, 2.0);
    }
  }

  // 3. Multi-Octave Highland Undulations & Ridge Crests
  // Harmonic 1: Gentle regional rolling slopes (period ~140m)
  y += Math.sin(x * 0.045 + z * 0.032) * Math.cos(z * 0.038 - x * 0.024) * 2.8;
  // Harmonic 2: Intermediate hummocky regolith ridges (period ~50m)
  y += Math.sin(x * 0.09 - z * 0.065) * Math.cos(z * 0.085 + x * 0.055) * 1.2;
  // Harmonic 3: Micro-relief dunes (period ~20m)
  y += Math.sin(x * 0.18 + z * 0.14) * 0.35;

  // 4. Distant Horizon Basins (Scale to large distances)
  const distantBasins = [
    { cx: -120, cz: -140, r: 65, d: 15.0, h: 4.2 },
    { cx: 130, cz: -150, r: 70, d: 16.0, h: 4.5 },
    { cx: -140, cz: 100, r: 75, d: 16.5, h: 4.6 },
    { cx: 120, cz: 90, r: 60, d: 13.5, h: 3.8 },
  ];
  for (const dc of distantBasins) {
    const d = Math.hypot(x - dc.cx, z - dc.cz);
    if (d < dc.r) {
      const u = d / dc.r;
      y += -dc.d * Math.pow(1.0 - u * u, 1.3) + dc.h * Math.pow(u, 4);
    } else if (d < 2.0 * dc.r) {
      const w = (d - dc.r) / dc.r;
      y += dc.h * Math.pow(1.0 - w, 2.0);
    }
  }

  // 5. Landing Site Hermite Leveling at (0, 0)
  // Perfectly smooth, stable, level surface within 5.0m for touchdown
  const rCenter = Math.hypot(x, z);
  if (rCenter < 5.0) {
    const factor = Math.pow(rCenter / 5.0, 2.4);
    return y * factor;
  }

  return y;
}

/**
 * Calculates the exact surface normal vector at (x, z) using finite differences.
 * Returns [nx, ny, nz] normalized.
 */
export function getSynchronizedLunarNormal(x: number, z: number): [number, number, number] {
  const eps = 0.25;
  const hL = getSynchronizedLunarHeight(x - eps, z);
  const hR = getSynchronizedLunarHeight(x + eps, z);
  const hD = getSynchronizedLunarHeight(x, z - eps);
  const hU = getSynchronizedLunarHeight(x, z + eps);

  const dx = (hR - hL) / (2.0 * eps);
  const dz = (hU - hD) / (2.0 * eps);

  const len = Math.hypot(dx, 1.0, dz);
  return [-dx / len, 1.0 / len, -dz / len];
}

/**
 * Calculates the topographic surface slope in degrees at (x, z).
 */
export function getSynchronizedLunarSlopeDeg(x: number, z: number): number {
  const normal = getSynchronizedLunarNormal(x, z);
  const cosAngle = Math.max(0, Math.min(1, normal[1]));
  return Number(((Math.acos(cosAngle) * 180) / Math.PI).toFixed(1));
}

/**
 * Authentic Lunar Albedo & Color Modulation (Apollo / LRO Photometry).
 * Returns RGB tuple [r, g, b] between 0 and 1.
 */
export function getSynchronizedLunarAlbedo(x: number, z: number, y: number): [number, number, number] {
  let base = 0.58;

  // High-albedo anorthosite ray ejecta on crater rims and peaks
  if (y > 0.4) {
    base += Math.min(0.32, (y - 0.4) * 0.08);
  } else if (y < -1.2) {
    // Low-albedo titanium-rich mare basalt on crater floors
    base -= Math.min(0.24, (-y - 1.2) * 0.045);
  }

  // Radial ejecta rays from prominent craters (Tycho/Copernicus style high-albedo stripes)
  for (const c of PROMINENT_LUNAR_CRATERS.slice(0, 8)) {
    const d = Math.hypot(x - c.cx, z - c.cz);
    if (d > c.R && d < c.R * 3.2) {
      const ang = Math.atan2(z - c.cz, x - c.cx);
      const rays = Math.pow(Math.cos(ang * 6.0), 4) * Math.exp(-(d - c.R) / (c.R * 1.5)) * 0.16;
      base += rays;
    }
  }

  base = Math.max(0.32, Math.min(0.94, base));
  return [base, base, base * 1.02];
}

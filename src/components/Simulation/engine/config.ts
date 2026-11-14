// ═══════════════════════════════════════════════════════════════════════
// Lunar Landing Simulation — Configuration & Constants
// ═══════════════════════════════════════════════════════════════════════

export const LUNAR_G = 1.62; // m/s² lunar surface gravity
export const PHYSICS_DT = 1 / 120; // 120 Hz fixed timestep

// ── Lander Profiles ──────────────────────────────────────────────────
export interface LanderProfile {
  id: string;
  name: string;
  dryMassKg: number;
  fuelMassKg: number;
  thrustN: number;        // max engine thrust
  ispS: number;           // specific impulse (seconds)
  cgHeightM: number;      // center of gravity height above footpad plane
  legRadiusM: number;     // horizontal distance from CG axis to footpad
  legCount: number;
  nozzleDiameterM: number;
  rcsClusterCount: number;
  rcsThrustN: number;
  modelScale: number;
}

export const LANDER_PROFILES: Record<string, LanderProfile> = {
  clps_medium: {
    id: 'clps_medium',
    name: 'CLPS Medium (Nova-C class)',
    dryMassKg: 700,
    fuelMassKg: 1100,
    thrustN: 3100,
    ispS: 316,
    cgHeightM: 2.0,
    legRadiusM: 2.2,
    legCount: 4,
    nozzleDiameterM: 0.3,
    rcsClusterCount: 12,
    rcsThrustN: 22,
    modelScale: 1.0,
  },
  artemis_hls: {
    id: 'artemis_hls',
    name: 'Artemis HLS (Starship class)',
    dryMassKg: 8500,
    fuelMassKg: 6500,
    thrustN: 66000,
    ispS: 363,
    cgHeightM: 8.0,
    legRadiusM: 5.5,
    legCount: 4,
    nozzleDiameterM: 1.2,
    rcsClusterCount: 16,
    rcsThrustN: 440,
    modelScale: 2.8,
  },
  robotic_scout: {
    id: 'robotic_scout',
    name: 'Micro Scout',
    dryMassKg: 50,
    fuelMassKg: 70,
    thrustN: 500,
    ispS: 290,
    cgHeightM: 0.8,
    legRadiusM: 0.9,
    legCount: 4,
    nozzleDiameterM: 0.12,
    rcsClusterCount: 8,
    rcsThrustN: 5,
    modelScale: 0.5,
  },
};

// ── Simulation Config ────────────────────────────────────────────────
export interface SimulationConfig {
  slopeDeg: number;
  tipoverDeg: number;
  massKg: number;
  maxLandingSpeed: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  landerProfile: string;
  terrainSeed: number;
  heightmapData?: Float32Array;
  initialAltitudeM: number;
  initialVerticalSpeedMs: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  slopeDeg: 3.2,
  tipoverDeg: 8.0,
  massKg: 1800,
  maxLandingSpeed: 2.2,
  sunElevationDeg: 12,
  sunAzimuthDeg: 45,
  landerProfile: 'clps_medium',
  terrainSeed: 42,
  initialAltitudeM: 3000,
  initialVerticalSpeedMs: 65,
};

// ── Descent Phases ───────────────────────────────────────────────────
export type DescentPhase = 'BRAKING' | 'APPROACH' | 'TERMINAL' | 'TOUCHDOWN' | 'SETTLED';

// ── Failure Types ────────────────────────────────────────────────────
export type FailureType =
  | 'none'
  | 'crash_speed'        // excessive touchdown velocity
  | 'tipover'            // slope exceeds stability
  | 'fuel_starvation'    // ran out of fuel
  | 'insufficient_thrust' // TWR < 1
  | 'radar_lock_loss';   // drift + wrong altitude

// ── Simulation Result ────────────────────────────────────────────────
export interface SimulationResult {
  success: boolean;
  failureType: FailureType;
  cause: string;
  touchdownVelocityMs: number;
  slopeDeg: number;
  fuelRemainingPct: number;
  cgAngleDeg: number;
  lateralDeviationM: number;
  safetyMarginPct: number;
  maxGForce: number;
  flightTimeS: number;
}

// ── Camera Modes ─────────────────────────────────────────────────────
export type CameraMode = 'cinematic' | 'free_orbit' | 'onboard';

// ── Quality Settings ─────────────────────────────────────────────────
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityConfig {
  terrainSegments: number;
  terrainSize: number;
  shadowMapSize: number;
  craterCount: number;
  boulderCount: number;
  particleCount: number;
  starCount: number;
  enablePCF: boolean;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityConfig> = {
  low: {
    terrainSegments: 128,
    terrainSize: 600,
    shadowMapSize: 1024,
    craterCount: 40,
    boulderCount: 50,
    particleCount: 500,
    starCount: 300,
    enablePCF: false,
  },
  medium: {
    terrainSegments: 256,
    terrainSize: 800,
    shadowMapSize: 2048,
    craterCount: 80,
    boulderCount: 150,
    particleCount: 1500,
    starCount: 600,
    enablePCF: true,
  },
  high: {
    terrainSegments: 512,
    terrainSize: 1000,
    shadowMapSize: 4096,
    craterCount: 150,
    boulderCount: 300,
    particleCount: 3000,
    starCount: 1000,
    enablePCF: true,
  },
  ultra: {
    terrainSegments: 512,
    terrainSize: 1200,
    shadowMapSize: 4096,
    craterCount: 250,
    boulderCount: 500,
    particleCount: 5000,
    starCount: 1500,
    enablePCF: true,
  },
};

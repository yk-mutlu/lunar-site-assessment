// ═══════════════════════════════════════════════════════════════════════
// Physics Engine — 120Hz fixed timestep, RK4-like integration
// Tsiolkovsky, PID guidance, failure detection
// ═══════════════════════════════════════════════════════════════════════

import { LUNAR_G, PHYSICS_DT, LANDER_PROFILES } from './config';
import type { SimulationConfig, DescentPhase, FailureType, SimulationResult, LanderProfile } from './config';

export interface PhysicsState {
  // Position (meters) — Y is up
  posX: number;
  posY: number; // altitude above terrain
  posZ: number;

  // Velocity (m/s)
  velX: number;
  velY: number; // negative = descending
  velZ: number;

  // Attitude (radians)
  pitch: number;
  roll: number;
  yaw: number;

  // Angular velocity
  pitchRate: number;
  rollRate: number;
  yawRate: number;

  // Mass
  totalMassKg: number;
  fuelMassKg: number;

  // Engine
  throttle: number; // 0-1
  gimbalX: number;  // radians
  gimbalZ: number;

  // Phase
  phase: DescentPhase;
  timeS: number;
  failure: FailureType;
  isComplete: boolean;

  // Tracking
  maxGForce: number;
  lateralDevM: number;
}

// ── Initial state from config ────────────────────────────────────────
export function createInitialState(config: SimulationConfig): PhysicsState {
  const profile = LANDER_PROFILES[config.landerProfile] || LANDER_PROFILES.clps_medium;

  // Calculate total mass: if config.massKg differs from profile default, adjust fuel proportion
  const nominalFuelMass = Math.max(0, config.massKg - profile.dryMassKg);
  const fuelFactor = typeof config.initialFuelPct === 'number' ? Math.max(0.1, config.initialFuelPct / 100) : 1.0;
  const fuelMass = nominalFuelMass * fuelFactor;
  const totalMass = profile.dryMassKg + fuelMass;

  return {
    posX: 0,
    posY: config.initialAltitudeM,
    posZ: 0,

    velX: 2.0, // small initial horizontal velocity to null
    velY: -config.initialVerticalSpeedMs,
    velZ: 0.5,

    pitch: 0,
    roll: 0,
    yaw: 0,
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,

    totalMassKg: totalMass,
    fuelMassKg: fuelMass,

    throttle: 0,
    gimbalX: 0,
    gimbalZ: 0,

    phase: 'BRAKING',
    timeS: 0,
    failure: 'none',
    isComplete: false,

    maxGForce: 0,
    lateralDevM: 0,
  };
}

// ── Guidance controller ──────────────────────────────────────────────
function computeGuidance(state: PhysicsState, config: SimulationConfig, profile: LanderProfile): {
  throttle: number;
  gimbalX: number;
  gimbalZ: number;
  targetPhase: DescentPhase;
} {
  const alt = state.posY;
  const vy = state.velY;
  const vx = state.velX;
  const vz = state.velZ;
  const horizontalV = Math.sqrt(vx * vx + vz * vz);

  // Phase transitions
  let targetPhase: DescentPhase = state.phase;
  if (alt > 500) targetPhase = 'BRAKING';
  else if (alt > 100) targetPhase = 'APPROACH';
  else if (alt > 0.5) targetPhase = 'TERMINAL';
  else targetPhase = 'TOUCHDOWN';

  // Target velocity profile
  let targetVy: number;
  if (alt > 500) {
    // Braking: gradually reduce speed
    targetVy = -Math.max(15, alt * 0.03);
  } else if (alt > 100) {
    // Approach: moderate descent
    targetVy = -Math.max(5, alt * 0.04);
  } else if (alt > 10) {
    // Terminal: slow approach
    targetVy = -Math.max(1.5, alt * 0.08);
  } else {
    // Final: very slow
    targetVy = -Math.max(0.5, alt * 0.15);
  }

  // PD controller for vertical velocity
  const vyError = targetVy - vy;
  const kP = 2.5;
  const kD = 0.8;

  // Required acceleration to track target velocity
  const aRequired = LUNAR_G + kP * vyError + kD * 0; // simplified
  const thrustAccel = profile.thrustN / state.totalMassKg;

  // Throttle command
  let throttle = Math.max(0, Math.min(1, aRequired / thrustAccel));

  // At high altitude, reduce thrust to let gravity brake first
  if (alt > 1500 && vy < -30) {
    throttle = Math.max(0.1, throttle * 0.6);
  }

  // Horizontal velocity nulling via gimbal
  const gimbalGain = 0.05;
  const gimbalX = -Math.max(-0.15, Math.min(0.15, vz * gimbalGain));
  const gimbalZ = Math.max(-0.15, Math.min(0.15, vx * gimbalGain));

  return { throttle, gimbalX, gimbalZ, targetPhase };
}

// ── Step physics ─────────────────────────────────────────────────────
export function stepPhysics(
  state: PhysicsState,
  config: SimulationConfig,
  dt: number = PHYSICS_DT
): PhysicsState {
  if (state.isComplete) return state;

  const profile = LANDER_PROFILES[config.landerProfile] || LANDER_PROFILES.clps_medium;
  const next = { ...state };

  // Check TWR < 1 failure
  const maxAccel = profile.thrustN / state.totalMassKg;
  if (maxAccel < LUNAR_G && state.fuelMassKg > 0 && state.posY > 50) {
    next.failure = 'insufficient_thrust';
    // Let it continue falling with max throttle
  }

  // Guidance
  const guidance = computeGuidance(state, config, profile);
  next.throttle = guidance.throttle;
  next.gimbalX = guidance.gimbalX;
  next.gimbalZ = guidance.gimbalZ;
  next.phase = guidance.targetPhase;

  // Fuel consumption (Tsiolkovsky)
  const effectiveThrottle = next.fuelMassKg > 0 ? next.throttle : 0;
  const thrustForce = profile.thrustN * effectiveThrottle;
  const exhaustVelocity = profile.ispS * 9.80665; // ve = Isp * g0
  const mdot = thrustForce / exhaustVelocity; // mass flow rate
  const fuelUsed = mdot * dt;

  // Fuel starvation check
  if (next.fuelMassKg <= 0 && state.posY > 10) {
    next.fuelMassKg = 0;
    if (next.failure === 'none') {
      next.failure = 'fuel_starvation';
    }
  } else {
    next.fuelMassKg = Math.max(0, state.fuelMassKg - fuelUsed);
    next.totalMassKg = profile.dryMassKg + next.fuelMassKg;
  }

  // Thrust acceleration (accounting for gimbal)
  const accelMag = next.fuelMassKg > 0 ? thrustForce / next.totalMassKg : 0;
  const accelY = accelMag * Math.cos(next.gimbalX) * Math.cos(next.gimbalZ);
  const accelX = -accelMag * Math.sin(next.gimbalZ);
  const accelZ = accelMag * Math.sin(next.gimbalX);

  // Semi-implicit Euler integration
  next.velY = state.velY + (accelY - LUNAR_G) * dt;
  next.velX = state.velX + accelX * dt;
  next.velZ = state.velZ + accelZ * dt;

  next.posY = state.posY + next.velY * dt;
  next.posX = state.posX + next.velX * dt;
  next.posZ = state.posZ + next.velZ * dt;

  // Attitude (simple model — follow gimbal with damping)
  const attKp = 3.0, attKd = 2.0;
  next.pitchRate = state.pitchRate + (-attKp * state.pitch - attKd * state.pitchRate + next.gimbalX * 2) * dt;
  next.rollRate = state.rollRate + (-attKp * state.roll - attKd * state.rollRate + next.gimbalZ * 2) * dt;
  next.pitch = state.pitch + next.pitchRate * dt;
  next.roll = state.roll + next.rollRate * dt;

  // Small wobble from thrust variations
  if (effectiveThrottle > 0.1) {
    const wobbleAmp = 0.002 * effectiveThrottle;
    next.pitch += Math.sin(state.timeS * 13.7) * wobbleAmp;
    next.roll += Math.cos(state.timeS * 11.3) * wobbleAmp;
  }

  // Track g-force
  const totalAccel = Math.sqrt(
    (accelX) ** 2 + (accelY - LUNAR_G) ** 2 + (accelZ) ** 2
  );
  const gForce = totalAccel / 9.80665;
  next.maxGForce = Math.max(state.maxGForce, gForce);

  // Lateral deviation tracking
  next.lateralDevM = Math.sqrt(next.posX ** 2 + next.posZ ** 2);

  // Time
  next.timeS = state.timeS + dt;

  // ── Touchdown detection ──────────────────────────────────────
  if (next.posY <= 0) {
    next.posY = 0;
    next.isComplete = true;
    next.phase = 'TOUCHDOWN';

    const touchdownSpeed = Math.abs(next.velY);
    const horizontalSpeed = Math.sqrt(next.velX ** 2 + next.velZ ** 2);

    // Check crash_speed failure
    if (next.failure === 'none' && touchdownSpeed > config.maxLandingSpeed) {
      next.failure = 'crash_speed';
    }

    // Check tipover
    if (next.failure === 'none') {
      // Static stability: atan(cgHeight / legRadius)
      const staticLimit = Math.atan2(profile.cgHeightM, profile.legRadiusM) * 180 / Math.PI;
      // Dynamic contribution from lateral velocity
      const dynamicAngle = Math.atan2(horizontalSpeed * 0.5, LUNAR_G) * 180 / Math.PI;
      const effectiveSlope = config.slopeDeg + dynamicAngle;

      if (effectiveSlope > config.tipoverDeg) {
        next.failure = 'tipover';
      }
    }

    // Check fuel starvation crash (if it ran out at high altitude)
    if (next.failure === 'fuel_starvation' && touchdownSpeed > config.maxLandingSpeed) {
      next.failure = 'fuel_starvation'; // keep this as primary cause
    }

    // Stop velocities
    next.velY = 0;
    next.velX = 0;
    next.velZ = 0;
  }

  // Radar lock loss simulation — random at very low altitude with high horizontal speed
  if (next.failure === 'none' && next.posY < 30 && next.posY > 5) {
    const horizontalSpeed = Math.sqrt(next.velX ** 2 + next.velZ ** 2);
    if (horizontalSpeed > 8) {
      // Simulated radar lock loss at this scenario — skip for now
      // only trigger if explicitly set up in config
    }
  }

  return next;
}

// ── Generate result from final state ─────────────────────────────────
export function generateResult(state: PhysicsState, config: SimulationConfig): SimulationResult {
  const profile = LANDER_PROFILES[config.landerProfile] || LANDER_PROFILES.clps_medium;
  const totalFuel = config.massKg - profile.dryMassKg;
  const fuelPct = totalFuel > 0 ? (state.fuelMassKg / totalFuel) * 100 : 0;

  const touchdownV = Math.abs(state.velY);
  const safetyMargin = state.failure === 'none'
    ? Math.max(0, 100 - (touchdownV / config.maxLandingSpeed) * 50 - (config.slopeDeg / config.tipoverDeg) * 50)
    : 0;

  let cause = '';
  switch (state.failure) {
    case 'none':
      cause = `Touchdown confirmed nominal. Contact velocity: ${touchdownV.toFixed(2)} m/s. Surface slope: ${config.slopeDeg.toFixed(1)}°. Engine cutoff verified.`;
      break;
    case 'crash_speed':
      cause = `STRUCTURAL COLLAPSE: Vertical touchdown speed (${touchdownV.toFixed(1)} m/s) exceeded shock strut tolerance (${config.maxLandingSpeed} m/s).`;
      break;
    case 'tipover':
      cause = `DYNAMIC TIP-OVER: Local terrain slope (${config.slopeDeg.toFixed(1)}°) exceeded static center-of-mass stability limit (${config.tipoverDeg.toFixed(1)}°).`;
      break;
    case 'fuel_starvation':
      cause = `FUEL EXHAUSTION: Propellant depleted at ${state.posY.toFixed(0)}m altitude. Free-fall impact ensued.`;
      break;
    case 'insufficient_thrust':
      cause = `INSUFFICIENT THRUST: Thrust-to-weight ratio < 1.0. Lander could not arrest descent rate.`;
      break;
    case 'radar_lock_loss':
      cause = `LOSS OF TRN LOCK: Excessive horizontal drift rate caused loss of LiDAR altimeter lock.`;
      break;
  }

  return {
    success: state.failure === 'none',
    failureType: state.failure,
    cause,
    touchdownVelocityMs: touchdownV,
    slopeDeg: config.slopeDeg,
    fuelRemainingPct: fuelPct,
    cgAngleDeg: Math.atan2(profile.cgHeightM, profile.legRadiusM) * 180 / Math.PI,
    lateralDeviationM: state.lateralDevM,
    safetyMarginPct: safetyMargin,
    maxGForce: state.maxGForce,
    flightTimeS: state.timeS,
  };
}

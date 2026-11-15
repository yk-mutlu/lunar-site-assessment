// ═══════════════════════════════════════════════════════════════════════
// earth-launch-service.ts
// Comprehensive Earth Launch, Space Weather, Radiation & 
// Lunar Robot Calculation Engine (NASA Space Apps / Artemis Standard)
// ═══════════════════════════════════════════════════════════════════════

export interface LaunchSite {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  elevationM: number;
  supportedLaunchVehicles: string[];
  description: string;
  isCustom?: boolean;
}

export const LAUNCH_SITES: LaunchSite[] = [
  {
    id: "ksc_lc39b",
    name: "Kennedy Space Center (LC-39B)",
    location: "Cape Canaveral, Florida, USA",
    lat: 28.627,
    lng: -80.621,
    elevationM: 3,
    supportedLaunchVehicles: ["SLS (Artemis III)", "Falcon Heavy", "Vulcan Centaur"],
    description: "NASA primary crewed Artemis launch complex subject to Atlantic coastal maritime weather.",
  },
  {
    id: "starbase_tx",
    name: "Starbase Orbital Pad A",
    location: "Boca Chica, Texas, USA",
    lat: 25.997,
    lng: -97.156,
    elevationM: 2,
    supportedLaunchVehicles: ["Starship / Super Heavy (HLS)"],
    description: "SpaceX Artemis Human Landing System (HLS) orbital launch and cryogenic propellant depot.",
  },
  {
    id: "csg_kourou",
    name: "Guiana Space Centre (ELA-4)",
    location: "Kourou, French Guiana",
    lat: 5.239,
    lng: -52.768,
    elevationM: 15,
    supportedLaunchVehicles: ["Ariane 6", "Vega-C"],
    description: "Equatorial spaceport maximizing Earth rotational velocity boost for heavy translunar payloads.",
  },
  {
    id: "vandenberg_slc4e",
    name: "Vandenberg Space Force Base (SLC-4E)",
    location: "California, USA",
    lat: 34.632,
    lng: -120.611,
    elevationM: 110,
    supportedLaunchVehicles: ["Falcon 9", "Atlas V"],
    description: "Pacific coastal launch complex for polar orbital trajectories and high-inclination lunar transfers.",
  },
];

// ── Terrestrial Atmospheric Weather Data ─────────────────────────────
export interface EarthWeatherData {
  siteId: string;
  temperatureC: number;
  surfacePressureHpa: number;
  airDensityKgM3: number;       // calculated rho = P / (R * T)
  windSpeedMs: number;          // surface wind (m/s)
  windGustMs: number;           // gusts (m/s)
  windDirectionDeg: number;
  upperWindShearMsPerKm: number;// Max-Q altitudinal wind gradient
  cloudCoverPct: number;
  precipitationMm: number;
  lightningRiskPct: number;
  relativeHumidityPct: number;
  isLive: boolean;
  timestamp: string;
}

// ── Space Weather & Heliophysics Data (NOAA SWPC Standards) ───────────
export interface SpaceWeatherData {
  solarWindSpeedKms: number;    // 300 - 800 km/s (nominal ~400)
  solarWindDensityPcm3: number; // protons/cm3 (nominal 3 - 10)
  planetaryKpIndex: number;     // 0.0 - 9.0 (Geomagnetic storm index)
  geomagneticStormClass: "G0 (Quiet)" | "G1 (Minor)" | "G2 (Moderate)" | "G3 (Strong)" | "G4 (Severe)" | "G5 (Extreme)" | string;
  solarFlareClass: "A" | "B" | "C" | "M" | "X";
  solarFlareIntensity: string;  // e.g. "X1.4", "M3.2", "C2.1"
  solarXrayFluxWm2: number;     // Watts/m2 in 0.1-0.8 nm
  protonFluxSfu: number;        // Particles > 10 MeV / (cm2-s-sr)
  radioBlackoutLevel: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  isLive: boolean;
  timestamp: string;
}

// ── Radiation Dosimetry & Van Allen Belts ─────────────────────────────
export interface RadiationEnvironmentData {
  innerBeltDoseRateMsvHr: number;  // Trapped high-energy protons (100-400 MeV)
  outerBeltDoseRateMsvHr: number;  // Relativistic electrons (1-10 MeV)
  cosmicRayBackgroundMsvHr: number;// Galactic Cosmic Rays (GCR)
  totalTraversedDoseMsv: number;   // Cumulative trans-lunar dose
  singleEventUpsetRiskPct: number; // Avionics bit-flip probability per 1000 hrs
  radiationHardeningMarginPct: number; // Vehicle electronic shield health
}

// ── Launch Commit Criteria (LCC) Evaluation ──────────────────────────
export interface LaunchCheckItem {
  id: string;
  name: string;
  value: string;
  limit: string;
  status: "GO" | "MARGINAL" | "NO-GO";
  description: string;
}

export interface LaunchEvaluationResult {
  overallStatus: "GO" | "HOLD" | "ABORT";
  launchScorePct: number;
  checks: LaunchCheckItem[];
  narrativeSummary: string;
}

// ── Impact Calculations on the Lunar Landing Robot / Lander ──────────
export interface LunarRobotMissionCalculations {
  // 1. Delta-V & Fuel Budget Impact
  launchAtmosphericLossDVMs: number;    // Extra delta-v lost due to wind shear & drag
  transLunarInjectionDeltaVMs: number;  // Standard TLI requirement (~3150 m/s)
  remainingFuelForLunarDescentPct: number; // Adjusted lander fuel margin (baseline 100%)
  hoverTimeAvailableSeconds: number;   // Hover capability at terminal descent

  // 2. Radiation & Avionics Impact on Landing Sensors
  sensorNoiseDegradationPct: number;    // LIDAR / TRN optical SNR degradation
  radarAltimeterVarianceM: number;      // Uncertainty in altitude measurement (+/- meters)
  starTrackerConfidencePct: number;     // Autonomous attitude determination fidelity
  rebootRiskDuringDescentPct: number;   // Single Event Upset flight computer reset risk

  // 3. Communications & Autonomous Guidance Strategy
  dsnSignalToNoiseDb: number;           // Earth direct line-of-sight signal quality
  autonomousDecisionLevel: "STANDBY" | "SUPERVISED" | "FULL_AUTONOMOUS";
  landingSafetyMarginPct: number;       // Overall calculated landing success modifier

  // 4. Calibrated Constraints for the Lunar Landing Engine
  recommendedMaxSlopeDeg: number;       // Adjusted max slope (tightened if sensors noisy)
  safeTouchdownVelocityLimitMs: number; // Adjusted descent speed limit (m/s)
  computedLandingTargetToleranceM: number; // Landing ellipse radius (m)
}

// ── Presets & Weather Scenarios for Testing / Demonstration ───────────
export interface LaunchScenarioPreset {
  id: string;
  name: string;
  description: string;
  weather: Omit<EarthWeatherData, "siteId" | "isLive" | "timestamp">;
  spaceWeather: Omit<SpaceWeatherData, "isLive" | "timestamp">;
}

export const LAUNCH_SCENARIO_PRESETS: LaunchScenarioPreset[] = [
  {
    id: "nominal_artemis",
    name: "Nominal Artemis Launch Window (Optimal)",
    description: "Calm Atlantic wind, low Kp geomagnetic index, and minimal solar particle radiation. Standard mission propellant reserves.",
    weather: {
      temperatureC: 24.5,
      surfacePressureHpa: 1014.2,
      airDensityKgM3: 1.188,
      windSpeedMs: 4.2,
      windGustMs: 6.5,
      windDirectionDeg: 120,
      upperWindShearMsPerKm: 1.8,
      cloudCoverPct: 15,
      precipitationMm: 0.0,
      lightningRiskPct: 2,
      relativeHumidityPct: 62,
    },
    spaceWeather: {
      solarWindSpeedKms: 385,
      solarWindDensityPcm3: 4.8,
      planetaryKpIndex: 1.7,
      geomagneticStormClass: "G0 (Quiet)",
      solarFlareClass: "B",
      solarFlareIntensity: "B4.2",
      solarXrayFluxWm2: 4.2e-7,
      protonFluxSfu: 1.1,
      radioBlackoutLevel: "R0",
    },
  },
  {
    id: "high_wind_shear",
    name: "High Wind Shear & Max-Q Aerodynamic Load",
    description: "Strong surface and tropospheric wind shear. Guidance thrusters consume auxiliary delta-v, reducing descent hover reserves.",
    weather: {
      temperatureC: 18.0,
      surfacePressureHpa: 1008.0,
      airDensityKgM3: 1.205,
      windSpeedMs: 13.8,
      windGustMs: 18.2,
      windDirectionDeg: 280,
      upperWindShearMsPerKm: 6.4,
      cloudCoverPct: 65,
      precipitationMm: 1.2,
      lightningRiskPct: 18,
      relativeHumidityPct: 78,
    },
    spaceWeather: {
      solarWindSpeedKms: 420,
      solarWindDensityPcm3: 6.2,
      planetaryKpIndex: 2.3,
      geomagneticStormClass: "G0 (Quiet)",
      solarFlareClass: "C",
      solarFlareIntensity: "C2.8",
      solarXrayFluxWm2: 2.8e-6,
      protonFluxSfu: 3.5,
      radioBlackoutLevel: "R0",
    },
  },
  {
    id: "severe_solar_storm",
    name: "Severe Solar Particle Event & High Radiation (X-Class Flare)",
    description: "Solar flare and geomagnetic disturbance (G4/S3). High energetic proton flux elevates single-event upset risks for terrain relative navigation.",
    weather: {
      temperatureC: 22.0,
      surfacePressureHpa: 1012.0,
      airDensityKgM3: 1.192,
      windSpeedMs: 5.5,
      windGustMs: 8.0,
      windDirectionDeg: 90,
      upperWindShearMsPerKm: 2.2,
      cloudCoverPct: 20,
      precipitationMm: 0.0,
      lightningRiskPct: 4,
      relativeHumidityPct: 58,
    },
    spaceWeather: {
      solarWindSpeedKms: 740,
      solarWindDensityPcm3: 28.5,
      planetaryKpIndex: 7.3,
      geomagneticStormClass: "G4 (Severe)",
      solarFlareClass: "X",
      solarFlareIntensity: "X2.4",
      solarXrayFluxWm2: 2.4e-4,
      protonFluxSfu: 320.0,
      radioBlackoutLevel: "R3",
    },
  },
];

// ── Physics & Mathematical Formulation Functions ─────────────────────

/**
 * Air density from ideal gas law: rho = P / (R_spec * T_kelvin)
 */
export function calculateAirDensity(pressureHpa: number, tempC: number): number {
  const pPa = pressureHpa * 100;
  const tK = tempC + 273.15;
  const rSpecific = 287.058; // J/(kg·K) for dry air
  return Number((pPa / (rSpecific * tK)).toFixed(3));
}

/**
 * Evaluates Launch Commit Criteria (LCC) based on NASA Artemis / FAA Spaceport rules
 */
export function evaluateLaunchCommitCriteria(
  weather: EarthWeatherData,
  spaceWeather: SpaceWeatherData
): LaunchEvaluationResult {
  const checks: LaunchCheckItem[] = [];

  // 1. Surface Wind Rule (< 15.4 m/s or 30 kts)
  const windPass = weather.windSpeedMs < 12.0;
  const windMarginal = weather.windSpeedMs >= 12.0 && weather.windSpeedMs <= 15.4;
  checks.push({
    id: "wind_surface",
    name: "Surface Wind Speed",
    value: `${weather.windSpeedMs.toFixed(1)} m/s (Gusts: ${weather.windGustMs.toFixed(1)} m/s)`,
    limit: "< 15.4 m/s (30 kts)",
    status: windPass ? "GO" : windMarginal ? "MARGINAL" : "NO-GO",
    description: "Structural bending and toppling moments on launch tower and umbilical propellant arms.",
  });

  // 2. High-Altitude Wind Shear / Max-Q Load (< 5.0 m/s per km)
  const shearPass = weather.upperWindShearMsPerKm < 4.0;
  const shearMarginal = weather.upperWindShearMsPerKm >= 4.0 && weather.upperWindShearMsPerKm <= 5.5;
  checks.push({
    id: "wind_shear",
    name: "Upper Wind Shear (Max-Q)",
    value: `${weather.upperWindShearMsPerKm.toFixed(1)} m/s / km`,
    limit: "< 5.0 m/s / km",
    status: shearPass ? "GO" : shearMarginal ? "MARGINAL" : "NO-GO",
    description: "Aerodynamic bending moment and aerodynamic pressure product (q-alpha) during transonic climb.",
  });

  // 3. Lightning & Cloud Triboelectrification
  const lightningPass = weather.lightningRiskPct < 10 && weather.precipitationMm === 0;
  const lightningMarginal = weather.lightningRiskPct >= 10 && weather.lightningRiskPct < 25;
  checks.push({
    id: "lightning_rule",
    name: "Lightning & Cumulus Rule",
    value: `Risk: ${weather.lightningRiskPct}% · Precip: ${weather.precipitationMm} mm`,
    limit: "Risk < 15%, No Precip",
    status: lightningPass ? "GO" : lightningMarginal ? "MARGINAL" : "NO-GO",
    description: "Ionized rocket exhaust plume triggering natural or induced atmospheric electrical discharge.",
  });

  // 4. Space Weather: Geomagnetic Kp Index (< 6.0)
  const kpPass = spaceWeather.planetaryKpIndex < 4.0;
  const kpMarginal = spaceWeather.planetaryKpIndex >= 4.0 && spaceWeather.planetaryKpIndex < 6.0;
  checks.push({
    id: "geomagnetic_kp",
    name: "Geomagnetic Storm Index (Kp)",
    value: `Kp ${spaceWeather.planetaryKpIndex.toFixed(1)} (${spaceWeather.geomagneticStormClass})`,
    limit: "Kp < 6.0 (G0 - G2)",
    status: kpPass ? "GO" : kpMarginal ? "MARGINAL" : "NO-GO",
    description: "Ionospheric scintillation, telemetry signal attenuation, and radar tracking disruption.",
  });

  // 5. Solar Flare & Energetic Proton Flux
  const flarePass = spaceWeather.solarFlareClass !== "X" && spaceWeather.protonFluxSfu < 50;
  const flareMarginal = spaceWeather.solarFlareClass === "M" || (spaceWeather.protonFluxSfu >= 50 && spaceWeather.protonFluxSfu < 100);
  checks.push({
    id: "solar_radiation",
    name: "Solar Flare & Proton Flux",
    value: `${spaceWeather.solarFlareIntensity} · Protons: ${spaceWeather.protonFluxSfu.toFixed(1)} sfu`,
    limit: "Flare < X1.0, Flux < 100 sfu",
    status: flarePass ? "GO" : flareMarginal ? "MARGINAL" : "NO-GO",
    description: "Single Event Upsets (SEU) in flight avionics and sensor noise on optical landing cameras.",
  });

  const hasNoGo = checks.some((c) => c.status === "NO-GO");
  const hasMarginal = checks.some((c) => c.status === "MARGINAL");

  let overallStatus: "GO" | "HOLD" | "ABORT" = "GO";
  let launchScorePct = 95;

  if (hasNoGo) {
    overallStatus = "HOLD";
    launchScorePct = 35;
  } else if (hasMarginal) {
    overallStatus = "GO";
    launchScorePct = 75;
  }

  let narrativeSummary = "All atmospheric and heliophysical launch commit criteria are green. Nominal translunar injection flight profile computed.";
  if (overallStatus === "HOLD") {
    narrativeSummary = "Launch commit criteria threshold exceeded. Countdown is in HOLD pending weather rule compliance.";
  } else if (hasMarginal) {
    narrativeSummary = "Marginal atmospheric conditions detected; auxiliary propellant margin recommended for course correction burns.";
  }

  return {
    overallStatus,
    launchScorePct,
    checks,
    narrativeSummary,
  };
}

/**
 * Calculates Van Allen Belt radiation dose and total mission exposure
 */
export function calculateRadiationEnvironment(
  spaceWeather: SpaceWeatherData
): RadiationEnvironmentData {
  // Baseline quiet conditions
  const gcrBaseMsvHr = 0.045; // ~1.1 mSv/day deep space GCR background
  const kpFactor = Math.max(1.0, spaceWeather.planetaryKpIndex / 2.0);
  const protonStormFactor = Math.max(1.0, Math.log10(Math.max(1, spaceWeather.protonFluxSfu)));

  // Inner Belt (trapped protons ~3000 km altitude, peak dose during quick transit ~30-45 mins)
  const innerBeltDoseRate = 18.5 * kpFactor * (spaceWeather.solarFlareClass === "X" ? 2.5 : 1.0);

  // Outer Belt (relativistic electrons ~20000 km altitude, transit ~2-3 hours)
  const outerBeltDoseRate = 8.2 * kpFactor * protonStormFactor;

  // Transit total estimate (45 min inner, 2.5 hr outer, 70 hr cis-lunar coast)
  const innerTransitDose = (innerBeltDoseRate * 0.75);
  const outerTransitDose = (outerBeltDoseRate * 2.5);
  const cisLunarCoastDose = (gcrBaseMsvHr * 70.0 * kpFactor);
  const totalTraversedDoseMsv = Number((innerTransitDose + outerTransitDose + cisLunarCoastDose).toFixed(2));

  // Single event upset risk per 1000 hrs on space-grade rad-hardened ASIC
  const seuRisk = Number(Math.min(45, 1.2 * kpFactor * protonStormFactor).toFixed(1));

  // Remaining electronic shield integrity
  const shieldMargin = Number(Math.max(60, 100 - totalTraversedDoseMsv * 0.45).toFixed(1));

  return {
    innerBeltDoseRateMsvHr: Number(innerBeltDoseRate.toFixed(2)),
    outerBeltDoseRateMsvHr: Number(outerBeltDoseRate.toFixed(2)),
    cosmicRayBackgroundMsvHr: Number(gcrBaseMsvHr.toFixed(3)),
    totalTraversedDoseMsv,
    singleEventUpsetRiskPct: seuRisk,
    radiationHardeningMarginPct: shieldMargin,
  };
}

/**
 * Computes how Earth launch conditions & space weather feed into the Lunar Landing Robot's constraints
 */
export function computeLunarRobotMissionImpact(
  weather: EarthWeatherData,
  spaceWeather: SpaceWeatherData,
  radiation: RadiationEnvironmentData,
  baseSlopeDeg: number = 4.5
): LunarRobotMissionCalculations {
  // 1. Delta-V penalty from Earth atmospheric drag & steering losses
  // Baseline nominal loss is ~1200 m/s during Earth ascent (gravity loss + drag)
  // Additional penalty caused by wind gusts and upper wind shear:
  const windPenaltyMs = Math.round(weather.windSpeedMs * 1.8 + weather.upperWindShearMsPerKm * 8.5);
  const atmosphericLossDVMs = 1250 + windPenaltyMs;
  const standardTLIDeltaV = 3150; // m/s to escape Earth and inject into lunar transfer

  // Every 25 m/s extra atmospheric steering loss penalizes lunar lander reserve by ~0.8%
  const fuelPenaltyPct = Number(((windPenaltyMs / 25) * 0.8).toFixed(1));
  const remainingFuelPct = Math.max(88, Number((100 - fuelPenaltyPct).toFixed(1)));

  // Available hover time at 15m terminal altitude (nominal 45 seconds for a medium lander)
  const hoverTimeSeconds = Math.max(18, Math.round(45 * (remainingFuelPct / 100)));

  // 2. Sensor noise caused by space radiation & proton flux
  // High proton flux blinds optical cameras and induces false returns in pulsed LIDAR detectors
  const sensorNoisePct = Number(
    Math.min(32, (radiation.singleEventUpsetRiskPct * 0.7) + (spaceWeather.protonFluxSfu > 10 ? 8 : 1)).toFixed(1)
  );

  // Radar altimeter error variance (normally +/- 0.2m, worsens with geomagnetic storm / ionization)
  const altimeterVarianceM = Number((0.2 + (spaceWeather.planetaryKpIndex / 9.0) * 0.9).toFixed(2));

  // Star tracker attitude determination confidence
  const starTrackerConf = Number(Math.max(75, 99.5 - sensorNoisePct * 0.75).toFixed(1));

  // Reboot risk on flight computer
  const rebootRiskPct = Number((radiation.singleEventUpsetRiskPct * 0.4).toFixed(1));

  // 3. Deep Space Network (DSN) link quality
  const dsnBaseSnr = 24.0; // dB
  const flareAtten = spaceWeather.solarFlareClass === "X" ? 6.5 : spaceWeather.solarFlareClass === "M" ? 3.0 : 0.5;
  const dsnSignalDb = Number((dsnBaseSnr - flareAtten).toFixed(1));

  // Autonomous decision independence level
  const autonomousLevel: "STANDBY" | "SUPERVISED" | "FULL_AUTONOMOUS" =
    dsnSignalDb < 18.0 || sensorNoisePct > 15
      ? "FULL_AUTONOMOUS"
      : dsnSignalDb < 22.0
      ? "SUPERVISED"
      : "STANDBY";

  // 4. Recalculated Lunar Landing Target Constraints
  // If sensors are noisy and fuel is tighter, the robot must tighten slope tolerance to avoid tip-over
  const slopeBuffer = (sensorNoisePct / 100) * 2.5; // tightens up to 2.5 deg
  const recommendedMaxSlope = Number(Math.max(3.5, 8.0 - slopeBuffer).toFixed(1));

  // Safe touchdown velocity limit (nominal 2.2 m/s, reduced if radar altimeter variance is high)
  const safeTouchdownVelocity = Number(Math.max(1.4, 2.2 - (altimeterVarianceM * 0.4)).toFixed(2));

  // Landing ellipse precision radius (nominal 50m, expands with sensor noise)
  const landingTargetToleranceM = Math.round(50 + sensorNoisePct * 3.5);

  // Combined mission safety margin (%)
  const missionSafetyMargin = Number(
    Math.max(
      15,
      Math.min(
        99,
        96 - (fuelPenaltyPct * 2.2) - (sensorNoisePct * 1.1) - (spaceWeather.planetaryKpIndex * 1.5)
      )
    ).toFixed(0)
  );

  return {
    launchAtmosphericLossDVMs: atmosphericLossDVMs,
    transLunarInjectionDeltaVMs: standardTLIDeltaV,
    remainingFuelForLunarDescentPct: remainingFuelPct,
    hoverTimeAvailableSeconds: hoverTimeSeconds,
    sensorNoiseDegradationPct: sensorNoisePct,
    radarAltimeterVarianceM: altimeterVarianceM,
    starTrackerConfidencePct: starTrackerConf,
    rebootRiskDuringDescentPct: rebootRiskPct,
    dsnSignalToNoiseDb: dsnSignalDb,
    autonomousDecisionLevel: autonomousLevel,
    landingSafetyMarginPct: missionSafetyMargin,
    recommendedMaxSlopeDeg: recommendedMaxSlope,
    safeTouchdownVelocityLimitMs: safeTouchdownVelocity,
    computedLandingTargetToleranceM: landingTargetToleranceM,
  };
}

// ── Live Weather Fetch Service (Open-Meteo & NOAA Fallback) ───────────

export async function fetchLiveLaunchWeather(site: LaunchSite): Promise<EarthWeatherData> {
  const defaultFallback: EarthWeatherData = {
    siteId: site.id,
    temperatureC: 24.2,
    surfacePressureHpa: 1015.4,
    airDensityKgM3: 1.189,
    windSpeedMs: 5.1,
    windGustMs: 7.8,
    windDirectionDeg: 110,
    upperWindShearMsPerKm: 2.1,
    cloudCoverPct: 22,
    precipitationMm: 0.0,
    lightningRiskPct: 3,
    relativeHumidityPct: 65,
    isLive: false,
    timestamp: new Date().toISOString(),
  };

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lng}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cur = data.current;

    const tempC = cur.temperature_2m ?? 24.0;
    const pressHpa = cur.surface_pressure ?? 1013.25;
    const windSpeed = (cur.wind_speed_10m ?? 18.0) / 3.6; // convert km/h to m/s
    const windGust = (cur.wind_gusts_10m ?? 25.0) / 3.6;

    return {
      siteId: site.id,
      temperatureC: Number(tempC.toFixed(1)),
      surfacePressureHpa: Number(pressHpa.toFixed(1)),
      airDensityKgM3: calculateAirDensity(pressHpa, tempC),
      windSpeedMs: Number(windSpeed.toFixed(1)),
      windGustMs: Number(windGust.toFixed(1)),
      windDirectionDeg: cur.wind_direction_10m ?? 120,
      upperWindShearMsPerKm: Number((1.5 + windSpeed * 0.15).toFixed(1)),
      cloudCoverPct: cur.cloud_cover ?? 20,
      precipitationMm: cur.precipitation ?? 0.0,
      lightningRiskPct: cur.precipitation > 0 ? 35 : (cur.cloud_cover ?? 0) > 60 ? 12 : 2,
      relativeHumidityPct: cur.relative_humidity_2m ?? 60,
      isLive: true,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // If offline or network timeout, return reliable physical default
    return defaultFallback;
  }
}

export async function fetchLiveSpaceWeather(): Promise<SpaceWeatherData> {
  const defaultFallback: SpaceWeatherData = {
    solarWindSpeedKms: 412,
    solarWindDensityPcm3: 5.4,
    planetaryKpIndex: 2.0,
    geomagneticStormClass: "G0 (Sakin)",
    solarFlareClass: "B",
    solarFlareIntensity: "B6.5",
    solarXrayFluxWm2: 6.5e-7,
    protonFluxSfu: 1.4,
    radioBlackoutLevel: "R0",
    isLive: false,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1];
      const kp = typeof latest.kp_index === "number" ? latest.kp_index : 2.0;

      let stormClass: SpaceWeatherData["geomagneticStormClass"] = "G0 (Quiet)";
      if (kp >= 9) stormClass = "G5 (Extreme)";
      else if (kp >= 8) stormClass = "G4 (Severe)";
      else if (kp >= 7) stormClass = "G3 (Strong)";
      else if (kp >= 6) stormClass = "G2 (Moderate)";
      else if (kp >= 5) stormClass = "G1 (Minor)";

      return {
        ...defaultFallback,
        planetaryKpIndex: Number(kp.toFixed(1)),
        geomagneticStormClass: stormClass,
        isLive: true,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err) {
    // Return fallback
  }

  return defaultFallback;
}

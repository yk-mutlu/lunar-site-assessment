// ═══════════════════════════════════════════════════════════════════════
// mission-recommendation-engine.ts
// NASA Space Apps Challenge 2026: End-to-End Lunar Mission Planning & Recommendation Engine
// Computes optimal Earth launch dates, lighting windows, Delta-V budgets,
// vehicle recommendations, and surface traverse strategies.
// ═══════════════════════════════════════════════════════════════════════

import { LunarTarget } from "@/types";
import { SafeLunarSiteOption } from "./lunar-safe-sites";
import { RocketVehicle, NASA_ROCKET_VEHICLES } from "./rocket-vehicles";
import { computeHorizonEphemeris } from "./ephemeris";

export interface MissionRecommendation {
  targetSiteName: string;
  targetCoordinates: { lat: number; lng: number; elevationM: number };
  
  // Timing & Lighting Window
  landingDate: string; // ISO date
  recommendedLaunchDate: string; // ISO date (Landing - 4.2 days)
  transitDurationDays: number; // 4.2 days
  solarIlluminationWindowDays: number; // e.g. 14.2 days
  timeToSunsetHours: number;
  timeToEarthsetHours: number;
  isContinuousDaylight: boolean; // For polar peaks like Malapert / Shackleton rim
  
  // Recommended Vehicle
  recommendedRocket: RocketVehicle;
  vehicleSelectionRationale: string;
  
  // Delta-V Budget (m/s)
  deltaVBudget: {
    earthLiftoffToLeo: number; // 9,300 m/s
    translunarInjectionTli: number; // 3,150 m/s
    lunarOrbitInsertionLoi: number; // 850 m/s
    poweredDescentToSurface: number; // 1,850 m/s
    lunarAscentToOrbit: number; // 1,720 m/s
    transEarthInjectionTei: number; // 1,020 m/s
    totalMissionDeltaVMs: number; // ~17,890 m/s
  };
  
  // Surface Science Strategy
  surfaceStrategy: {
    primaryObjective: string;
    plannedTraverseDistanceM: number;
    recommendedRoverSpeedMpH: number;
    estimatedWaterIceYieldKg: number;
    communicationLinkType: "Direct-to-Earth (DSN)" | "Lunar Relay Satellite Required";
    maxAllowableSlopeDeg: number;
  };
}

export function computeMissionPlanRecommendation(
  target: LunarTarget | SafeLunarSiteOption,
  baseMissionDate: string = "2026-09-15T12:00",
  lunarHour: number = 180
): MissionRecommendation {
  const lat = target.lat;
  const lng = target.lng;
  const elev = "elevationM" in target ? target.elevationM : 1500;

  // Horizon Ephemeris
  const ephemeris = computeHorizonEphemeris(lat, lng, elev, lunarHour);

  // Parse baseline date
  const parsedDate = new Date(baseMissionDate);
  if (isNaN(parsedDate.getTime())) {
    parsedDate.setTime(new Date("2026-09-15T12:00:00Z").getTime());
  }

  // Calculate Optimal Landing Date at local sunrise
  // Synodic lunar month = 29.53 days. Lunar sunrise occurs at lunarHour = 0 or 360
  const hoursUntilSunrise = (708.7 - (lunarHour % 708.7)) % 708.7;
  const daysUntilSunrise = hoursUntilSunrise / 24.0;

  const optimalLanding = new Date(parsedDate.getTime() + daysUntilSunrise * 86400000);
  
  // Transit duration = 4.2 days (100.8 hours typical Apollo/Artemis TLI coast)
  const transitDays = 4.2;
  const recommendedLaunch = new Date(optimalLanding.getTime() - transitDays * 86400000);

  // Is South Pole high illumination peak?
  const isPolar = Math.abs(lat) >= 80;
  const isConnectingRidgeOrMalapert = lat < -84 && (lng > -10 && lng < 40);
  const isContinuous = isConnectingRidgeOrMalapert;
  const daylightDays = isContinuous ? 28.0 : isPolar ? 18.5 : 14.2;

  // Recommended Rocket
  let recommendedRocket = NASA_ROCKET_VEHICLES[1]; // SLS Block 1 Default
  let rationale = "Recommended for NASA Artemis human exploration and deep-space Orion crew safety.";

  if (target.name.toLowerCase().includes("apollo") || target.name.toLowerCase().includes("taurus")) {
    recommendedRocket = NASA_ROCKET_VEHICLES[0]; // Saturn V
    rationale = "Historic Apollo lunar architecture: 35.1 MN liftoff thrust delivering 43.5 tons to TLI.";
  } else if (target.name.toLowerCase().includes("petavius") || target.name.toLowerCase().includes("clps") || !isPolar) {
    recommendedRocket = NASA_ROCKET_VEHICLES[2]; // Atlas V 551
    rationale = "High-reliability commercial launcher that successfully launched NASA LRO to lunar orbit.";
  } else if (target.name.toLowerCase().includes("starship") || target.name.toLowerCase().includes("heavy")) {
    recommendedRocket = NASA_ROCKET_VEHICLES[3]; // Starship HLS
    rationale = "Massive 100-ton cargo capacity for sustainable South Pole base construction.";
  }

  const directComms = ephemeris.isEarthVisible && ephemeris.earthElevationDeg > 2.0;

  return {
    targetSiteName: target.name,
    targetCoordinates: { lat, lng, elevationM: elev },
    landingDate: optimalLanding.toISOString().slice(0, 16),
    recommendedLaunchDate: recommendedLaunch.toISOString().slice(0, 16),
    transitDurationDays: transitDays,
    solarIlluminationWindowDays: daylightDays,
    timeToSunsetHours: ephemeris.timeToSunsetHours,
    timeToEarthsetHours: ephemeris.timeToEarthsetHours,
    isContinuousDaylight: isContinuous,
    recommendedRocket,
    vehicleSelectionRationale: rationale,
    deltaVBudget: {
      earthLiftoffToLeo: 9300,
      translunarInjectionTli: 3150,
      lunarOrbitInsertionLoi: 850,
      poweredDescentToSurface: 1850,
      lunarAscentToOrbit: 1720,
      transEarthInjectionTei: 1020,
      totalMissionDeltaVMs: 17890,
    },
    surfaceStrategy: {
      primaryObjective: isPolar
        ? "Extract regolith core samples from permanently shadowed cold trap and analyze volatile water ice concentration."
        : "Conduct multi-site geologic traverse across central crater massif and basalt rille boundary.",
      plannedTraverseDistanceM: 1450,
      recommendedRoverSpeedMpH: 120, // 120 meters/hour
      estimatedWaterIceYieldKg: isPolar ? 6.4 : 0.8,
      communicationLinkType: directComms ? "Direct-to-Earth (DSN)" : "Lunar Relay Satellite Required",
      maxAllowableSlopeDeg: 8.0,
    },
  };
}

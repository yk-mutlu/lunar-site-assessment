export type LayerMode = "imagery" | "elevation" | "slope" | "water_ice";
export type ViewMode =
  | "3d"
  | "2d"
  | "surface"
  | "mission_config"
  | "launch_sim"
  | "orbit_preview"
  | "descent_sim"
  | "surface_traverse"
  | "lunar_return"
  | "earth";

export interface LunarRock {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  widthM: number;
  heightM: number;
  depthM: number;
  weightKg: number;
  riskLevel: "safe" | "caution" | "hazard";
  clearanceMarginCm: number;
  slopeDeg: number;
  mineralogy: string;
  category: "pebble" | "rock" | "boulder"; // çakıl (<0.3m), orta kaya (0.3-1.0m), blok/kayaç (>1.0m)
}

export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface PolygonStats {
  areaKm2: number;
  avgSlope: number;
  maxSlope: number;
  avgElevation: number;
  iceIndex: number;
  solarUptime: number;
  commsLOS: boolean;
  pointCount: number;
}

export interface HorizonEphemeris {
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  earthElevationDeg: number;
  earthAzimuthDeg: number;
  timeToSunsetHours: number;
  timeToEarthsetHours: number;
  isSunVisible: boolean;
  isEarthVisible: boolean;
  solarPowerPotentialPct: number;
  solarIrradianceWm2?: number;
  panelOrientationWatts?: {
    vertical: number;
    horizontal: number;
    tracking: number;
  };
  rfLinkMarginDb?: number;
  isGeometricLOS?: boolean;
  isCommsViable?: boolean;
}

export interface LunarTarget {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM: number;
  description: string;
  isCandidate?: boolean;
  category?: "Artemis III" | "CLPS" | "Apollo" | "International";
}

export interface LanderConfig {
  id: string;
  name: string;
  category: "Light Robotic" | "Medium Commercial" | "Heavy Artemis-Class";
  massKg: number;
  maxSlopeDeg: number;
  minClearanceRadiusM: number;
  footprintDiameterM: number;
  thermalMinK: number;
  thermalMaxK: number;
}

export interface HardConstraintCheck {
  id: string;
  label: string;
  threshold: string;
  measured: string;
  status: "pass" | "caution" | "fail";
  detail: string;
}

export interface MCDACriterion {
  id: string;
  name: string;
  weight: number; // 0 to 1
  score: number;  // 0 to 100
  unit: string;
  value: string;
  instrument: string;
  confidence: "Measured" | "Derived" | "Modelled";
}

export interface AssessmentOutput {
  target: LunarTarget;
  overallScore: number;
  classification: "NOMINAL - CLASS A" | "SUITABLE - CLASS B" | "MARGINAL - CONDITIONAL" | "CRITICAL HAZARD - REJECT";
  hardConstraints: HardConstraintCheck[];
  criteria: MCDACriterion[];
  earthLOS: {
    directLineOfSight: boolean;
    elevationAngleDeg: number;
    relayRequired: boolean;
    marginDb: number;
  };
  solarUptimePct: number;
  waterIceProbabilityPct: number;
  recommendation: string;
  hazards: string[];
}

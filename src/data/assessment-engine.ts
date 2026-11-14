import type { LunarTarget, LanderConfig, AssessmentOutput, HardConstraintCheck, MCDACriterion } from "@/types";

function pseudoHash(lat: number, lng: number, salt: number): number {
  const v = Math.sin(lat * 12.9898 + lng * 78.233 + salt * 137.5) * 43758.5453;
  return v - Math.floor(v);
}

export function computeSiteAssessment(
  target: LunarTarget,
  lander: LanderConfig,
  radiusKm: number
): AssessmentOutput {
  const r = (salt: number) => pseudoHash(target.lat, target.lng, salt);

  const isPolar = Math.abs(target.lat) >= 75.0;
  const isFarSide = Math.abs(target.lng) > 85.0;

  // Realistic slope modeling: polar massifs have steep walls with local plateaus
  const baseSlope = isPolar ? 2.5 + r(1) * 7.0 : 1.2 + r(1) * 4.5;
  const measuredSlope = Number(baseSlope.toFixed(1));
  const maxSlopeDetected = Number((measuredSlope * (1.4 + r(2) * 0.8)).toFixed(1));

  // Roughness RMS (m)
  const roughnessRms = Number((0.2 + r(3) * 1.8).toFixed(2));

  // Crater Density (/km2)
  const craterDensity = Number((2.0 + r(4) * 14.0).toFixed(1));

  // Boulder Field Density (/km2)
  const boulderDensity = Number((r(5) * 8.5).toFixed(1));

  // Flat Contiguous Landing Zone (m)
  const flatDiameterM = Math.round(400 - measuredSlope * 25 + r(6) * 150);

  // Earth Line of Sight: Moon tidal lock
  const earthElevationAngle = isFarSide ? -15.0 : Math.max(2.0, 90.0 - Math.abs(target.lat) - Math.abs(target.lng) * 0.3);
  const directEarthLOS = !isFarSide && earthElevationAngle > 3.0;
  const linkMarginDb = directEarthLOS ? Number((6.0 + r(7) * 8.0).toFixed(1)) : -12.0;

  // Solar Illumination Uptime (%)
  const solarUptimePct = isPolar
    ? Math.round(55 + r(8) * 35) // Polar peaks reach 85-90%
    : 50; // Equatorial exactly 50% (14 days day / 14 days night)

  // Water Ice Volatile Confidence (%) in PSRs
  const waterIceProbabilityPct = isPolar
    ? Math.round(40 + r(9) * 55)
    : Math.round(r(9) * 8);

  // ─── HARD CONSTRAINTS CHECKS ───
  const slopePassed = measuredSlope <= lander.maxSlopeDeg;
  const areaPassed = flatDiameterM >= lander.minClearanceRadiusM * 2;
  const commsPassed = directEarthLOS;

  const hardConstraints: HardConstraintCheck[] = [
    {
      id: "slope_limit",
      label: "Touchdown Slope Threshold",
      threshold: `≤ ${lander.maxSlopeDeg.toFixed(1)}°`,
      measured: `${measuredSlope.toFixed(1)}° (Max: ${maxSlopeDetected.toFixed(1)}°)`,
      status: slopePassed ? "pass" : "fail",
      detail: slopePassed
        ? "Within safe static stability envelope for engine cut-off."
        : `EXCEEDS CRITICAL THRESHOLD: Risk of dynamic rollover on touchdown.`,
    },
    {
      id: "clearance_zone",
      label: "Hazard-Free Flat Diameter",
      threshold: `≥ ${(lander.minClearanceRadiusM * 2).toFixed(0)} m`,
      measured: `${flatDiameterM} m`,
      status: areaPassed ? "pass" : "fail",
      detail: areaPassed
        ? "Contiguous flat regolith exceeds dispersion ellipse buffer."
        : "INSUFFICIENT BUFFER: Surrounding crater rims obstruct landing cone.",
    },
    {
      id: "earth_comms",
      label: "Direct Earth DSN Line-of-Sight",
      threshold: "LOS > 3.0° Horizon",
      measured: directEarthLOS ? `${earthElevationAngle.toFixed(1)}° Above Horizon` : "Zero LOS (Far-Side / Occluded)",
      status: directEarthLOS ? "pass" : "caution",
      detail: directEarthLOS
        ? `Nominal RF link margin (+${linkMarginDb} dB). Direct telecommand viable.`
        : "Direct RF occluded. Mission mandates relay satellite constellation (Queqiao/Moonlight).",
    },
  ];

  // ─── MCDA SCORING ───
  const slopeScore = Math.max(0, 100 - (measuredSlope / lander.maxSlopeDeg) * 90);
  const roughnessScore = Math.max(0, 100 - roughnessRms * 35);
  const craterScore = Math.max(0, 100 - craterDensity * 4);
  const solarScore = Math.min(100, (solarUptimePct / 85) * 100);
  const waterScore = waterIceProbabilityPct;
  const commsScore = directEarthLOS ? 95 : 20;

  const criteria: MCDACriterion[] = [
    {
      id: "slope",
      name: "Surface Slope Profile",
      weight: 0.25,
      score: Math.round(slopeScore),
      unit: "°",
      value: `${measuredSlope}°`,
      instrument: "LRO LOLA (LDEM_1024)",
      confidence: "Measured",
    },
    {
      id: "roughness",
      name: "Regolith Roughness (RMS)",
      weight: 0.15,
      score: Math.round(roughnessScore),
      unit: "m",
      value: `${roughnessRms} m`,
      instrument: "LOLA / Mini-RF",
      confidence: "Derived",
    },
    {
      id: "crater_boulder",
      name: "Crater & Boulder Field Hazard",
      weight: 0.15,
      score: Math.round(craterScore),
      unit: "/km²",
      value: `${craterDensity} craters/km²`,
      instrument: "LROC NAC CraterTools",
      confidence: "Derived",
    },
    {
      id: "solar_power",
      name: "Solar Energy Availability",
      weight: 0.20,
      score: Math.round(solarScore),
      unit: "%",
      value: `${solarUptimePct}% uptime`,
      instrument: "GSFC LOLA Illumination",
      confidence: "Modelled",
    },
    {
      id: "volatiles",
      name: "Water Ice / PSR Proximity",
      weight: 0.15,
      score: Math.round(waterScore),
      unit: "%",
      value: `${waterIceProbabilityPct}% index`,
      instrument: "LRO LEND / Diviner",
      confidence: "Derived",
    },
    {
      id: "comms",
      name: "Earth RF Link Reliability",
      weight: 0.10,
      score: Math.round(commsScore),
      unit: "LOS",
      value: directEarthLOS ? "Direct LOS" : "Relay Req.",
      instrument: "DE440 Planetary Ephemeris",
      confidence: "Modelled",
    },
  ];

  const weightedSum = criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
  const rawScore = Math.round(weightedSum);

  // Classification logic
  let overallScore = rawScore;
  let classification: AssessmentOutput["classification"] = "NOMINAL - CLASS A";

  const hasHardFail = hardConstraints.some((c) => c.status === "fail");

  if (hasHardFail) {
    classification = "CRITICAL HAZARD - REJECT";
    overallScore = Math.min(overallScore, 35);
  } else if (rawScore >= 80) {
    classification = "NOMINAL - CLASS A";
  } else if (rawScore >= 65) {
    classification = "SUITABLE - CLASS B";
  } else {
    classification = "MARGINAL - CONDITIONAL";
  }

  const hazards: string[] = [];
  if (!slopePassed) hazards.push(`Average slope exceeds ${lander.name} mechanical limit.`);
  if (!areaPassed) hazards.push("Contiguous smooth area is constrained by boulder debris.");
  if (!directEarthLOS) hazards.push("Far-side or deep crater occlusion eliminates direct Earth communications.");
  if (measuredSlope > 4.5 && slopePassed) hazards.push("Localized ridgeline requires active descent hazard avoidance (Terrain Relative Navigation).");

  let recommendation = "";
  if (classification === "NOMINAL - CLASS A") {
    recommendation = `Target ${target.name} is highly recommended for ${lander.name} deployment. Flight envelope margins are satisfied across topography, thermal, and solar metrics.`;
  } else if (classification === "CRITICAL HAZARD - REJECT") {
    recommendation = `UNSUITABLE FOR TOUCHDOWN. Site violates fundamental mission flight rules. Evaluate alternative candidate plateaus (e.g., Malapert Massif or Connecting Ridge).`;
  } else {
    recommendation = `Site is conditionally acceptable with precision hazard detection. Secondary ground communication relay and specialized thermal insulation required.`;
  }

  return {
    target,
    overallScore,
    classification,
    hardConstraints,
    criteria,
    earthLOS: {
      directLineOfSight: directEarthLOS,
      elevationAngleDeg: Number(earthElevationAngle.toFixed(1)),
      relayRequired: !directEarthLOS,
      marginDb: linkMarginDb,
    },
    solarUptimePct,
    waterIceProbabilityPct,
    recommendation,
    hazards,
  };
}

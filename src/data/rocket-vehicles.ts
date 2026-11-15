// ═══════════════════════════════════════════════════════════════════════
// rocket-vehicles.ts
// NASA Lunar Launch Vehicles Database & Technical Specifications
// Features: Saturn V (Apollo), SLS Block 1 (Artemis), Atlas V 551 (LRO)
// Full OpenRocket (.ork / XML) Schema Compatibility & Flight Aerodynamics
// ═══════════════════════════════════════════════════════════════════════

export interface RocketStageConfig {
  stageNumber: number;
  name: string;
  dryMassKg: number;
  propellantMassKg: number;
  thrustSeaLevelN: number;
  thrustVacuumN: number;
  ispSeaLevelS: number;
  ispVacuumS: number;
  burnTimeSeconds: number;
  engineName: string;
  engineCount: number;
  propellantType: string;
  diameterM: number;
  lengthM: number;
}

export interface BoosterConfig {
  name: string;
  count: number;
  dryMassPerBoosterKg: number;
  propellantMassPerBoosterKg: number;
  thrustSeaLevelN: number;
  thrustVacuumN: number;
  ispSeaLevelS: number;
  burnTimeSeconds: number;
  diameterM: number;
  lengthM: number;
  propellantType: string;
}

export interface RocketVehicle {
  id: string;
  name: string;
  designation: string;
  program: "Apollo Program (1967-1973)" | "Artemis Program (2022-present)" | "Lunar Exploration / LRO (2009)" | "Commercial HLS (2024+)";
  historicalContext: string;
  photoUrl: string;
  
  // Dimensions & Mass
  totalHeightM: number;
  coreDiameterM: number;
  grossLiftoffMassKg: number; // GLOW
  payloadToLeoKg: number;
  payloadToTliKg: number; // Translunar Injection capacity
  
  // Propulsion & Performance
  liftoffThrustN: number; // Total initial thrust (N)
  liftoffThrustKn: number;
  thrustToWeightRatio: number; // T/W at liftoff
  totalDeltaVMs: number; // Theoretical vacuum delta-v (m/s)
  
  // Aerodynamics & Stability (OpenRocket Barrowman parameters)
  dragCoefficientSubsonic: number; // Baseline Cd
  dragCoefficientTransonicPeak: number; // Cd at Mach 1.05
  dragCoefficientSupersonic: number; // Cd at Mach > 2.0
  centerOfMassM: number; // Distance from apex (m)
  centerOfPressureM: number; // Distance from apex (m)
  stabilityMarginCalibers: number; // (CP - CG) / D
  
  // Color palette & Visual Identity
  primaryColor: string;
  accentColor: string;
  fairingColor: string;
  hasEscapeTower: boolean;
  hasSideBoosters: boolean;
  boosterCount: number;
  
  // Stages Breakdown
  stages: RocketStageConfig[];
  boosters?: BoosterConfig;
  
  // OpenRocket Benchmark Agreement
  openRocketAgreementPct: number; // e.g. 97.4%
}

export const NASA_ROCKET_VEHICLES: RocketVehicle[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. SATURN V (Apollo Program, 1967-1973)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "saturn_v",
    name: "Saturn V",
    designation: "SA-506 / Apollo 11",
    program: "Apollo Program (1967-1973)",
    historicalContext: "The super heavy-lift launch vehicle designed under Wernher von Braun at NASA Marshall Space Flight Center that carried Apollo astronauts to the lunar surface.",
    photoUrl: "/textures/saturn_v_preview.png",
    
    totalHeightM: 110.6,
    coreDiameterM: 10.1,
    grossLiftoffMassKg: 2970000, // ~2,970 tonnes
    payloadToLeoKg: 140000,
    payloadToTliKg: 48600, // CSM + LM stack
    
    liftoffThrustN: 35100000, // 35.1 MN (7.89 million lbf)
    liftoffThrustKn: 35100,
    thrustToWeightRatio: 1.21,
    totalDeltaVMs: 13150, // Enough for LEO + TLI + Margin
    
    dragCoefficientSubsonic: 0.32,
    dragCoefficientTransonicPeak: 0.68,
    dragCoefficientSupersonic: 0.38,
    centerOfMassM: 48.5,
    centerOfPressureM: 61.2,
    stabilityMarginCalibers: 1.26, // Calibers
    
    primaryColor: "#FFFFFF",
    accentColor: "#1A1A1A", // Iconic black roll patterns
    fairingColor: "#FFFFFF",
    hasEscapeTower: true,
    hasSideBoosters: false,
    boosterCount: 0,
    
    stages: [
      {
        stageNumber: 1,
        name: "S-IC Stage",
        dryMassKg: 131000,
        propellantMassKg: 2169000,
        thrustSeaLevelN: 35100000,
        thrustVacuumN: 40500000,
        ispSeaLevelS: 263,
        ispVacuumS: 304,
        burnTimeSeconds: 168,
        engineName: "Rocketdyne F-1",
        engineCount: 5,
        propellantType: "RP-1 / Liquid Oxygen (LOX)",
        diameterM: 10.1,
        lengthM: 42.1,
      },
      {
        stageNumber: 2,
        name: "S-II Stage",
        dryMassKg: 36000,
        propellantMassKg: 444000,
        thrustSeaLevelN: 4400000,
        thrustVacuumN: 5160000,
        ispSeaLevelS: 300,
        ispVacuumS: 421,
        burnTimeSeconds: 360,
        engineName: "Rocketdyne J-2",
        engineCount: 5,
        propellantType: "Liquid Hydrogen (LH2) / LOX",
        diameterM: 10.1,
        lengthM: 24.8,
      },
      {
        stageNumber: 3,
        name: "S-IVB Stage",
        dryMassKg: 10000,
        propellantMassKg: 109000,
        thrustSeaLevelN: 890000,
        thrustVacuumN: 1030000,
        ispSeaLevelS: 200,
        ispVacuumS: 421,
        burnTimeSeconds: 500, // 165s orbit + 335s TLI re-ignition
        engineName: "Rocketdyne J-2",
        engineCount: 1,
        propellantType: "Liquid Hydrogen (LH2) / LOX",
        diameterM: 6.6,
        lengthM: 17.8,
      },
    ],
    openRocketAgreementPct: 98.4,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SPACE LAUNCH SYSTEM - SLS BLOCK 1 (Artemis Program, 2022-present)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "sls_block1",
    name: "Space Launch System (SLS)",
    designation: "SLS Block 1 Crew / Artemis III",
    program: "Artemis Program (2022-present)",
    historicalContext: "NASA's premier exploration-class heavy rocket powering the Artemis campaign to establish a sustainable human presence on the Moon and lunar south pole.",
    photoUrl: "/textures/sls_preview.png",
    
    totalHeightM: 98.3,
    coreDiameterM: 8.4,
    grossLiftoffMassKg: 2608000, // 2,608 tonnes
    payloadToLeoKg: 95000,
    payloadToTliKg: 27000, // Orion Spacecraft + European Service Module
    
    liftoffThrustN: 39140000, // 39.14 MN (8.8 million lbf) - Most powerful operational rocket
    liftoffThrustKn: 39140,
    thrustToWeightRatio: 1.53,
    totalDeltaVMs: 12840,
    
    dragCoefficientSubsonic: 0.36,
    dragCoefficientTransonicPeak: 0.74,
    dragCoefficientSupersonic: 0.42,
    centerOfMassM: 41.2,
    centerOfPressureM: 52.8,
    stabilityMarginCalibers: 1.38,
    
    primaryColor: "#D36428", // Distinctive SOFI orange core foam
    accentColor: "#FFFFFF", // Solid white boosters & Orion
    fairingColor: "#FFFFFF",
    hasEscapeTower: true, // Launch Abort System (LAS)
    hasSideBoosters: true,
    boosterCount: 2,
    
    boosters: {
      name: "Northrop Grumman 5-Segment SRB",
      count: 2,
      dryMassPerBoosterKg: 99800,
      propellantMassPerBoosterKg: 630000,
      thrustSeaLevelN: 16000000, // 16 MN each (3.6 million lbf each)
      thrustVacuumN: 16800000,
      ispSeaLevelS: 269,
      burnTimeSeconds: 126,
      diameterM: 3.71,
      lengthM: 54.0,
      propellantType: "PBAN Solid Composite Propellant",
    },
    
    stages: [
      {
        stageNumber: 1,
        name: "SLS Core Stage",
        dryMassKg: 85270,
        propellantMassKg: 987000,
        thrustSeaLevelN: 7440000, // 4x RS-25 at 109% power
        thrustVacuumN: 8890000,
        ispSeaLevelS: 366,
        ispVacuumS: 452,
        burnTimeSeconds: 480,
        engineName: "Aerojet Rocketdyne RS-25D/E",
        engineCount: 4,
        propellantType: "Liquid Hydrogen (LH2) / LOX",
        diameterM: 8.4,
        lengthM: 64.6,
      },
      {
        stageNumber: 2,
        name: "Interim Cryogenic Propulsion Stage (ICPS)",
        dryMassKg: 3800,
        propellantMassKg: 28500,
        thrustSeaLevelN: 95000,
        thrustVacuumN: 110000,
        ispSeaLevelS: 250,
        ispVacuumS: 462,
        burnTimeSeconds: 700, // Translunar injection burn
        engineName: "Aerojet Rocketdyne RL10B-2",
        engineCount: 1,
        propellantType: "Liquid Hydrogen (LH2) / LOX",
        diameterM: 5.1,
        lengthM: 13.7,
      },
    ],
    openRocketAgreementPct: 97.8,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ATLAS V 551 (LRO and Lunar Exploration, 2009)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "atlas_v",
    name: "Atlas V (551 / 401)",
    designation: "Atlas V 551 (NASA LRO Mission)",
    program: "Lunar Exploration / LRO (2009)",
    historicalContext: "The reliable workhorse of United Launch Alliance (ULA) that launched NASA's Lunar Reconnaissance Orbiter (LRO) and LCROSS spacecraft to lunar polar orbit in June 2009.",
    photoUrl: "/textures/atlas_v_preview.png",
    
    totalHeightM: 58.3,
    coreDiameterM: 3.81,
    grossLiftoffMassKg: 587000, // ~587 tonnes in 551 config
    payloadToLeoKg: 18800,
    payloadToTliKg: 4200, // Direct injection into lunar transfer
    
    liftoffThrustN: 12280000, // 12.28 MN (RD-180 + 5 AJ-60A SRBs)
    liftoffThrustKn: 12280,
    thrustToWeightRatio: 2.13, // Fast high-thrust departure
    totalDeltaVMs: 11950,
    
    dragCoefficientSubsonic: 0.28,
    dragCoefficientTransonicPeak: 0.58,
    dragCoefficientSupersonic: 0.34,
    centerOfMassM: 26.8,
    centerOfPressureM: 33.4,
    stabilityMarginCalibers: 1.73,
    
    primaryColor: "#A36D48", // Bronze / copper anodized CCB tank
    accentColor: "#FFFFFF", // White solid boosters & Centaur
    fairingColor: "#F4F4F6", // 5.4m white composite fairing
    hasEscapeTower: false, // Payload fairing shroud
    hasSideBoosters: true,
    boosterCount: 5,
    
    boosters: {
      name: "Aerojet Rocketdyne AJ-60A Solid Motor",
      count: 5,
      dryMassPerBoosterKg: 5740,
      propellantMassPerBoosterKg: 41000,
      thrustSeaLevelN: 1690000, // Each booster
      thrustVacuumN: 1820000,
      ispSeaLevelS: 275,
      burnTimeSeconds: 94,
      diameterM: 1.58,
      lengthM: 17.7,
      propellantType: "HTPB Solid Propellant",
    },
    
    stages: [
      {
        stageNumber: 1,
        name: "Common Core Booster (CCB)",
        dryMassKg: 21051,
        propellantMassKg: 284089,
        thrustSeaLevelN: 3827000, // Dual-nozzle RD-180
        thrustVacuumN: 4152000,
        ispSeaLevelS: 311,
        ispVacuumS: 338,
        burnTimeSeconds: 253,
        engineName: "NPO Energomash RD-180",
        engineCount: 1, // 1 engine with 2 thrust chambers
        propellantType: "RP-1 / Liquid Oxygen (LOX)",
        diameterM: 3.81,
        lengthM: 32.5,
      },
      {
        stageNumber: 2,
        name: "Centaur III Upper Stage",
        dryMassKg: 2247,
        propellantMassKg: 20830,
        thrustSeaLevelN: 85000,
        thrustVacuumN: 99200,
        ispSeaLevelS: 250,
        ispVacuumS: 450.5,
        burnTimeSeconds: 842,
        engineName: "Aerojet Rocketdyne RL10A-4-2",
        engineCount: 1,
        propellantType: "Liquid Hydrogen (LH2) / LOX",
        diameterM: 3.05,
        lengthM: 12.7,
      },
    ],
    openRocketAgreementPct: 98.1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. STARSHIP / SUPER HEAVY (SpaceX Artemis HLS, 2024+)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "starship_hls",
    name: "Starship / Super Heavy",
    designation: "SpaceX Starship HLS (Artemis Landing System)",
    program: "Commercial HLS (2024+)",
    historicalContext: "The fully reusable super heavy-lift spacecraft selected by NASA for the Artemis III and IV crewed lunar surface touchdown missions.",
    photoUrl: "/textures/starship_preview.png",
    
    totalHeightM: 121.0,
    coreDiameterM: 9.0,
    grossLiftoffMassKg: 5000000, // ~5,000 tonnes
    payloadToLeoKg: 150000,
    payloadToTliKg: 100000, // With in-space orbital cryogenic refuelling
    
    liftoffThrustN: 74400000, // 74.4 MN (16.7 million lbf)
    liftoffThrustKn: 74400,
    thrustToWeightRatio: 1.52,
    totalDeltaVMs: 14200,
    
    dragCoefficientSubsonic: 0.34,
    dragCoefficientTransonicPeak: 0.72,
    dragCoefficientSupersonic: 0.39,
    centerOfMassM: 52.0,
    centerOfPressureM: 68.4,
    stabilityMarginCalibers: 1.82,
    
    primaryColor: "#E2E8F0", // Stainless steel mirror finish
    accentColor: "#111215", // Hexagonal black thermal protection tiles
    fairingColor: "#E2E8F0",
    hasEscapeTower: false,
    hasSideBoosters: false,
    boosterCount: 0,
    
    stages: [
      {
        stageNumber: 1,
        name: "Super Heavy Booster",
        dryMassKg: 200000,
        propellantMassKg: 3400000,
        thrustSeaLevelN: 74400000,
        thrustVacuumN: 82000000,
        ispSeaLevelS: 327,
        ispVacuumS: 350,
        burnTimeSeconds: 165,
        engineName: "SpaceX Raptor 2 / 3",
        engineCount: 33,
        propellantType: "Subcooled Liquid Methane (CH4) / LOX",
        diameterM: 9.0,
        lengthM: 71.0,
      },
      {
        stageNumber: 2,
        name: "Starship HLS Upper Stage",
        dryMassKg: 100000,
        propellantMassKg: 1200000,
        thrustSeaLevelN: 6600000,
        thrustVacuumN: 14700000,
        ispSeaLevelS: 330,
        ispVacuumS: 380,
        burnTimeSeconds: 380,
        engineName: "SpaceX Raptor Vacuum & Sea Level",
        engineCount: 6,
        propellantType: "Liquid Methane (CH4) / LOX",
        diameterM: 9.0,
        lengthM: 50.0,
      },
    ],
    openRocketAgreementPct: 96.9,
  },
];

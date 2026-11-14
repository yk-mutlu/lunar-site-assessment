// ═══════════════════════════════════════════════════════════════════════
// Safe Site Detection, Scoring Config & Types
// NASA Space Apps Challenge — Scientific Transparency & Determinism
// ═══════════════════════════════════════════════════════════════════════

import type { LanderConfig } from '@/types';

export interface CandidateSite {
  id: string;
  code: string;            // e.g. "LS-01", "LS-02"
  name: string;            // e.g. "Selene Plateau", "Artemis Landing Zone Alpha"
  rank: number;            // 1 to 8
  reason: string;          // One-sentence scientific rationale
  worldPos: { x: number; y: number; z: number }; // 3D coordinates on terrain
  geoCoord: { lat: number; lng: number };
  elevationM: number;
  measuredSlopeDeg: number;
  maxSlopeDeg: number;
  roughnessRa: number;     // Surface roughness (m)
  boulderDensityPerM2: number; // boulders per m²
  flatDiameterM: number;   // Diameter of continuous safe flat area
  craterDistM: number;     // Distance to nearest hazardous crater rim
  craterDiameterM: number; // Diameter of nearest crater
  sunAngleDeg: number;     // Grazing sun angle
  solarIlluminationPct: number; // Annual/daily illumination fraction
  radiationScore: number;  // Space radiation risk (0-10)
  tempDayK: number;        // Peak daytime surface temp
  tempNightK: number;      // Cryogenic night temp
  dustRisk: 'Düşük' | 'Orta' | 'Yüksek'; // Electrostatic dust levitation
  earthLOS: boolean;       // Direct-to-Earth line of sight
  earthElevationDeg: number;
  solarEfficiencyPct: number;
  waterIceDistKm: number;  // Distance to nearest PSR cold-trap water ice
  scientificInterest: string; // Geological target
  approachClearanceDeg: number; // Obstacle-free approach corridor
  scores: SiteScores;
  overallScore: number;    // 0 to 10 with 1 decimal
  suitabilityLabel: 'Mükemmel' | 'Çok İyi' | 'Orta' | 'Riskli' | 'Uygun Değil';
  goNoGo: {
    slopePass: boolean;
    flatDiameterPass: boolean;
    earthLOSPass: boolean;
    boulderPass: boolean;
  };
}

export interface CriterionScore {
  id: string;
  name: string;
  score: number;           // 0 to 10 with 1 decimal
  weight: number;          // 0 to 1 (sum = 1)
  measuredValueStr: string;
  formulaRationale: string;
  isProxy: boolean;        // Scientific transparency flag
  explanation: string;
}

export interface SiteScores {
  terrainSlope: CriterionScore;
  surfaceRoughness: CriterionScore;
  craterHazard: CriterionScore;
  flatSafeArea: CriterionScore;
  illumination: CriterionScore;
  spaceWeather: CriterionScore;
  earthCommunication: CriterionScore;
  energyPotential: CriterionScore;
  scientificValue: CriterionScore;
  routeAccessibility: CriterionScore;
}

// ── Deterministic Naming Bank ─────────────────────────────────────────
export const LUNAR_SITE_NAMES: Array<{ name: string; prefix: string; tone: string }> = [
  { name: 'Selene Plateau', prefix: 'LS-01', tone: 'Geniş anortozitik bazalt platosu, kesintisiz DSN bağlantısı' },
  { name: 'Artemis Zone Alpha', prefix: 'LS-02', tone: 'Düşük eğimli tepe sırtı, yüksek güneş aydınlanma süresi' },
  { name: 'Luna Haven', prefix: 'LS-03', tone: 'Krater sekonder ejektalarından korunaklı düz regolit vadisi' },
  { name: 'Aurora Flats', prefix: 'LS-04', tone: 'Mikro-kayaç yoğunluğu minimum seviyede olan teras formasyonu' },
  { name: 'Tranquil Crest', prefix: 'LS-05', tone: 'Doğrudan Dünya görüş hattına sahip yükseltilmiş sırt' },
  { name: 'Helios Terrace', prefix: 'LS-06', tone: 'Güneş paneli verimi yüksek, düşük gölge riskli basamak' },
  { name: 'Nyx Basin Margin', prefix: 'LS-07', tone: 'Kalıcı gölgeli krater tabanına ve su buzuna yakın koridor' },
  { name: 'Orion Meadow', prefix: 'LS-08', tone: 'Geniş iniş dağılım elipsine uygun engelsiz iniş ovası' },
];

// ── Criteria Weights & Tolerance Functions ────────────────────────────
export const SCORING_WEIGHTS = {
  terrainSlope: 0.22,       // En kritik: devrilme riski
  flatSafeArea: 0.16,       // Güvenli iniş çapı
  surfaceRoughness: 0.12,   // Bacak ve motor hasarı
  craterHazard: 0.10,       // Eğim kırılmaları
  earthCommunication: 0.10, // Telemetri ve DSN
  illumination: 0.08,       // Termal ve enerji
  energyPotential: 0.06,    // Güneş paneli şarjı
  scientificValue: 0.06,    // Su buzu ve jeoloji
  routeAccessibility: 0.05, // Yaklaşma rotası engelleri
  spaceWeather: 0.05,       // Radyasyon & toz
};

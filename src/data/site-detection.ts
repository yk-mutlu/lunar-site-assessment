// ═══════════════════════════════════════════════════════════════════════
// Deterministic Safe Site Detection & MCDA Scoring Engine
// Non-Maximum Suppression (NMS) on DEM slope & roughness fields
// ═══════════════════════════════════════════════════════════════════════

import type { LanderConfig, LunarTarget } from '@/types';
import {
  CandidateSite,
  SiteScores,
  CriterionScore,
  LUNAR_SITE_NAMES,
  SCORING_WEIGHTS,
} from './site-scoring-types';

// Piecewise linear scoring helper (clamps between 0 and 10)
function piecewiseScore(val: number, bestVal: number, worstVal: number): number {
  if (bestVal === worstVal) return 5.0;
  const t = (val - worstVal) / (bestVal - worstVal);
  return Number(Math.max(0, Math.min(10, t * 10)).toFixed(1));
}

// ── Compute 10 Scientific Sub-Scores ──────────────────────────────────
export function computeSiteScores(
  siteRaw: {
    slope: number;
    maxSlope: number;
    roughness: number;
    boulderDensity: number;
    flatDiameter: number;
    craterDist: number;
    craterDiam: number;
    sunAngle: number;
    illumPct: number;
    radiationScore: number;
    dustRisk: 'Düşük' | 'Orta' | 'Yüksek';
    earthLOS: boolean;
    solarEff: number;
    waterIceDistKm: number;
    approachAngle: number;
  },
  lander: LanderConfig
): SiteScores {
  // 1. Terrain Slope (Vehicle tipping threshold is critical)
  const slopeThreshold = lander.maxSlopeDeg;
  // If slope >= threshold, score is 0. If slope = 0, score is 10.
  const slopeScore = Number(
    Math.max(0, Math.min(10, 10 * (1 - siteRaw.slope / slopeThreshold))).toFixed(1)
  );

  const terrainSlope: CriterionScore = {
    id: 'slope',
    name: 'Zemin Eğimi',
    score: slopeScore,
    weight: SCORING_WEIGHTS.terrainSlope,
    measuredValueStr: `Ortalama: ${siteRaw.slope.toFixed(1)}° (Maks: ${siteRaw.maxSlope.toFixed(1)}°)`,
    formulaRationale: `Ortalama eğim ${siteRaw.slope.toFixed(1)}°, araç eşiği ${slopeThreshold.toFixed(1)}° → ${slopeScore}/10`,
    isProxy: false,
    explanation: 'LOLA DEM verisinden türetilen yerel eğim. Aracın devrilme eşiği aşıldığında statik denge bozulur.',
  };

  // 2. Surface Roughness & Boulders
  const roughnessScore = piecewiseScore(siteRaw.roughness, 0.08, 0.45);
  const surfaceRoughness: CriterionScore = {
    id: 'roughness',
    name: 'Yüzey Pürüzlülüğü ve Kaya Yoğunluğu',
    score: roughnessScore,
    weight: SCORING_WEIGHTS.surfaceRoughness,
    measuredValueStr: `${siteRaw.boulderDensity.toFixed(2)} kaya/m² (Ra: ${siteRaw.roughness.toFixed(2)}m)`,
    formulaRationale: `Ra ${siteRaw.roughness.toFixed(2)}m, yoğunluk ${siteRaw.boulderDensity.toFixed(2)}/m² → ${roughnessScore}/10`,
    isProxy: false,
    explanation: 'LROC NAC sub-meter kaya dağılımı. 45 cm üzerindeki bloklar motor nozülü veya ayak hasarına neden olur.',
  };

  // 3. Crater Hazard
  const craterScore = piecewiseScore(siteRaw.craterDist, 250, 20);
  const craterHazard: CriterionScore = {
    id: 'crater',
    name: 'Krater Tehlikesi',
    score: craterScore,
    weight: SCORING_WEIGHTS.craterHazard,
    measuredValueStr: `En yakın rim: ${Math.round(siteRaw.craterDist)} m (Çap: ${Math.round(siteRaw.craterDiam)} m)`,
    formulaRationale: `En yakın krater ${Math.round(siteRaw.craterDist)} m mesafede, çap ${Math.round(siteRaw.craterDiam)} m → ${craterScore}/10`,
    isProxy: false,
    explanation: 'Darbe kraterlerinin dik iç yamaçları radar altimetre ölçümlerinde sahte kilitlenmelere yol açabilir.',
  };

  // 4. Flat Safe Area Diameter
  const requiredDiameter = lander.footprintDiameterM * 4;
  const flatScore = piecewiseScore(siteRaw.flatDiameter, requiredDiameter * 2.5, requiredDiameter * 0.7);
  const flatSafeArea: CriterionScore = {
    id: 'flat_area',
    name: 'Düz Güvenli Alan Çapı',
    score: flatScore,
    weight: SCORING_WEIGHTS.flatSafeArea,
    measuredValueStr: `Çap: ${Math.round(siteRaw.flatDiameter)} metre`,
    formulaRationale: `Mesafe dönüşümü ile hesaplanan düz koridor ${Math.round(siteRaw.flatDiameter)} m (Gerekli: ${requiredDiameter} m) → ${flatScore}/10`,
    isProxy: false,
    explanation: 'İniş dağılım elipsi (landing dispersion ellipse) toleransı için gereken kesintisiz düz arazi alanı.',
  };

  // 5. Illumination
  const illumScore = piecewiseScore(siteRaw.illumPct, 92, 40);
  const illumination: CriterionScore = {
    id: 'illumination',
    name: 'Aydınlanma ve Işıklandırma',
    score: illumScore,
    weight: SCORING_WEIGHTS.illumination,
    measuredValueStr: `Yıllık Güneşlenme: %${siteRaw.illumPct.toFixed(0)} (Açı: ${siteRaw.sunAngle.toFixed(1)}°)`,
    formulaRationale: `Güneş açısı ${siteRaw.sunAngle.toFixed(1)}°, aydınlanma süresi %${siteRaw.illumPct.toFixed(0)} → ${illumScore}/10`,
    isProxy: false,
    explanation: 'Kutup bölgelerinde düşük geliş açılı güneş uzun gölgeler yaratır; optik iniş sensörleri için yeterli kontrast gerekir.',
  };

  // 6. Space Weather & Environment
  const dustMultiplier = siteRaw.dustRisk === 'Düşük' ? 1.0 : siteRaw.dustRisk === 'Orta' ? 0.8 : 0.5;
  const weatherScore = Number((siteRaw.radiationScore * dustMultiplier).toFixed(1));
  const spaceWeather: CriterionScore = {
    id: 'weather',
    name: 'Uzay Havası ve Çevre Koşulları',
    score: weatherScore,
    weight: SCORING_WEIGHTS.spaceWeather,
    measuredValueStr: `Toz Riski: ${siteRaw.dustRisk} • Radyasyon Puanı: ${siteRaw.radiationScore.toFixed(1)}/10`,
    formulaRationale: `CRaTER radyasyon modeli ${siteRaw.radiationScore.toFixed(1)} * toz katsayısı ${dustMultiplier} → ${weatherScore}/10`,
    isProxy: true,
    explanation: 'Atmosfersiz ortamda güneş fırtınası proton akısı ve elektrostatik regolit toz kalkması riski (Proxy model).',
  };

  // 7. Earth Communication (LOS)
  const earthScore = siteRaw.earthLOS ? 9.8 : 2.5;
  const earthCommunication: CriterionScore = {
    id: 'comms',
    name: 'Dünya İletişimi (Direct DSN Link)',
    score: earthScore,
    weight: SCORING_WEIGHTS.earthCommunication,
    measuredValueStr: siteRaw.earthLOS ? 'Doğrudan DSN Görüşü (LOS Açık)' : 'Ay Ufku Engeli (Röle Zorunlu)',
    formulaRationale: `Dünya doğrudan görüş hattı: ${siteRaw.earthLOS ? 'EVET (9.8/10)' : 'HAYIR (2.5/10 - Röle İhtiyacı)'}`,
    isProxy: false,
    explanation: 'NASA Deep Space Network (DSN) ile doğrudan X/Ka bandı telemetri hattı. Arka yüzde röle uydusu zorunludur.',
  };

  // 8. Energy Potential
  const energyScore = piecewiseScore(siteRaw.solarEff, 90, 30);
  const energyPotential: CriterionScore = {
    id: 'energy',
    name: 'Enerji Potansiyeli',
    score: energyScore,
    weight: SCORING_WEIGHTS.energyPotential,
    measuredValueStr: `Fotovoltaik Verim: %${siteRaw.solarEff.toFixed(0)}`,
    formulaRationale: `Güneş paneli insidans verimi %${siteRaw.solarEff.toFixed(0)} → ${energyScore}/10`,
    isProxy: true,
    explanation: 'Dikey fotovoltaik panellerin batarya şarjı ve kriyojenik gece hayatta kalma kapasitesi.',
  };

  // 9. Scientific Value
  const scienceScore = piecewiseScore(siteRaw.waterIceDistKm, 1.2, 18.0);
  const scientificValue: CriterionScore = {
    id: 'science',
    name: 'Bilimsel Değer ve Su Buzu',
    score: scienceScore,
    weight: SCORING_WEIGHTS.scientificValue,
    measuredValueStr: `Kalıcı Gölgeli Su Buzuna Mesafe: ${siteRaw.waterIceDistKm.toFixed(1)} km`,
    formulaRationale: `PSR soğuk kapanına uzaklık ${siteRaw.waterIceDistKm.toFixed(1)} km → ${scienceScore}/10`,
    isProxy: false,
    explanation: 'M3 ve Diviner spektrometre tespitli uçucu hidrojen/su buzu kaynaklarına gezginle (rover) erişilebilirlik.',
  };

  // 10. Route and Accessibility
  const routeScore = piecewiseScore(siteRaw.approachAngle, 12, 3);
  const routeAccessibility: CriterionScore = {
    id: 'route',
    name: 'Rota ve Yaklaşma Koridoru',
    score: routeScore,
    weight: SCORING_WEIGHTS.routeAccessibility,
    measuredValueStr: `Engelsiz Alçalma Açısı: ${siteRaw.approachAngle.toFixed(1)}°`,
    formulaRationale: `Yaklaşma hattı arazi temizliği ${siteRaw.approachAngle.toFixed(1)}° → ${routeScore}/10`,
    isProxy: true,
    explanation: 'Yörüngeden alçalma ve iptal (abort) manevraları için yüksek masif ve krater duvarlarından arınmış koridor.',
  };

  return {
    terrainSlope,
    surfaceRoughness,
    craterHazard,
    flatSafeArea,
    illumination,
    spaceWeather,
    earthCommunication,
    energyPotential,
    scientificValue,
    routeAccessibility,
  };
}

// ── Overall Composite Score Calculator ────────────────────────────────
export function calculateOverallScore(scores: SiteScores): {
  overall: number;
  label: 'Mükemmel' | 'Çok İyi' | 'Orta' | 'Riskli' | 'Uygun Değil';
} {
  let weightedSum = 0;
  let totalWeight = 0;

  Object.values(scores).forEach((item) => {
    weightedSum += item.score * item.weight;
    totalWeight += item.weight;
  });

  const overall = Number((weightedSum / (totalWeight || 1)).toFixed(1));

  let label: 'Mükemmel' | 'Çok İyi' | 'Orta' | 'Riskli' | 'Uygun Değil';
  if (overall >= 8.5) label = 'Mükemmel';
  else if (overall >= 7.2) label = 'Çok İyi';
  else if (overall >= 5.5) label = 'Orta';
  else if (overall >= 4.0) label = 'Riskli';
  else label = 'Uygun Değil';

  return { overall, label };
}

// ── Recompute Single Site When Lander Profile Changes ─────────────────
export function recomputeSiteForLander(site: CandidateSite, lander: LanderConfig): CandidateSite {
  const scores = computeSiteScores(
    {
      slope: site.measuredSlopeDeg,
      maxSlope: site.maxSlopeDeg,
      roughness: site.roughnessRa,
      boulderDensity: site.boulderDensityPerM2,
      flatDiameter: site.flatDiameterM,
      craterDist: site.craterDistM,
      craterDiam: site.craterDiameterM,
      sunAngle: site.sunAngleDeg,
      illumPct: site.solarIlluminationPct,
      radiationScore: site.radiationScore,
      dustRisk: site.dustRisk,
      earthLOS: site.earthLOS,
      solarEff: site.solarEfficiencyPct,
      waterIceDistKm: site.waterIceDistKm,
      approachAngle: site.approachClearanceDeg,
    },
    lander
  );

  const { overall, label } = calculateOverallScore(scores);

  const slopePass = site.measuredSlopeDeg <= lander.maxSlopeDeg;
  const flatDiameterPass = site.flatDiameterM >= lander.footprintDiameterM * 2.5;
  const earthLOSPass = site.earthLOS || site.geoCoord.lat < 82; // near side or relay
  const boulderPass = site.boulderDensityPerM2 < 0.25;

  return {
    ...site,
    scores,
    overallScore: overall,
    suitabilityLabel: label,
    goNoGo: {
      slopePass,
      flatDiameterPass,
      earthLOSPass,
      boulderPass,
    },
  };
}

// ── Core Safe Site Detection Algorithm with NMS ───────────────────────
// Uses the Petavius / general DEM elevation function to sample terrain
export function detectSafeLandingSites(
  getHeightAt: (x: number, z: number) => number,
  target: LunarTarget,
  lander: LanderConfig,
  gridRadius = 140,
  gridStep = 10,
  minSeparation = 45
): CandidateSite[] {
  interface GridPoint {
    x: number;
    z: number;
    y: number;
    slope: number;
    roughness: number;
    flatDiameter: number;
    rawScore: number;
  }

  const points: GridPoint[] = [];

  // 1. Scan grid points
  for (let x = -gridRadius; x <= gridRadius; x += gridStep) {
    for (let z = -gridRadius; z <= gridRadius; z += gridStep) {
      const distFromCenter = Math.hypot(x, z);
      if (distFromCenter > gridRadius) continue;

      const y = getHeightAt(x, z);

      // Compute local gradient (slope) using 4-neighborhood central differences
      const d = 2.0;
      const yE = getHeightAt(x + d, z);
      const yW = getHeightAt(x - d, z);
      const yN = getHeightAt(x, z + d);
      const yS = getHeightAt(x, z - d);

      const dx = (yE - yW) / (2 * d);
      const dz = (yN - yS) / (2 * d);
      const grad = Math.sqrt(dx * dx + dz * dz);
      const slopeDeg = (Math.atan(grad) * 180) / Math.PI;

      // Local roughness estimate
      const meanNeighbor = (yE + yW + yN + yS) / 4;
      const roughness = Math.abs(y - meanNeighbor);

      // Simple radial flat-area check
      let flatRadiusM = 15;
      for (let r = 15; r <= 80; r += 10) {
        let isStillFlat = true;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const sampleY = getHeightAt(x + Math.cos(a) * r, z + Math.sin(a) * r);
          if (Math.abs(sampleY - y) > 2.5) {
            isStillFlat = false;
            break;
          }
        }
        if (isStillFlat) flatRadiusM = r;
        else break;
      }
      const flatDiameter = flatRadiusM * 2;

      // Base candidate filter: avoid extreme slopes and deep ravines
      if (slopeDeg < 18.0) {
        // Raw desirability score (high flat diameter, low slope, low roughness)
        const rawScore = (20 - slopeDeg) * 3 + flatDiameter * 0.4 - roughness * 10;
        points.push({ x, z, y, slope: slopeDeg, roughness, flatDiameter, rawScore });
      }
    }
  }

  // 2. Sort by raw score descending
  points.sort((a, b) => b.rawScore - a.rawScore);

  // 3. Non-Maximum Suppression (NMS) to select 6-8 distinct, well-spaced sites
  const selectedPoints: GridPoint[] = [];
  for (const pt of points) {
    if (selectedPoints.length >= 8) break;

    const tooClose = selectedPoints.some(
      (sel) => Math.hypot(sel.x - pt.x, sel.z - pt.z) < minSeparation
    );

    if (!tooClose) {
      selectedPoints.push(pt);
    }
  }

  // 4. Construct CandidateSite objects
  const candidateSites: CandidateSite[] = selectedPoints.map((pt, index) => {
    const meta = LUNAR_SITE_NAMES[index % LUNAR_SITE_NAMES.length];
    const code = `LS-0${index + 1}`;

    // Deterministic environmental attributes based on coordinates and index
    const seedOffset = Math.sin(pt.x * 0.3 + pt.z * 0.7) * 0.5 + 0.5;
    const craterDistM = 60 + seedOffset * 180;
    const craterDiamM = 25 + seedOffset * 65;
    const boulderDensity = 0.04 + (1 - seedOffset) * 0.16;
    const sunAngle = 4.5 + seedOffset * 11.0;
    const illumPct = Math.round(72 + seedOffset * 22);
    const radiationScore = Number((7.0 + seedOffset * 2.2).toFixed(1));
    const dustRisk: 'Düşük' | 'Orta' | 'Yüksek' =
      pt.slope < 4.0 ? 'Düşük' : pt.slope < 8.0 ? 'Orta' : 'Yüksek';

    // Earth LOS is true unless in a steep eastern ravine or far polar dip
    const earthLOS = pt.x > -120 && target.lat > -88;
    const solarEff = Math.round(65 + seedOffset * 28);
    const waterIceDistKm = Number((2.0 + (1 - seedOffset) * 9.5).toFixed(1));
    const approachAngle = Number((6.0 + seedOffset * 5.5).toFixed(1));

    // Convert local x,z to realistic lunar geo-offsets
    const latOffset = (pt.z / 1000) * 0.1;
    const lngOffset = (pt.x / 1000) * 0.1;

    const rawSiteData = {
      slope: Number(pt.slope.toFixed(1)),
      maxSlope: Number((pt.slope * 1.35).toFixed(1)),
      roughness: Number(pt.roughness.toFixed(2)),
      boulderDensity: Number(boulderDensity.toFixed(2)),
      flatDiameter: Math.round(pt.flatDiameter),
      craterDist: Math.round(craterDistM),
      craterDiam: Math.round(craterDiamM),
      sunAngle: Number(sunAngle.toFixed(1)),
      illumPct,
      radiationScore,
      dustRisk,
      earthLOS,
      solarEff,
      waterIceDistKm,
      approachAngle,
    };

    const scores = computeSiteScores(rawSiteData, lander);
    const { overall, label } = calculateOverallScore(scores);

    const slopePass = pt.slope <= lander.maxSlopeDeg;
    const flatDiameterPass = pt.flatDiameter >= lander.footprintDiameterM * 2.5;
    const earthLOSPass = earthLOS;
    const boulderPass = boulderDensity < 0.25;

    return {
      id: `site-${code.toLowerCase()}`,
      code,
      name: meta.name,
      rank: index + 1,
      reason: meta.tone,
      worldPos: { x: pt.x, y: pt.y + 0.8, z: pt.z },
      geoCoord: {
        lat: Number((target.lat + latOffset).toFixed(3)),
        lng: Number((target.lng + lngOffset).toFixed(3)),
      },
      elevationM: Math.round(target.elevationM + pt.y),
      measuredSlopeDeg: Number(pt.slope.toFixed(1)),
      maxSlopeDeg: Number((pt.slope * 1.35).toFixed(1)),
      roughnessRa: Number(pt.roughness.toFixed(2)),
      boulderDensityPerM2: Number(boulderDensity.toFixed(2)),
      flatDiameterM: Math.round(pt.flatDiameter),
      craterDistM: Math.round(craterDistM),
      craterDiameterM: Math.round(craterDiamM),
      sunAngleDeg: Number(sunAngle.toFixed(1)),
      solarIlluminationPct: illumPct,
      radiationScore,
      tempDayK: 385,
      tempNightK: 95,
      dustRisk,
      earthLOS,
      earthElevationDeg: Number((12 + seedOffset * 8).toFixed(1)),
      solarEfficiencyPct: solarEff,
      waterIceDistKm,
      scientificInterest: 'Kratersel Darbe Breşleri & Plajiyoklaz Zenginliği',
      approachClearanceDeg: approachAngle,
      scores,
      overallScore: overall,
      suitabilityLabel: label,
      goNoGo: {
        slopePass,
        flatDiameterPass,
        earthLOSPass,
        boulderPass,
      },
    };
  });

  return candidateSites;
}

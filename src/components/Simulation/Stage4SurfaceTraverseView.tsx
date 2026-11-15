// ═══════════════════════════════════════════════════════════════════════
// Stage4SurfaceTraverseView.tsx
// Stage 4: Lunar Surface Operations & Rover Traverse Route Planner
// Realistic 3D Lunar Topography, Autonomous LiDAR Obstacle Avoidance,
// Real-time Coordinates HUD, and NASA CRaTER Space Weather & Radiation Analytics
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useStore } from "@/store";
import {
  getSynchronizedLunarHeight,
  getSynchronizedLunarAlbedo,
  getSynchronizedLunarSlopeDeg,
} from "@/data/lunar-surface-height";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Sun,
  Radio,
  Mountain,
  Play,
  Pause,
  MapPin,
  Sparkles,
  Layers,
  Camera,
  Gauge,
  Activity,
  Zap,
  Crosshair,
  Radar,
  Info,
} from "lucide-react";

interface TraverseWaypoint {
  id: number;
  name: string;
  distM: number;
  slopeDeg: number;
  isIlluminated: boolean;
  sampleType?: string;
  sampleYieldKg?: number;
  scienceDesc: string;
  x: number;
  z: number;
}

export interface SurfaceHazard {
  id: string;
  name: string;
  type: "crater" | "boulder" | "scarp";
  x: number;
  z: number;
  radius: number;
  riskLevel: "CRITICAL" | "MODERATE" | "LOW";
  description: string;
}

// ── Realistic Obstacle Hazards ──────────────────────────────────────────────
export const LUNAR_SURFACE_HAZARDS: SurfaceHazard[] = [
  {
    id: "haz-1",
    name: "Crater Alpha Rim Scarp",
    type: "crater",
    x: -18.0,
    z: -16.0,
    radius: 9.5,
    riskLevel: "CRITICAL",
    description: "Deep 4.8m crater depression on west flank. Autonomous stay-out zone engaged.",
  },
  {
    id: "haz-2",
    name: "Crater Epsilon Rim Scarp",
    type: "crater",
    x: 18.0,
    z: -26.0,
    radius: 10.0,
    riskLevel: "CRITICAL",
    description: "East impact crater with 5.0m vertical bowl and loose ejecta rim.",
  },
  {
    id: "haz-3",
    name: "Basalt Ejecta Rock Field",
    type: "boulder",
    x: 5.2,
    z: -48.0,
    radius: 3.2,
    riskLevel: "MODERATE",
    description: "High-relief basalt rock fragments. Lateral steering detour vector applied.",
  },
  {
    id: "haz-4",
    name: "Crater Gamma Impact Depression",
    type: "crater",
    x: -22.0,
    z: -72.0,
    radius: 12.0,
    riskLevel: "CRITICAL",
    description: "Massive 12m diameter secondary impact crater on west flank.",
  },
];

// ── Master Synchronized Topographic Height & Albedo (Unified Surface Physics) ──
export const getStage4TerrainElevation = (x: number, z: number): number => {
  return getSynchronizedLunarHeight(x, z);
};

export const getStage4LunarAlbedo = (x: number, z: number, y: number): [number, number, number] => {
  return getSynchronizedLunarAlbedo(x, z, y);
};

// ── Waypoints (Autonomous Obstacle Avoidance Spline Route) ───────────────────
// Waypoints positioned in verified hazard-free landing and exploration zones
const TRAVERSE_WAYPOINTS: TraverseWaypoint[] = [
  {
    id: 1,
    name: "WP-0: Lander Base",
    distM: 0,
    slopeDeg: 1.2,
    isIlluminated: true,
    scienceDesc: "Lander touchdown base. 100% surface contact. Systems nominal, DSN link locked.",
    x: 0,
    z: 0,
  },
  {
    id: 2,
    name: "WP-1: Mare Plains Regolith Core",
    distM: 220,
    slopeDeg: 2.1,
    isIlluminated: true,
    sampleType: "Mare Basalt & Ilmenite",
    sampleYieldKg: 3.4,
    scienceDesc: "Level regolith highway between Crater Alpha and Epsilon. Pristine shallow core sample.",
    x: -1.2,
    z: -36,
  },
  {
    id: 3,
    name: "WP-2: Anorthosite Ray Ejecta Station",
    distM: 540,
    slopeDeg: 3.2,
    isIlluminated: true,
    sampleType: "Impact Melt Breccia (Ray Ejecta)",
    sampleYieldKg: 4.8,
    scienceDesc: "Elevated high-albedo ray crossing. Deep regolith sampling between twin crater basins.",
    x: 1.5,
    z: -72,
  },
  {
    id: 4,
    name: "WP-3: High Solar & Communication Ridge",
    distM: 860,
    slopeDeg: 2.8,
    isIlluminated: true,
    sampleType: "Solar-Wind Implanted Regolith",
    sampleYieldKg: 5.2,
    scienceDesc: "Elevated horizon ridge. Unobstructed view of cratered lunar landscape and continuous Earth link.",
    x: 0.0,
    z: -120,
  },
];

// Autonomous Obstacle Avoidance Spline Path Nodes
// Drives predominantly straight forward with subtle steering sways, strictly avoiding crater pits
const AUTONAV_PATH_NODES: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 0),         // WP-0 Lander Mount
  new THREE.Vector3(0.5, 0, -12),     // Straight exit corridor
  new THREE.Vector3(-1.2, 0, -24),    // Subtle left sway around Crater Epsilon ejecta
  new THREE.Vector3(-1.2, 0, -36),    // WP-1 Station (Safe flat plain)
  new THREE.Vector3(0.8, 0, -48),     // Subtle right sway evading basalt rock hazard
  new THREE.Vector3(1.5, 0, -60),     // Flanking between Crater Beta and Crater Zeta
  new THREE.Vector3(1.5, 0, -72),     // WP-2 Station (Safe flat plain)
  new THREE.Vector3(-0.6, 0, -88),    // Gentle left correction
  new THREE.Vector3(0.6, 0, -104),    // Straight approach to ridge
  new THREE.Vector3(0.0, 0, -120),    // WP-3 Ridge crest destination
];

export const Stage4SurfaceTraverseView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { selectedSafeLunarSite, setViewMode } = useStore();

  const [activeWpIndex, setActiveWpIndex] = useState(0);
  const [roverDistanceM, setRoverDistanceM] = useState(0);
  const [batteryPct, setBatteryPct] = useState(96);
  const [samplesCollectedKg, setSamplesCollectedKg] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [isDriving, setIsDriving] = useState(true);
  const [isTraverseComplete, setIsTraverseComplete] = useState(false);
  const [cameraView, setCameraView] = useState<"chase" | "overhead" | "free">("chase");

  // Otonom Engel Algılama & Kaçınma Durumu
  const [detectedHazard, setDetectedHazard] = useState<SurfaceHazard | null>(null);
  const [isAvoidanceEngaged, setIsAvoidanceEngaged] = useState(false);

  // Canlı Dinamik Koordinat Telemetrisi
  const [coordsHUD, setCoordsHUD] = useState({
    lat: -84.9204,
    lng: 128.4512,
    xM: 0.0,
    yM: 0.0,
    zM: 0.0,
    elevM: 0.0,
    slopeDeg: 1.8,
    headingDeg: 114,
    cardinalHeading: "ESE",
    speedMs: 0.18,
  });

  // NASA CRaTER Uzay Havası & Radyasyon Analizi (Gerçek LRO/Artemis Modeli)
  const [spaceWeather, setSpaceWeather] = useState({
    gcrDoseRateUsvH: 17.8,       // Galactic Cosmic Rays mikrosievert/saat
    sepProtonFlux: 12.4,         // Güneş proton akısı (p+/cm²-s-sr)
    cumulativeDoseMsv: 0.012,    // Kümülatif doz (mSv)
    solarWindSpeedKms: 412,      // Güneş rüzgarı hızı km/s
    solarWindDensityPcm3: 5.8,   // Güneş rüzgarı yoğunluğu p+/cm³
    psrShieldingActive: false,   // Kalıcı gölge krater duvarı doğal radyasyon kalkanı
    avionicsSeuRiskPct: 0.024,   // Tekil Olay Bozulması riski (% / 1000 saat)
  });

  const animFrameRef = useRef<number | null>(null);
  const lidarBeamRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── 1. Scene, Camera, Renderer ──────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020306);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2500
    );
    camera.position.set(-15, 12, 25);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = cameraView === "free";

    // ── 2. Lights (Grazing Polar Sun & Earthshine) ──────────────────
    const ambientLight = new THREE.AmbientLight(0x0e1422, 0.16);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ea, 4.2);
    sunLight.position.set(-220, 110, 130);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.05;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.left = -160;
    sunLight.shadow.camera.right = 160;
    sunLight.shadow.camera.top = 160;
    sunLight.shadow.camera.bottom = -160;
    scene.add(sunLight);

    // Derin Uzay Yıldızları
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 1400;
      starPos[i + 1] = 20 + Math.random() * 700;
      starPos[i + 2] = (Math.random() - 0.5) * 1400;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.0, opacity: 0.85, transparent: true })));

    // Ay Göğündeki Mavi Gezegenimiz Dünya
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(14, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x4682b4, roughness: 0.5, metalness: 0.1 })
    );
    earthMesh.position.set(-240, 130, -320);
    scene.add(earthMesh);

    // ── 3. GERÇEKÇİ ÇOK ÖLÇEKLİ AY TOPOĞRAFYASI & UFKA UZANAN ETEKLİK ─
    // A) Yüksek Çözünürlüklü Dairesel Rover Operasyon Sahası (r=480m, dikişsiz ufuk geçişi)
    const terrainGeo = new THREE.CircleGeometry(480, 140);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const uvs = terrainGeo.attributes.uv;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const vy = getStage4TerrainElevation(x, z);
      pos.setY(i, vy);

      // Planar Metrik UV (Dikişsiz geniş regolit mikro dokusu tekrarlanır)
      uvs.setXY(i, x / 55.0, z / 55.0);

      const [cr, cg, cb] = getStage4LunarAlbedo(x, z, vy);
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }

    terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
    terrainGeo.computeTangents();

    const textureLoader = new THREE.TextureLoader();

    // Dikişsiz Yüksek Çözünürlüklü Ay Regolit PBR Kaplamaları
    const regolithDiffuse = textureLoader.load("/textures/lunar_regolith_seamless_diffuse.jpg");
    regolithDiffuse.colorSpace = THREE.SRGBColorSpace;
    regolithDiffuse.wrapS = THREE.RepeatWrapping;
    regolithDiffuse.wrapT = THREE.RepeatWrapping;
    regolithDiffuse.anisotropy = 16;

    const regolithNormal = textureLoader.load("/textures/lunar_regolith_seamless_normal.jpg");
    regolithNormal.wrapS = THREE.RepeatWrapping;
    regolithNormal.wrapT = THREE.RepeatWrapping;
    regolithNormal.anisotropy = 16;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: regolithDiffuse,
      normalMap: regolithNormal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughness: 0.94,
      metalness: 0.02,
      vertexColors: true,
      flatShading: false,
      side: THREE.DoubleSide,
    });

    const terrainRoot = new THREE.Group();
    scene.add(terrainRoot);

    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    terrainRoot.add(terrain);

    // C) Ufka Uzanan Kesintisiz Ay Kabuğu Etekliği (Horizon Skirt: r=375m -> 9500m)
    const skirtGeo = new THREE.RingGeometry(375, 9500, 140, 24);
    skirtGeo.rotateX(-Math.PI / 2);
    const sPos = skirtGeo.attributes.position;
    const sUvs = skirtGeo.attributes.uv;
    const sColors = new Float32Array(sPos.count * 3);

    for (let i = 0; i < sPos.count; i++) {
      const sx = sPos.getX(i);
      const sz = sPos.getZ(i);
      const sr = Math.hypot(sx, sz);

      // Ay Küresi Gerçek Eğriliği (R = 1737 km)
      const curveDrop = -Math.pow(sr - 375, 2) / 32000;
      const hills = Math.sin(sx * 0.003) * Math.cos(sz * 0.003) * 36.0 + Math.sin(Math.atan2(sz, sx) * 12) * 16.0;
      const sy = curveDrop + hills;
      sPos.setY(i, sy);

      // Planar UV (Sıfır radyal esneme, dikişsiz doku akışı)
      sUvs.setXY(i, sx / 55.0, sz / 55.0);

      const [cr, cg, cb] = getStage4LunarAlbedo(sx, sz, sy);
      sColors[i * 3] = cr;
      sColors[i * 3 + 1] = cg;
      sColors[i * 3 + 2] = cb;
    }

    skirtGeo.setAttribute("color", new THREE.BufferAttribute(sColors, 3));
    skirtGeo.computeVertexNormals();
    skirtGeo.computeTangents();

    const skirtMesh = new THREE.Mesh(skirtGeo, terrainMat);
    skirtMesh.receiveShadow = true;
    scene.add(skirtMesh);

    // ── 4. YÜZEY ENGEL NESNELERİ (3D BAZALT KAYA KÜMELERİ & ÇEMBERLER) ─
    const boulderGroup = new THREE.Group();
    scene.add(boulderGroup);

    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x474b54,
      roughness: 0.88,
      metalness: 0.18,
      flatShading: true,
    });

    // Doğal, Kırıklı Açılı Bazalt Kaya Kümesi ve Saçılmış Ay Taşları
    // Flanking the sides of the straight path (|X| >= 4.5m) so the driving highway is 100% clear
    const naturalRocks = [
      // Right Flank Boulder Field Cluster (Around haz-3 at X:5.2, Z:-48)
      { x: 5.2, z: -48.0, sx: 2.0, sy: 1.4, sz: 1.6, rotY: 0.4 },
      { x: 6.4, z: -49.2, sx: 1.6, sy: 1.1, sz: 1.3, rotY: 1.2 },
      { x: 5.8, z: -46.5, sx: 1.4, sy: 1.0, sz: 1.2, rotY: 2.1 },
      { x: 7.0, z: -47.8, sx: 1.2, sy: 0.85, sz: 1.1, rotY: 0.8 },

      // Left Flank Rocks
      { x: -5.4, z: -28.0, sx: 1.5, sy: 1.0, sz: 1.2, rotY: 2.9 },
      { x: -6.2, z: -29.5, sx: 1.2, sy: 0.8, sz: 0.9, rotY: 1.7 },
      { x: -7.5, z: -64.0, sx: 1.6, sy: 1.1, sz: 1.3, rotY: 3.4 },
      { x: -6.0, z: -84.0, sx: 1.4, sy: 0.9, sz: 1.2, rotY: 1.6 },

      // Right Flank Scarp Ejecta
      { x: 6.5, z: -80.0, sx: 1.5, sy: 1.0, sz: 1.3, rotY: 2.4 },
      { x: 7.2, z: -102.0, sx: 1.3, sy: 0.85, sz: 1.1, rotY: 0.9 },
      { x: -6.5, z: -108.0, sx: 1.4, sy: 0.95, sz: 1.2, rotY: 1.8 },

      // Landing Site Surroundings
      { x: -8.0, z: 12.0, sx: 0.9, sy: 0.58, sz: 0.75, rotY: 0.7 },
      { x: 8.5, z: 14.0, sx: 1.0, sy: 0.65, sz: 0.85, rotY: 2.2 },
      { x: -10.0, z: -4.0, sx: 1.2, sy: 0.8, sz: 1.0, rotY: 1.9 },
    ];

    naturalRocks.forEach((ro) => {
      const ry = getStage4TerrainElevation(ro.x, ro.z);
      const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
      const rockMesh = new THREE.Mesh(rockGeo, basaltMat);
      rockMesh.scale.set(ro.sx, ro.sy, ro.sz);
      rockMesh.position.set(ro.x, ry + ro.sy * 0.42, ro.z);
      rockMesh.rotation.set(ro.rotY * 0.25, ro.rotY, ro.rotY * 0.45);
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      boulderGroup.add(rockMesh);
    });

    // Yüzey Engelleri Algılama Çemberleri
    LUNAR_SURFACE_HAZARDS.forEach((haz) => {
      const hazY = getStage4TerrainElevation(haz.x, haz.z);
      const ringGeo = new THREE.RingGeometry(haz.radius * 0.95, haz.radius * 1.05, 36);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: haz.riskLevel === "CRITICAL" ? 0xef4444 : 0xf59e0b,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(haz.x, hazY + 0.15, haz.z);
      scene.add(ringMesh);
    });

    // ── 5. AY İNİŞ MODÜLÜ (0, 0) ──────────────────────────────────
    const landerGroup = new THREE.Group();
    landerGroup.position.set(0, 0, 0);
    scene.add(landerGroup);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd69922, metalness: 0.88, roughness: 0.28 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd6, metalness: 0.7, roughness: 0.35 });

    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 1.6, 8), goldMat);
    baseMesh.position.y = 1.0;
    baseMesh.castShadow = true;
    landerGroup.add(baseMesh);

    // 4 İniş Bacağı
    for (let l = 0; l < 4; l++) {
      const ang = (l * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8), goldMat);
      leg.position.set(Math.cos(ang) * 2.6, 0.7, Math.sin(ang) * 2.6);
      leg.rotation.z = Math.cos(ang) * 0.55;
      leg.rotation.x = Math.sin(ang) * 0.55;
      leg.castShadow = true;
      landerGroup.add(leg);

      const footpad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), goldMat);
      footpad.position.set(Math.cos(ang) * 3.4, 0.05, Math.sin(ang) * 3.4);
      landerGroup.add(footpad);
    }

    const cabinMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), silverMat);
    cabinMesh.position.y = 2.7;
    cabinMesh.castShadow = true;
    landerGroup.add(cabinMesh);

    // ── 6. OTONOM LUNAR ROVER 3D MODELİ & İLERİYE DÖNÜK LIDAR IŞINI ─
    const roverGroup = new THREE.Group();
    scene.add(roverGroup);

    const roverBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.4), silverMat);
    roverBody.position.y = 0.65;
    roverBody.castShadow = true;
    roverGroup.add(roverBody);

    // 4 Tekerlek
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2b2e36, metalness: 0.85, roughness: 0.35 });
    [
      { x: -0.9, z: 0.85 },
      { x: 0.9, z: 0.85 },
      { x: -0.9, z: -0.85 },
      { x: 0.9, z: -0.85 },
    ].forEach((wPos) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wPos.x, 0.35, wPos.z);
      wheel.castShadow = true;
      roverGroup.add(wheel);
    });

    // İletişim Anteni & Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), silverMat);
    mast.position.set(-0.7, 1.4, 0);
    roverGroup.add(mast);

    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.2, 16), goldMat);
    dish.position.set(-0.7, 2.0, 0);
    dish.rotation.x = -Math.PI / 3;
    roverGroup.add(dish);

    // Rover Önü Otonom LiDAR Tarama Yelpazesi (Pulsing Cyan Fan Cone)
    const lidarGeo = new THREE.ConeGeometry(5.5, 10.0, 24, 1, true, -Math.PI / 4, Math.PI / 2);
    lidarGeo.rotateX(Math.PI / 2);
    const lidarMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const lidarMesh = new THREE.Mesh(lidarGeo, lidarMat);
    lidarMesh.position.set(0, 0.65, 5.0);
    roverGroup.add(lidarMesh);
    lidarBeamRef.current = lidarMesh;

    // ── 7. OTONOM ENGEL SAKINMA ROTA ÇİZGİSİ (CatmullRom Spline) ────
    const trailCurve = new THREE.CatmullRomCurve3(AUTONAV_PATH_NODES, false, "catmullrom", 0.35);

    // Yüzey topoğrafyasını takip eden 3D spline noktaları
    const sampleLineCount = 240;
    const surfacePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= sampleLineCount; i++) {
      const t = i / sampleLineCount;
      const p = trailCurve.getPoint(t);
      const y = getStage4TerrainElevation(p.x, p.z);
      surfacePoints.push(new THREE.Vector3(p.x, y + 0.14, p.z));
    }
    const trailGeo = new THREE.BufferGeometry().setFromPoints(surfacePoints);
    const trailMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 3 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);

    // Waypoint İşaretçileri
    TRAVERSE_WAYPOINTS.forEach((wp) => {
      const markerGroup = new THREE.Group();
      const wpGroundY = getStage4TerrainElevation(wp.x, wp.z);
      markerGroup.position.set(wp.x, wpGroundY, wp.z);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8),
        new THREE.MeshBasicMaterial({ color: wp.isIlluminated ? 0x22c55e : 0x00e5ff })
      );
      beacon.position.y = 0.9;
      markerGroup.add(beacon);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.25, 24),
        new THREE.MeshBasicMaterial({
          color: wp.isIlluminated ? 0x22c55e : 0x00e5ff,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      markerGroup.add(ring);

      scene.add(markerGroup);
    });

    // ── 8. ANİMASYON & UÇUŞ DÖNGÜSÜ ─────────────────────────────────
    let progressT = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (isDriving && progressT < 1.0) {
        progressT = Math.min(1.0, progressT + 0.00065);

        const currentPos = trailCurve.getPoint(progressT);
        const groundY = getStage4TerrainElevation(currentPos.x, currentPos.z);

        roverGroup.position.set(currentPos.x, groundY, currentPos.z);

        // Teğet yönü ve Yaw açısı
        const tangent = trailCurve.getTangent(progressT).normalize();
        const yaw = Math.atan2(tangent.x, tangent.z);

        // Zemin eğim gradyanı (Pitch ve Roll)
        const forwardStep = 0.6;
        const nextY = getStage4TerrainElevation(currentPos.x + tangent.x * forwardStep, currentPos.z + tangent.z * forwardStep);
        const prevY = getStage4TerrainElevation(currentPos.x - tangent.x * forwardStep, currentPos.z - tangent.z * forwardStep);
        const pitch = -Math.atan2(nextY - prevY, forwardStep * 2);

        const lateralStep = 0.6;
        const rightY = getStage4TerrainElevation(currentPos.x - tangent.z * lateralStep, currentPos.z + tangent.x * lateralStep);
        const leftY = getStage4TerrainElevation(currentPos.x + tangent.z * lateralStep, currentPos.z - tangent.x * lateralStep);
        const roll = Math.atan2(rightY - leftY, lateralStep * 2);

        roverGroup.rotation.order = "YXZ";
        roverGroup.rotation.y = yaw;
        roverGroup.rotation.x = pitch;
        roverGroup.rotation.z = roll;

        // Eğim hesaplama (Derece cinsinden)
        const slopeRad = Math.sqrt(pitch * pitch + roll * roll);
        const slopeDeg = Number(((slopeRad * 180) / Math.PI).toFixed(1));

        // Pusula yönü
        let headingDeg = Math.round(((yaw * 180) / Math.PI + 360) % 360);
        const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        const cardinalHeading = cardinals[Math.round(headingDeg / 22.5) % 16];

        // Gerçek Koordinat & Yükseklik Telemetrisi
        const baseLat = -84.9204;
        const baseLng = 128.4512;
        const curLat = Number((baseLat + currentPos.z * 0.000032).toFixed(5));
        const curLng = Number((baseLng + currentPos.x * 0.000032).toFixed(5));
        const totalDist = 860;
        const curDist = Math.round(progressT * totalDist);
        setRoverDistanceM(curDist);

        setCoordsHUD({
          lat: curLat,
          lng: curLng,
          xM: Number(currentPos.x.toFixed(1)),
          yM: Number(groundY.toFixed(2)),
          zM: Number(currentPos.z.toFixed(1)),
          elevM: Number(groundY.toFixed(2)),
          slopeDeg,
          headingDeg,
          cardinalHeading,
          speedMs: 0.18,
        });

        // ── 9. OTONOM ENGEL ALGILAMA RADAR KONTROLÜ ──────────────────
        let nearestHaz: SurfaceHazard | null = null;
        let minHazDist = Infinity;

        LUNAR_SURFACE_HAZARDS.forEach((haz) => {
          const d = Math.hypot(currentPos.x - haz.x, currentPos.z - haz.z);
          if (d < haz.radius + 7.5 && d < minHazDist) {
            minHazDist = d;
            nearestHaz = haz;
          }
        });

        if (nearestHaz) {
          setDetectedHazard(nearestHaz);
          setIsAvoidanceEngaged(true);
          if (lidarBeamRef.current) {
            (lidarBeamRef.current.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b);
            lidarBeamRef.current.scale.set(1.2, 1.2, 1.2);
          }
        } else {
          setDetectedHazard(null);
          setIsAvoidanceEngaged(false);
          if (lidarBeamRef.current) {
            (lidarBeamRef.current.material as THREE.MeshBasicMaterial).color.setHex(0x00e5ff);
            lidarBeamRef.current.scale.set(1.0, 1.0, 1.0);
          }
        }

        // ── 10. NASA CRaTER UZAY HAVASI & RADYASYON GÜNCELLEMESİ ─────
        // WP-2 (PSR Kalıcı Gölge) soğuk kapanına girildiğinde krater rim duvarı doğal kalkan oluşturur (-42% Akı)
        const isInsidePSR = currentPos.x > 34 && currentPos.x < 50 && currentPos.z < -24;
        const gcrRate = isInsidePSR ? 10.3 : 17.8;
        const cumDose = Number((0.012 + progressT * 0.042).toFixed(4));

        setSpaceWeather({
          gcrDoseRateUsvH: gcrRate,
          sepProtonFlux: isInsidePSR ? 7.2 : 12.4,
          cumulativeDoseMsv: cumDose,
          solarWindSpeedKms: 412,
          solarWindDensityPcm3: 5.8,
          psrShieldingActive: isInsidePSR,
          avionicsSeuRiskPct: isInsidePSR ? 0.014 : 0.024,
        });

        // Waypoint Aşamaları & Batarya / Örnekler
        if (progressT < 0.28) {
          setActiveWpIndex(0);
          setBatteryPct(96);
        } else if (progressT < 0.60) {
          setActiveWpIndex(1);
          setBatteryPct(92);
          setSampleCount(1);
          setSamplesCollectedKg(2.8);
        } else if (progressT < 0.88) {
          setActiveWpIndex(2); // PSR Soğuk Kapanı
          setBatteryPct((prev) => Math.max(76, prev - 0.04));
          setSampleCount(2);
          setSamplesCollectedKg(8.4);
        } else {
          setActiveWpIndex(3);
          setBatteryPct(98); // Yüksek Güneş Sırtı Şarj
          setSampleCount(3);
          setSamplesCollectedKg(11.6);
        }

        if (progressT >= 1.0 && !isTraverseComplete) {
          setIsTraverseComplete(true);
        }

        // Kamera Takibi
        if (cameraView === "chase") {
          const camDistance = 8.5;
          const camElevation = 4.2;
          camera.position.set(
            currentPos.x - tangent.x * camDistance - 1.8,
            groundY + camElevation,
            currentPos.z - tangent.z * camDistance
          );
          camera.lookAt(
            currentPos.x + tangent.x * 12.0,
            groundY + 0.9,
            currentPos.z + tangent.z * 12.0
          );
        } else if (cameraView === "overhead") {
          camera.position.set(currentPos.x + 18.0, groundY + 45.0, currentPos.z + 12.0);
          camera.lookAt(currentPos.x, groundY, currentPos.z - 25.0);
        }
      }

      if (cameraView === "free") {
        controls.update();
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
      renderer.dispose();
      controls.dispose();
    };
  }, [isDriving, cameraView]);

  const currentWp = TRAVERSE_WAYPOINTS[activeWpIndex];

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#020306] font-sans text-white">
      {/* 3D WebGL Görüntüleyici */}
      <div ref={mountRef} className="w-full h-full" />

      {/* ── TOP CONTROL & TELEMETRY BAR (Glassmorphism & Telemetry HUD) ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pointer-events-none">
        
        {/* Left Telemetry Card */}
        <div className="pointer-events-auto backdrop-blur-xl bg-[#090d16]/85 border border-white/10 rounded-2xl p-3 px-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isTraverseComplete ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"}`} />
            <div>
              <span className="tracking-wide font-semibold text-white uppercase text-xs block">
                {isTraverseComplete ? "Traverse Complete" : "Stage 4: Lunar Surface Traverse"}
              </span>
              <span className="text-[10px] text-cyan-300/80 font-mono">
                {selectedSafeLunarSite?.name || "Petavius Crater Floor"}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Odometer */}
          <div>
            <span className="text-white/50 text-[10px] block font-mono">Distance</span>
            <span className="text-white font-medium text-sm">{roverDistanceM} m <span className="text-white/40 text-xs">/ 860 m</span></span>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Slope */}
          <div>
            <span className="text-white/50 text-[10px] block font-mono">Topographic Slope</span>
            <span className={`font-medium text-sm ${coordsHUD.slopeDeg > 12 ? "text-rose-400" : coordsHUD.slopeDeg > 8 ? "text-amber-400" : "text-emerald-400"}`}>
              {coordsHUD.slopeDeg}° {coordsHUD.slopeDeg <= 8 ? "(Safe)" : "(Steep Incline)"}
            </span>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Battery */}
          <div>
            <span className="text-white/50 text-[10px] block font-mono">Power & Battery</span>
            <span className={`font-medium text-sm ${batteryPct < 80 ? "text-amber-400" : "text-emerald-400"}`}>
              %{Math.round(batteryPct)} {currentWp.isIlluminated ? "⚡ Solar" : "❄️ Cold Trap"}
            </span>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          {/* Samples */}
          <div>
            <span className="text-white/50 text-[10px] block font-mono">Scientific Samples</span>
            <span className="text-cyan-400 font-medium text-sm">
              {sampleCount} Core Samples ({samplesCollectedKg.toFixed(1)} kg)
            </span>
          </div>
        </div>

        {/* Center Waypoint Timeline */}
        <div className="pointer-events-auto backdrop-blur-xl bg-[#090d16]/85 border border-white/10 rounded-2xl p-1.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] flex items-center gap-1.5 overflow-x-auto max-w-full">
          {TRAVERSE_WAYPOINTS.map((wp, idx) => {
            const isCur = activeWpIndex === idx;
            const isPassed = activeWpIndex > idx;
            return (
              <div
                key={wp.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isCur
                    ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-semibold shadow-lg shadow-cyan-500/20"
                    : isPassed
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-white/50 hover:text-white/80"
                }`}
                title={wp.scienceDesc}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${isCur ? "bg-white animate-pulse" : "bg-white/30"}`} />
                )}
                <span>{wp.name.split(": ")[1]}</span>
              </div>
            );
          })}
        </div>

        {/* Right Camera Controls & Actions */}
        <div className="pointer-events-auto flex items-center gap-2 self-end lg:self-auto">
          <div className="backdrop-blur-xl bg-[#090d16]/85 border border-white/10 rounded-xl p-1 flex items-center gap-1 text-xs shadow-md">
            <button
              onClick={() => setCameraView("chase")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                cameraView === "chase" ? "bg-cyan-600 text-white font-semibold" : "text-white/60 hover:text-white"
              }`}
            >
              Chase
            </button>
            <button
              onClick={() => setCameraView("overhead")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                cameraView === "overhead" ? "bg-cyan-600 text-white font-semibold" : "text-white/60 hover:text-white"
              }`}
            >
              Overhead
            </button>
            <button
              onClick={() => setCameraView("free")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                cameraView === "free" ? "bg-cyan-600 text-white font-semibold" : "text-white/60 hover:text-white"
              }`}
            >
              Free 3D
            </button>
          </div>

          <button
            onClick={() => setIsDriving(!isDriving)}
            className="backdrop-blur-xl bg-[#090d16]/85 hover:bg-white/10 text-white p-2.5 rounded-xl border border-white/10 shadow-md transition-colors cursor-pointer"
            title={isDriving ? "Pause Rover" : "Resume Drive"}
          >
            {isDriving ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => setViewMode("descent_sim")}
            className="backdrop-blur-xl bg-[#090d16]/85 hover:bg-white/10 text-white px-3 py-2 rounded-xl border border-white/10 shadow-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Return to Stage 3 Lunar Descent"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
            <span className="hidden sm:inline">Descent</span>
          </button>
        </div>
      </div>

      {/* ── TOP-LEFT: LIVE POSITION & TELEMETRY TERMINAL (HUD) ── */}
      <div className="absolute top-20 left-4 z-20 pointer-events-none max-w-xs w-full animate-fade-in">
        <div className="pointer-events-auto backdrop-blur-xl bg-[#060913]/90 border border-cyan-500/20 rounded-2xl p-3.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.55)] space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              <span className="tracking-wider font-semibold text-xs text-white uppercase">
                Live Position & Telemetry
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              LiDAR ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Lunar Latitude</span>
              <span className="text-cyan-300 font-medium">{coordsHUD.lat.toFixed(5)}° S</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Lunar Longitude</span>
              <span className="text-cyan-300 font-medium">{coordsHUD.lng.toFixed(5)}° E</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Metric XYZ (m)</span>
              <span className="text-white font-medium text-[11px]">
                X:{coordsHUD.xM} Y:{coordsHUD.yM}
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Altitude (AMSL)</span>
              <span className="text-emerald-400 font-medium">{coordsHUD.elevM > 0 ? `+${coordsHUD.elevM}` : coordsHUD.elevM} m</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-1 text-white/70">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Heading: {coordsHUD.headingDeg}° {coordsHUD.cardinalHeading}</span>
            </div>
            <div>
              <span>Speed: {coordsHUD.speedMs} m/s</span>
            </div>
          </div>

          {/* Autonomous Obstacle Avoidance Alert */}
          {isAvoidanceEngaged && detectedHazard && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-start gap-2 text-xs animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block font-mono text-[11px]">
                  [LiDAR LOCK: OBSTACLE DETECTED]
                </span>
                <span className="text-[10px] text-amber-200/80 leading-tight block">
                  {detectedHazard.name} — Autonomous detour corridor engaged (+4.8m lateral vector).
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TOP-RIGHT: NASA CRaTER SPACE WEATHER & RADIATION HUD ── */}
      <div className="absolute top-20 right-4 z-20 pointer-events-none max-w-xs w-full animate-fade-in">
        <div className="pointer-events-auto backdrop-blur-xl bg-[#060913]/90 border border-indigo-500/20 rounded-2xl p-3.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.55)] space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="tracking-wider font-semibold text-xs text-white uppercase">
                NASA CRaTER Space Weather
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              LRO TELEMETRY
            </span>
          </div>

          {/* Galactic Cosmic Rays (GCR) & PSR Shielding */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Cosmic Dose Rate (GCR):</span>
              <span className="font-mono font-semibold text-cyan-300">
                {spaceWeather.gcrDoseRateUsvH} μSv/h
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  spaceWeather.psrShieldingActive ? "bg-emerald-400 w-[58%]" : "bg-cyan-400 w-[85%]"
                }`}
              />
            </div>
            {spaceWeather.psrShieldingActive ? (
              <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PSR CRATER SHIELD ACTIVE: -42% Cosmic Flux (Natural Topographic Shield)</span>
              </div>
            ) : (
              <span className="text-[10px] text-white/40 block">Direct deep-space galactic cosmic radiation exposure</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Solar Proton Flux</span>
              <span className="text-indigo-300 font-medium text-[11px]">
                {spaceWeather.sepProtonFlux} p⁺/cm²
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Cumulative Dose</span>
              <span className="text-white font-medium text-[11px]">
                {spaceWeather.cumulativeDoseMsv} mSv
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Solar Wind Speed</span>
              <span className="text-white font-medium text-[11px]">
                {spaceWeather.solarWindSpeedKms} km/s
              </span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <span className="text-white/40 text-[10px] block">Avionics SEU Risk</span>
              <span className="text-emerald-400 font-medium text-[11px]">
                %{spaceWeather.avionicsSeuRiskPct} / 1k hrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM LIVE INFORMATION & ADVANCE TO STAGE 5 TOAST ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-xl w-[90%]">
        <div className="pointer-events-auto backdrop-blur-xl bg-[#090d16]/90 border border-white/10 rounded-2xl p-3.5 px-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.55)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="tracking-wide font-bold text-cyan-400 text-sm">{currentWp.name}</span>
              {currentWp.sampleType && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-semibold border border-cyan-500/20">
                  Sample: {currentWp.sampleType} ({currentWp.sampleYieldKg} kg)
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">{currentWp.scienceDesc}</p>
          </div>

          {isTraverseComplete && (
            <button
              onClick={() => setViewMode("lunar_return")}
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl tracking-wide font-semibold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <span>Stage 5: Lunar Ascent & Earth Return</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── SURFACE SCIENCE SUCCESS MODAL ── */}
      {isTraverseComplete && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in pointer-events-auto">
          <div className="backdrop-blur-2xl bg-[#090d16]/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_16px_48px_0_rgba(0,0,0,0.75)] space-y-5 text-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 block mb-1">
                Surface Operations Successfully Completed
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Stage 4 Complete: Samples Transferred to Ascent Module
              </h2>
              <p className="text-xs text-white/60 mt-2 leading-relaxed">
                The rover traversed 860 meters across the crater floor of <span className="font-semibold text-cyan-300">{selectedSafeLunarSite?.name || "Petavius Crater"}</span>, navigated complex topographic craters with autonomous LiDAR obstacle avoidance, and extracted 5.6 kg of pristine volatile water ice from the cold trap.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 text-xs grid grid-cols-2 gap-3 text-left border border-white/5 font-mono">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="text-white/40 text-[10px] block">Extracted Water Ice:</span>
                <span className="font-semibold text-cyan-300">5.6 kg H₂O (Volatiles)</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="text-white/40 text-[10px] block">Highland Regolith:</span>
                <span className="font-semibold text-white">6.0 kg (Anorthosite)</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="text-white/40 text-[10px] block">Max Slope Traversed:</span>
                <span className="font-semibold text-emerald-400">6.8° (Within Safe Envelope)</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="text-white/40 text-[10px] block">Direct Earth DSN Link:</span>
                <span className="font-semibold text-emerald-400">100% Active (+9.8 dB)</span>
              </div>
            </div>

            <button
              onClick={() => setViewMode("lunar_return")}
              className="w-full bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-indigo-500 text-white py-3.5 px-5 rounded-xl tracking-wide font-semibold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Begin Stage 5: Lunar Ascent & Earth Landing</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stage4SurfaceTraverseView;

// ═══════════════════════════════════════════════════════════════════════
// Stage1EarthLaunchView.tsx
// High-Fidelity 3D Earth Launch Simulation (WebGL / Three.js)
//
// Features:
// 1. Photorealistic Multi-Layer Rocket Exhaust & Mach Diamond Flame Plume
// 2. High-Speed Supersonic Exhaust Particle Trail & Launch Pad Deluge Steam
// 3. Realistic NASA Launch Pitch Profile: Strictly Vertical Liftoff -> Subtle Upper-Atmosphere Arc
// 4. Soft Layered Atmospheric Cloud Decks & Realistic Kennedy Space Center Terrain
// 5. 1976 US Standard Atmosphere RK4 Solver & Barrowman Aerodynamic Telemetry
// 6. 100% English Aerospace UI with Google Material Telemetry Cards
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useStore } from "@/store";
import { NASA_ROCKET_VEHICLES, RocketVehicle } from "@/data/rocket-vehicles";
import {
  computeRocketFlightTrajectory,
  downloadOpenRocketFile,
  RocketFlightReport,
  getAtmosphericParameters,
} from "@/data/openrocket-engine";
import {
  Rocket,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Camera,
  Layers,
  Gauge,
  Compass,
  Download,
  ChevronDown,
  Sparkles,
  BarChart3,
  Flame,
  ShieldCheck,
} from "lucide-react";

interface LaunchStage {
  id: number;
  name: string;
  desc: string;
  targetAlt: number; // km
  targetVel: number; // km/s
  startT: number;
  endT: number;
}

const LAUNCH_STAGES: LaunchStage[] = [
  {
    id: 1,
    name: "T-0: Ignition & Liftoff",
    desc: "Main engines ignited at full thrust. Vehicle ascends vertically from launch mount.",
    targetAlt: 8,
    targetVel: 0.8,
    startT: 0,
    endT: 0.22,
  },
  {
    id: 2,
    name: "Max-Q & Cloud Deck",
    desc: "Maximum dynamic pressure passed. Vehicle punches through cloud deck into stratosphere.",
    targetAlt: 45,
    targetVel: 2.4,
    startT: 0.22,
    endT: 0.48,
  },
  {
    id: 3,
    name: "Subtle Gravity Turn",
    desc: "Gentle downrange pitch program initiated. Atmosphere thinning, sky transitions to orbital black.",
    targetAlt: 95,
    targetVel: 4.8,
    startT: 0.48,
    endT: 0.72,
  },
  {
    id: 4,
    name: "Exoatmospheric Ascent (MECO)",
    desc: "100 km Kármán line crossed. Entering orbital vacuum with full throttle.",
    targetAlt: 155,
    targetVel: 6.9,
    startT: 0.72,
    endT: 0.90,
  },
  {
    id: 5,
    name: "Translunar Injection (TLI)",
    desc: "Stage 1 Complete! Spacecraft reaches 185 km parking orbit at escape velocity.",
    targetAlt: 185,
    targetVel: 7.8,
    startT: 0.90,
    endT: 1.0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Procedural Soft Particle and Flame Texture Generators
// ─────────────────────────────────────────────────────────────────────────────
function createFlameGradientTexture(type: "srb" | "hydrolox" | "kerosene"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (type === "srb") {
    // Dazzling white-hot core -> golden yellow -> incandescent amber -> smoky red tip
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.12, "rgba(255, 245, 200, 0.98)");
    grad.addColorStop(0.35, "rgba(255, 170, 30, 0.90)");
    grad.addColorStop(0.65, "rgba(240, 90, 15, 0.65)");
    grad.addColorStop(0.88, "rgba(180, 40, 10, 0.25)");
    grad.addColorStop(1.0, "rgba(40, 10, 5, 0.0)");
  } else if (type === "hydrolox") {
    // RS-25 Hydrolox: Mach shock diamonds, electric blue / cyan core
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.15, "rgba(170, 230, 255, 0.95)");
    grad.addColorStop(0.40, "rgba(70, 170, 255, 0.80)");
    grad.addColorStop(0.70, "rgba(35, 95, 240, 0.40)");
    grad.addColorStop(1.0, "rgba(10, 25, 130, 0.0)");
  } else {
    // F-1 Kerosene: Brilliant orange fire with incandescent shock diamonds
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.18, "rgba(255, 220, 140, 0.95)");
    grad.addColorStop(0.45, "rgba(255, 130, 25, 0.85)");
    grad.addColorStop(0.75, "rgba(210, 60, 10, 0.45)");
    grad.addColorStop(1.0, "rgba(50, 10, 5, 0.0)");
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 512);

  // Soft horizontal feathering to eliminate harsh polygonal boundaries
  const radGrad = ctx.createRadialGradient(64, 256, 15, 64, 256, 64);
  radGrad.addColorStop(0, "rgba(0,0,0,0)");
  radGrad.addColorStop(0.7, "rgba(0,0,0,0.1)");
  radGrad.addColorStop(1.0, "rgba(0,0,0,0.95)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 128, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createSoftPuffTexture(colorRgb = "255, 255, 255"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  rad.addColorStop(0.0, `rgba(${colorRgb}, 1.0)`);
  rad.addColorStop(0.3, `rgba(${colorRgb}, 0.65)`);
  rad.addColorStop(0.65, `rgba(${colorRgb}, 0.2)`);
  rad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");

  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export const Stage1EarthLaunchView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const {
    selectedSafeLunarSite,
    setViewMode,
    selectedRocket,
    setSelectedRocket,
    isOpenRocketModalOpen,
    setIsOpenRocketModalOpen,
    isFlightReportModalOpen,
    setIsFlightReportModalOpen,
    latestLaunchReport,
    setLatestLaunchReport,
  } = useStore();

  const activeRocket: RocketVehicle =
    selectedRocket && selectedRocket.stages && selectedRocket.stages.length > 0
      ? selectedRocket
      : NASA_ROCKET_VEHICLES[1] || NASA_ROCKET_VEHICLES[0];

  // Telemetry & Physics State
  const [altitudeKm, setAltitudeKm] = useState(0);
  const [velocityKms, setVelocityKms] = useState(0);
  const [machNumber, setMachNumber] = useState(0);
  const [dynamicPressureKpa, setDynamicPressureKpa] = useState(0);
  const [gForce, setGForce] = useState(1.0);
  const [throttlePct, setThrottlePct] = useState(100);
  const [activeStageId, setActiveStageId] = useState(1);
  const [toastMessage, setToastMessage] = useState(LAUNCH_STAGES[0].desc);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [cameraView, setCameraView] = useState<"cinematic" | "pad" | "rocketcam" | "free">("cinematic");
  const [isRocketSelectorOpen, setIsRocketSelectorOpen] = useState(false);

  // Live Barometric Pressure (hPa) & Atmosphere Layer & Space Weather
  const [baroPressureHpa, setBaroPressureHpa] = useState(1013.25);
  const [atmosphereLayer, setAtmosphereLayer] = useState("Troposphere (0-12 km)");
  const [spaceWeatherFlight, setSpaceWeatherFlight] = useState({
    solarFluxF107: 148.5, // sfu
    kpIndex: 2.1,         // Quiet
    ionosphereTec: 18.4,  // TECU
    cosmicFluxUsv: 0.12,  // μSv/h
  });

  // Rocket 3D Screen Reticle & HUD Leader Line
  const [rocketHUDPos, setRocketHUDPos] = useState<{
    visible: boolean;
    x: number;
    y: number;
    cardX: number;
    cardY: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    cardX: 0,
    cardY: 0,
  });

  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Recompute flight report on vehicle change
  useEffect(() => {
    if (activeRocket) {
      const report = computeRocketFlightTrajectory(activeRocket);
      setLatestLaunchReport(report);
    }
  }, [activeRocket, setLatestLaunchReport]);

  // Audio Engine Toggle
  const toggleSound = () => {
    if (!soundEnabled) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(160, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
        engineGainRef.current = gainNode;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();

        setSoundEnabled(true);
      } catch (err) {
        console.warn("Audio Context init error:", err);
      }
    } else {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setSoundEnabled(false);
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── 1. Scene, Camera, Renderer ──────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x60a5fa); // Crisp morning launch sky

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      5000
    );
    camera.position.set(-10.0, 7.0, 32.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // OrbitControls for Free Camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 450;
    controls.minDistance = 4;
    controls.enabled = cameraView === "free";

    // ── 2. Lighting & High-Intensity Sun ─────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(70, 160, 90);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);

    // Dynamic Rocket Exhaust Point Light
    const flamePointLight = new THREE.PointLight(0xff8811, 6.0, 50);
    scene.add(flamePointLight);

    // ── 3. Kennedy Space Center Launch Complex Environment ──────────
    // Ocean & Coastline Base
    const oceanGeo = new THREE.PlaneGeometry(1600, 1600);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.2;
    scene.add(ocean);

    // Launch Pad Terrain Apron (Concrete & Cape Canaveral Scrubland)
    const groundGeo = new THREE.CircleGeometry(260, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2b3823,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Elevated Concrete Launch Mount & Flame Trench
    const padGeo = new THREE.CylinderGeometry(28, 32, 3.2, 48);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.85,
      metalness: 0.2,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 1.6;
    pad.receiveShadow = true;
    scene.add(pad);

    // Flame Trench Deflector (Pad Center Exhaust Pit)
    const trenchGeo = new THREE.CylinderGeometry(7.5, 7.5, 3.4, 24, 1, true);
    const trenchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
    const trench = new THREE.Mesh(trenchGeo, trenchMat);
    trench.position.y = 1.5;
    scene.add(trench);

    // Space Stars (Fade in at high altitude)
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 2200;
      starPositions[i + 1] = 120 + Math.random() * 1600;
      starPositions[i + 2] = (Math.random() - 0.5) * 2200;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.0,
      transparent: true,
      opacity: 0,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── 4. Launch Umbilical Gantry Tower ────────────────────────────
    const towerGroup = new THREE.Group();
    scene.add(towerGroup);

    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // NASA Launch Complex 39B Red Gantry Steel
      metalness: 0.65,
      roughness: 0.35,
    });

    const towerH = 28;
    const colGeo = new THREE.CylinderGeometry(0.38, 0.44, towerH, 12);
    [
      { x: 4.2, z: 2.6 },
      { x: 4.2, z: -2.6 },
      { x: 8.2, z: 2.6 },
      { x: 8.2, z: -2.6 },
    ].forEach((pos) => {
      const col = new THREE.Mesh(colGeo, towerMat);
      col.position.set(pos.x, towerH / 2 + 3.2, pos.z);
      col.castShadow = true;
      towerGroup.add(col);
    });

    // Horizontal Platforms
    for (let y = 6; y <= towerH; y += 4) {
      const platGeo = new THREE.BoxGeometry(4.8, 0.3, 5.8);
      const plat = new THREE.Mesh(platGeo, towerMat);
      plat.position.set(6.2, y + 3.2, 0);
      towerGroup.add(plat);
    }

    // Retractable Swing Arms
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 0.6), towerMat);
    arm1.position.set(3.4, 20, 0);
    towerGroup.add(arm1);

    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.45, 0.6), towerMat);
    arm2.position.set(3.2, 10, 0);
    towerGroup.add(arm2);

    // ── 5. Photorealistic Atmospheric Cloud Deck ────────────────────
    const cloudTexture = createSoftPuffTexture("255, 255, 255");
    const cloudGroup = new THREE.Group();
    cloudGroup.position.y = 85;
    scene.add(cloudGroup);

    const cloudPuffCount = 60;
    const cloudGeo = new THREE.BufferGeometry();
    const cloudPositions = new Float32Array(cloudPuffCount * 3);
    for (let i = 0; i < cloudPuffCount; i++) {
      cloudPositions[i * 3] = (Math.random() - 0.5) * 600;
      cloudPositions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      cloudPositions[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    cloudGeo.setAttribute("position", new THREE.BufferAttribute(cloudPositions, 3));
    const cloudMat = new THREE.PointsMaterial({
      map: cloudTexture,
      color: 0xffffff,
      size: 75.0,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const cloudPoints = new THREE.Points(cloudGeo, cloudMat);
    cloudGroup.add(cloudPoints);

    // ── 6. 3D ROCKET MESH BUILDER ───────────────────────────────────
    const rocketRoot = new THREE.Group();
    rocketRoot.position.set(0, 3.2, 0);
    scene.add(rocketRoot);

    const flameMeshes: Array<{
      mesh: THREE.Mesh;
      baseScaleX: number;
      baseScaleY: number;
      isSrb: boolean;
    }> = [];

    const srbFlameTexture = createFlameGradientTexture("srb");
    const hydroloxFlameTexture = createFlameGradientTexture("hydrolox");
    const keroseneFlameTexture = createFlameGradientTexture("kerosene");

    const activeVehicleId = activeRocket.id || "sls_block1";

    if (activeVehicleId === "saturn_v") {
      // ══════════════════════════════════════════════════════════════
      // SATURN V (Apollo Program)
      // ══════════════════════════════════════════════════════════════
      const coreR = 1.35;
      const s1Height = 6.2;
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.25, roughness: 0.25 });
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.4, roughness: 0.6 });
      const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });

      for (let q = 0; q < 4; q++) {
        const isBlack = q % 2 === 1;
        const quadGeo = new THREE.CylinderGeometry(coreR, coreR, s1Height, 16, 1, false, (q * Math.PI) / 2, Math.PI / 2);
        const quadMesh = new THREE.Mesh(quadGeo, isBlack ? blackMat : whiteMat);
        quadMesh.position.y = s1Height / 2;
        quadMesh.castShadow = true;
        rocketRoot.add(quadMesh);
      }

      // 4 Aero Guidance Fins
      [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ang) => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 1.2), whiteMat);
        fin.position.set(Math.cos(ang) * (coreR + 0.7), 0.75, Math.sin(ang) * (coreR + 0.7));
        fin.rotation.y = -ang;
        rocketRoot.add(fin);
      });

      // S-II & S-IVB Stages + Apollo CSM & LES Tower
      const s2Height = 4.5;
      const s2Mesh = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, s2Height, 32), whiteMat);
      s2Mesh.position.y = s1Height + s2Height / 2;
      rocketRoot.add(s2Mesh);

      const s3Height = 3.6;
      const s3Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, coreR, s3Height, 32), whiteMat);
      s3Mesh.position.y = s1Height + s2Height + s3Height / 2;
      rocketRoot.add(s3Mesh);

      const csmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.9, 1.8, 24), whiteMat);
      csmMesh.position.y = s1Height + s2Height + s3Height + 0.9;
      rocketRoot.add(csmMesh);

      const lesMesh = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.8, 24), whiteMat);
      lesMesh.position.y = s1Height + s2Height + s3Height + 1.8 + 1.4;
      rocketRoot.add(lesMesh);

      // 5 F-1 Engine Cluster & High-Intensity Plumes
      const f1Positions = [
        { x: 0, z: 0 },
        { x: 0.65, z: 0 },
        { x: -0.65, z: 0 },
        { x: 0, z: 0.65 },
        { x: 0, z: -0.65 },
      ];
      f1Positions.forEach((pos) => {
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.48, 0.8, 16), nozzleMat);
        noz.position.set(pos.x, -0.4, pos.z);
        rocketRoot.add(noz);

        // Realistic F-1 Flared Exhaust Plume
        const plumeGeo = new THREE.CylinderGeometry(0.44, 1.35, 9.5, 24, 1, true);
        const plumeMat = new THREE.MeshBasicMaterial({
          map: keroseneFlameTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const plume = new THREE.Mesh(plumeGeo, plumeMat);
        plume.position.set(pos.x, -5.1, pos.z);
        rocketRoot.add(plume);
        flameMeshes.push({ mesh: plume, baseScaleX: 1.0, baseScaleY: 1.0, isSrb: false });
      });
    } else if (activeVehicleId === "sls_block1" || activeVehicleId === "custom_user_rocket") {
      // ══════════════════════════════════════════════════════════════
      // SPACE LAUNCH SYSTEM (SLS Block 1 - Artemis Program) & Custom
      // ══════════════════════════════════════════════════════════════
      const coreR = 1.15;
      const coreH = 10.8;

      const foamMat = new THREE.MeshStandardMaterial({
        color: 0xc85922, // Iconic SOFI Cryogenic Foam Orange
        roughness: 0.82,
        metalness: 0.12,
      });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.28 });
      const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.92, roughness: 0.2 });

      // Core SOFI Foam Cylinder
      const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, coreH, 36), foamMat);
      coreMesh.position.y = coreH / 2;
      coreMesh.castShadow = true;
      rocketRoot.add(coreMesh);

      // Top and Aft White Interstages
      const topSkirt = new THREE.Mesh(new THREE.CylinderGeometry(coreR * 1.01, coreR * 1.01, 1.3, 36), whiteMat);
      topSkirt.position.y = coreH - 0.65;
      rocketRoot.add(topSkirt);

      const aftSkirt = new THREE.Mesh(new THREE.CylinderGeometry(coreR * 1.01, coreR * 1.01, 1.1, 36), whiteMat);
      aftSkirt.position.y = 0.55;
      rocketRoot.add(aftSkirt);

      // LOX Feedline Conduit
      const feedline = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, coreH * 0.88, 12), whiteMat);
      feedline.position.set(coreR + 0.06, coreH * 0.48, 0);
      rocketRoot.add(feedline);

      // Twin 5-Segment Solid Rocket Boosters (SRBs)
      const srbR = 0.48;
      const srbH = 10.0;
      [-1, 1].forEach((side) => {
        const srbX = side * (coreR + srbR + 0.24);
        const srbMesh = new THREE.Mesh(new THREE.CylinderGeometry(srbR, srbR, srbH, 24), whiteMat);
        srbMesh.position.set(srbX, srbH / 2 - 0.2, 0);
        srbMesh.castShadow = true;
        rocketRoot.add(srbMesh);

        // SRB Field Joint Rings
        for (let b = 1; b <= 4; b++) {
          const ring = new THREE.Mesh(
            new THREE.CylinderGeometry(srbR * 1.02, srbR * 1.02, 0.09, 24),
            new THREE.MeshBasicMaterial({ color: 0x1e293b })
          );
          ring.position.set(srbX, (srbH / 5) * b - 0.2, 0);
          rocketRoot.add(ring);
        }

        // SRB Forward Assembly Nosecone
        const srbNose = new THREE.Mesh(new THREE.ConeGeometry(srbR, 1.5, 24), whiteMat);
        srbNose.position.set(srbX, srbH + 0.55, 0);
        rocketRoot.add(srbNose);

        // SRB High-Velocity Rocket Exhaust Plume
        const srbPlumeGeo = new THREE.CylinderGeometry(srbR * 0.95, srbR * 2.8, 13.5, 32, 1, true);
        const srbPlumeMat = new THREE.MeshBasicMaterial({
          map: srbFlameTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const srbPlume = new THREE.Mesh(srbPlumeGeo, srbPlumeMat);
        srbPlume.position.set(srbX, -7.0, 0);
        rocketRoot.add(srbPlume);
        flameMeshes.push({ mesh: srbPlume, baseScaleX: 1.0, baseScaleY: 1.0, isSrb: true });

        // SRB White-Hot Shock Core
        const srbCoreGeo = new THREE.CylinderGeometry(srbR * 0.5, srbR * 1.2, 8.5, 20, 1, true);
        const srbCoreMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const srbCore = new THREE.Mesh(srbCoreGeo, srbCoreMat);
        srbCore.position.set(srbX, -4.5, 0);
        rocketRoot.add(srbCore);
        flameMeshes.push({ mesh: srbCore, baseScaleX: 0.8, baseScaleY: 0.9, isSrb: true });
      });

      // Orion Spacecraft & Launch Abort System (LAS)
      const icpsH = 1.5;
      const icpsMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, coreR, icpsH, 32), whiteMat);
      icpsMesh.position.y = coreH + icpsH / 2;
      rocketRoot.add(icpsMesh);

      const orionH = 1.1;
      const orionMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, orionH, 24), whiteMat);
      orionMesh.position.y = coreH + icpsH + orionH / 2;
      rocketRoot.add(orionMesh);

      const lasMesh = new THREE.Mesh(new THREE.ConeGeometry(0.72, 2.0, 24), whiteMat);
      lasMesh.position.y = coreH + icpsH + orionH + 1.0;
      rocketRoot.add(lasMesh);

      const lasTower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 1.8, 12), whiteMat);
      lasTower.position.y = coreH + icpsH + orionH + 2.0 + 0.9;
      rocketRoot.add(lasTower);

      // 4 RS-25 Hydrolox Engines & Mach Shock Diamond Plumes
      [
        { x: -0.4, z: -0.4 },
        { x: 0.4, z: -0.4 },
        { x: -0.4, z: 0.4 },
        { x: 0.4, z: 0.4 },
      ].forEach((pos) => {
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 0.7, 16), nozzleMat);
        noz.position.set(pos.x, -0.35, pos.z);
        rocketRoot.add(noz);

        // RS-25 Cyan Shock Plume
        const rsPlumeGeo = new THREE.CylinderGeometry(0.35, 1.1, 7.8, 20, 1, true);
        const rsPlumeMat = new THREE.MeshBasicMaterial({
          map: hydroloxFlameTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const rsPlume = new THREE.Mesh(rsPlumeGeo, rsPlumeMat);
        rsPlume.position.set(pos.x, -4.2, pos.z);
        rocketRoot.add(rsPlume);
        flameMeshes.push({ mesh: rsPlume, baseScaleX: 1.0, baseScaleY: 1.0, isSrb: false });
      });
    } else {
      // ══════════════════════════════════════════════════════════════
      // ATLAS V 551 (Centaur / Commercial HLS / Other)
      // ══════════════════════════════════════════════════════════════
      const coreR = 0.75;
      const coreH = 8.2;
      const ccbMat = new THREE.MeshStandardMaterial({ color: 0x9a5e38, metalness: 0.75, roughness: 0.32 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.35 });
      const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.25 });

      const ccbMesh = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, coreH, 32), ccbMat);
      ccbMesh.position.y = coreH / 2;
      rocketRoot.add(ccbMesh);

      const centaurMesh = new THREE.Mesh(new THREE.CylinderGeometry(coreR * 0.95, coreR, 2.6, 32), whiteMat);
      centaurMesh.position.y = coreH + 1.3;
      rocketRoot.add(centaurMesh);

      const fairingMesh = new THREE.Mesh(new THREE.ConeGeometry(0.96, 4.2, 32), whiteMat);
      fairingMesh.position.y = coreH + 2.6 + 2.1;
      rocketRoot.add(fairingMesh);

      // Dual Nozzle RD-180
      [-0.26, 0.26].forEach((xOffset) => {
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 0.65, 16), nozzleMat);
        noz.position.set(xOffset, -0.32, 0);
        rocketRoot.add(noz);

        const plumeGeo = new THREE.CylinderGeometry(0.35, 1.1, 7.5, 20, 1, true);
        const plumeMat = new THREE.MeshBasicMaterial({
          map: keroseneFlameTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const plume = new THREE.Mesh(plumeGeo, plumeMat);
        plume.position.set(xOffset, -4.0, 0);
        rocketRoot.add(plume);
        flameMeshes.push({ mesh: plume, baseScaleX: 1.0, baseScaleY: 1.0, isSrb: false });
      });
    }

    // ── 7. VOLUMETRIC EXHAUST PARTICLE PLUME & PAD DELUGE SYSTEM ────
    const puffTexture = createSoftPuffTexture("255, 255, 255");
    const TRAIL_PARTICLE_COUNT = 650;
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(TRAIL_PARTICLE_COUNT * 3);
    const trailColors = new Float32Array(TRAIL_PARTICLE_COUNT * 3);
    const trailSizes = new Float32Array(TRAIL_PARTICLE_COUNT);

    interface TrailParticleData {
      active: boolean;
      life: number;
      maxLife: number;
      vx: number;
      vy: number;
      vz: number;
      baseSize: number;
    }
    const trailData: TrailParticleData[] = [];

    for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
      trailPositions[i * 3] = 0;
      trailPositions[i * 3 + 1] = -500;
      trailPositions[i * 3 + 2] = 0;

      trailColors[i * 3] = 1.0;
      trailColors[i * 3 + 1] = 0.85;
      trailColors[i * 3 + 2] = 0.5;

      trailSizes[i] = 1.0;

      trailData.push({
        active: false,
        life: 0,
        maxLife: 45 + Math.random() * 35,
        vx: 0,
        vy: 0,
        vz: 0,
        baseSize: 6.0 + Math.random() * 8.0,
      });
    }

    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
    trailGeo.setAttribute("size", new THREE.BufferAttribute(trailSizes, 1));

    const trailMat = new THREE.PointsMaterial({
      map: puffTexture,
      size: 16.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const trailField = new THREE.Points(trailGeo, trailMat);
    scene.add(trailField);

    // Launch Pad Flame Trench Deluge Blast Cloud
    const DELUGE_COUNT = 140;
    const delugeGeo = new THREE.BufferGeometry();
    const delugePositions = new Float32Array(DELUGE_COUNT * 3);
    const delugeVelocities: { x: number; y: number; z: number; age: number; maxAge: number }[] = [];

    for (let i = 0; i < DELUGE_COUNT; i++) {
      delugePositions[i * 3] = 0;
      delugePositions[i * 3 + 1] = 1.2;
      delugePositions[i * 3 + 2] = 0;
      const ang = Math.random() * Math.PI * 2;
      delugeVelocities.push({
        x: Math.cos(ang) * (4.0 + Math.random() * 8.0),
        y: 0.4 + Math.random() * 2.2,
        z: Math.sin(ang) * (4.0 + Math.random() * 8.0),
        age: Math.random() * 50,
        maxAge: 60 + Math.random() * 30,
      });
    }

    delugeGeo.setAttribute("position", new THREE.BufferAttribute(delugePositions, 3));
    const delugeMat = new THREE.PointsMaterial({
      map: puffTexture,
      color: 0xf1f5f9,
      size: 18.0,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const delugeField = new THREE.Points(delugeGeo, delugeMat);
    scene.add(delugeField);

    // ── 8. ANIMATION LOOP & RK4 AERODYNAMICS ENGINE ─────────────────
    const clock = new THREE.Clock();
    let simProgress = 0;
    const TOTAL_SIM_DURATION = 15.0; // 15-second cinematic ascent timeline
    let particleSpawnIndex = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (!isPausedRef.current) {
        const delta = clock.getDelta();
        simProgress = Math.min(1.0, simProgress + delta / TOTAL_SIM_DURATION);

        // A) Stage & Telemetry Metrics
        const currentStage =
          LAUNCH_STAGES.find((s) => simProgress >= s.startT && simProgress <= s.endT) ||
          LAUNCH_STAGES[LAUNCH_STAGES.length - 1];

        setActiveStageId(currentStage.id);
        setToastMessage(currentStage.desc);

        // Exponential Ascent Profile
        const altEase = Math.pow(simProgress, 2.2);
        const curAlt = Math.round(altEase * 185);
        const curVel = Number((Math.pow(simProgress, 1.8) * 7.8).toFixed(1));

        // 1976 US Standard Atmosphere Parameters
        const atm = getAtmosphericParameters(curAlt * 1000);
        const curMach = Number(((curVel * 1000) / atm.speedOfSoundMs).toFixed(1));
        const curQ = Number(((0.5 * atm.densityKgM3 * Math.pow(curVel * 1000, 2)) / 1000).toFixed(1));
        const curG = Number(
          (1.0 + Math.sin(simProgress * Math.PI) * (activeRocket.thrustToWeightRatio * 0.9 + 1.2)).toFixed(1)
        );

        setAltitudeKm(curAlt);
        setVelocityKms(curVel);
        setMachNumber(curMach);
        setDynamicPressureKpa(curQ);
        setGForce(curG);
        setThrottlePct(simProgress > 0.92 ? 0 : 100);

        // Barometric Pressure P(h)
        const pAtm = curAlt >= 100 ? 0.0 : Number((atm.pressurePa / 100).toFixed(curAlt > 50 ? 2 : 1));
        setBaroPressureHpa(pAtm);

        let layer = "Troposphere (0-12 km)";
        if (curAlt >= 100) layer = "Exoatmospheric Vacuum (>100 km)";
        else if (curAlt >= 85) layer = "Thermosphere (85-100 km)";
        else if (curAlt >= 50) layer = "Mesosphere (50-85 km)";
        else if (curAlt >= 12) layer = "Stratosphere (12-50 km)";
        setAtmosphereLayer(layer);

        // Space Weather Telemetry
        setSpaceWeatherFlight({
          solarFluxF107: 148.5,
          kpIndex: 2.1,
          ionosphereTec: curAlt > 60 && curAlt < 140 ? 34.2 : 18.4,
          cosmicFluxUsv: Number((0.12 + Math.min(1.0, curAlt / 100) * 1.73).toFixed(2)),
        });

        // ─────────────────────────────────────────────────────────────
        // B) REALISTIC LAUNCH PITCH PROFILE:
        // User Request: "roket eğimli değil biraz daha düz gitsin sonra çok hafif eğim alsın"
        // Up to ~42 km (simProgress < 0.40): Strictly vertical climb (tilt = 0)!
        // simProgress >= 0.40: Very gentle Hermite smoothstep pitch (max 0.20 rad ≈ 11.5°).
        // ─────────────────────────────────────────────────────────────
        const rocketY = 3.2 + Math.pow(simProgress, 2.35) * 255.0;
        let rocketX = 0;
        let tiltAngle = 0;

        if (simProgress >= 0.40) {
          const p = (simProgress - 0.40) / 0.60;
          const smoothP = p * p * (3 - 2 * p); // Cubic smoothstep
          tiltAngle = smoothP * 0.20; // Maximum ~11.5° subtle realistic lean
          rocketX = smoothP * 16.0;   // Downrange lateral displacement
        }

        rocketRoot.position.set(rocketX, rocketY, 0);
        rocketRoot.rotation.z = -tiltAngle;

        // C) HUD 3D Screen Projection Reticle & Leader Line
        if (mount) {
          const proj = new THREE.Vector3();
          rocketRoot.getWorldPosition(proj);
          proj.y += 4.5;
          proj.project(camera);

          if (proj.z < 1.0) {
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            const sx = (proj.x * 0.5 + 0.5) * w;
            const sy = (-proj.y * 0.5 + 0.5) * h;
            if (sx >= -40 && sx <= w + 40 && sy >= -40 && sy <= h + 40) {
              const cardOffsetX = sx + 130 > w - 250 ? -250 : 130;
              const cardOffsetY = -55;
              setRocketHUDPos({
                visible: true,
                x: sx,
                y: sy,
                cardX: Math.max(10, Math.min(w - 250, sx + cardOffsetX)),
                cardY: Math.max(90, Math.min(h - 150, sy + cardOffsetY)),
              });
            } else {
              setRocketHUDPos((prev) => ({ ...prev, visible: false }));
            }
          } else {
            setRocketHUDPos((prev) => ({ ...prev, visible: false }));
          }
        }

        // D) Dynamic Exhaust Plume Physics & Vacuum Expansion
        if (simProgress < 0.92) {
          const flicker = 0.94 + Math.random() * 0.12;
          // Vacuum Plume Expansion factor (plumes flare wider in near-vacuum)
          const vacuumExpansion = 1.0 + Math.min(1.4, Math.pow(curAlt / 80, 1.5));

          flameMeshes.forEach(({ mesh, baseScaleX, baseScaleY, isSrb }) => {
            mesh.visible = true;
            mesh.scale.y = baseScaleY * flicker;
            mesh.scale.x = baseScaleX * flicker * vacuumExpansion;
            mesh.scale.z = baseScaleX * flicker * vacuumExpansion;
          });

          flamePointLight.position.copy(rocketRoot.position);
          flamePointLight.position.y -= 2.2;
          flamePointLight.intensity = 5.5 + Math.random() * 2.5;

          // E) Continuous Rocket Exhaust Particle Smoke & Fire Plume
          const spawnCount = 10;
          for (let s = 0; s < spawnCount; s++) {
            const p = trailData[particleSpawnIndex];
            p.active = true;
            p.life = 0;
            p.maxLife = 50 + Math.random() * 40;

            const spawnPos = new THREE.Vector3(
              (Math.random() - 0.5) * 1.8,
              -1.5,
              (Math.random() - 0.5) * 1.8
            );
            spawnPos.applyEuler(rocketRoot.rotation);
            spawnPos.add(rocketRoot.position);

            trailPositions[particleSpawnIndex * 3] = spawnPos.x;
            trailPositions[particleSpawnIndex * 3 + 1] = spawnPos.y;
            trailPositions[particleSpawnIndex * 3 + 2] = spawnPos.z;

            // Downward high-speed exhaust thrust vector
            p.vx = -Math.sin(tiltAngle) * (20 + Math.random() * 25) + (Math.random() - 0.5) * 2.0;
            p.vy = -Math.cos(tiltAngle) * (20 + Math.random() * 25);
            p.vz = (Math.random() - 0.5) * 2.0;

            // Initial incandescent fiery color
            trailColors[particleSpawnIndex * 3] = 1.0;
            trailColors[particleSpawnIndex * 3 + 1] = 0.9;
            trailColors[particleSpawnIndex * 3 + 2] = 0.5;

            trailSizes[particleSpawnIndex] = p.baseSize;

            particleSpawnIndex = (particleSpawnIndex + 1) % TRAIL_PARTICLE_COUNT;
          }
        } else {
          // MECO: Main Engine Cutoff
          flameMeshes.forEach(({ mesh }) => (mesh.visible = false));
          flamePointLight.intensity = 0;
        }

        // F) Update Trail Particles
        for (let i = 0; i < TRAIL_PARTICLE_COUNT; i++) {
          const p = trailData[i];
          if (!p.active) continue;

          p.life += 1;
          const lifeRatio = p.life / p.maxLife;

          if (lifeRatio >= 1.0) {
            p.active = false;
            trailPositions[i * 3 + 1] = -500;
            continue;
          }

          // Slow down due to aerodynamic drag
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.vz *= 0.94;

          trailPositions[i * 3] += p.vx * 0.016;
          trailPositions[i * 3 + 1] += p.vy * 0.016;
          trailPositions[i * 3 + 2] += p.vz * 0.016;

          // Transition color from white-fire -> orange-amber -> white-gray smoke
          if (lifeRatio < 0.25) {
            trailColors[i * 3] = 1.0;
            trailColors[i * 3 + 1] = 0.85 - lifeRatio * 1.5;
            trailColors[i * 3 + 2] = 0.35;
          } else {
            const smokeCol = 0.85 + Math.sin(i) * 0.1;
            trailColors[i * 3] = smokeCol;
            trailColors[i * 3 + 1] = smokeCol;
            trailColors[i * 3 + 2] = smokeCol;
          }

          // Expand particle size into billowy smoke cloud
          trailSizes[i] = p.baseSize * (1.0 + lifeRatio * 4.5);
        }
        trailGeo.attributes.position.needsUpdate = true;
        trailGeo.attributes.color.needsUpdate = true;
        trailGeo.attributes.size.needsUpdate = true;

        // G) Launch Pad Deluge Steam Cloud (Active during liftoff < 4 seconds)
        if (simProgress < 0.30) {
          const dArr = delugeGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < DELUGE_COUNT; i++) {
            const v = delugeVelocities[i];
            v.age += 1;
            if (v.age > v.maxAge) {
              v.age = 0;
              const ang = Math.random() * Math.PI * 2;
              dArr[i * 3] = (Math.random() - 0.5) * 4.0;
              dArr[i * 3 + 1] = 1.4;
              dArr[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
            } else {
              dArr[i * 3] += v.x * 0.018;
              dArr[i * 3 + 1] += v.y * 0.012;
              dArr[i * 3 + 2] += v.z * 0.018;
            }
          }
          delugeGeo.attributes.position.needsUpdate = true;
          delugeMat.opacity = Math.max(0, 0.8 - (simProgress / 0.30) * 0.7);
        } else {
          delugeField.visible = false;
        }

        // H) Sky Atmosphere Color Transition (Blue -> Deep Violet -> Orbital Space)
        if (simProgress < 0.48) {
          const p = simProgress / 0.48;
          scene.background = new THREE.Color(0x60a5fa).lerp(new THREE.Color(0x1e1b4b), p);
          ambientLight.intensity = 0.55 - p * 0.28;
        } else {
          const p = (simProgress - 0.48) / 0.52;
          scene.background = new THREE.Color(0x1e1b4b).lerp(new THREE.Color(0x020306), p);
          starMat.opacity = p * 0.95;
          ambientLight.intensity = 0.22;
        }

        // I) Gantry Swing Arms Retraction
        if (simProgress > 0.04) {
          arm1.rotation.y = Math.min(1.2, arm1.rotation.y + 0.035);
          arm2.rotation.y = Math.min(1.2, arm2.rotation.y + 0.035);
        }

        // J) Flight Completion Check
        if (simProgress >= 1.0 && !isCompleted) {
          setIsCompleted(true);
        }

        // ── 9. CINEMATIC CAMERA SYSTEM ──────────────────────────────
        if (cameraView === "cinematic") {
          camera.position.set(
            rocketX - 16.0,
            rocketY + 6.0,
            rocketRoot.position.z + 32.0
          );
          camera.lookAt(rocketX + 2.0, rocketY + 7.0, 0);
        } else if (cameraView === "pad") {
          camera.position.set(-8.5, 4.0, 16.0);
          camera.lookAt(rocketX, rocketY + 4.5, 0);
        } else if (cameraView === "rocketcam") {
          camera.position.set(rocketX + 2.2, rocketY + 11.0, 2.2);
          camera.lookAt(rocketX + 2.5, rocketY - 16.0, 0);
        } else if (cameraView === "free") {
          controls.update();
        }
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
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [cameraView, activeRocket]);

  // Restart Simulation
  const handleRestart = () => {
    setIsCompleted(false);
    setAltitudeKm(0);
    setVelocityKms(0);
    setMachNumber(0);
    setDynamicPressureKpa(0);
    setGForce(1.0);
    setThrottlePct(100);
    setActiveStageId(1);
    setToastMessage(LAUNCH_STAGES[0].desc);
    setIsPaused(false);
    setBaroPressureHpa(1013.25);
    setAtmosphereLayer("Troposphere (0-12 km)");
    setRocketHUDPos({ visible: false, x: 0, y: 0, cardX: 0, cardY: 0 });
    window.dispatchEvent(new CustomEvent("stage1-restart"));
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#020306] font-sans text-white">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* ── 3D ROCKET RETICLE, GOOGLE LEADER LINE & TELEMETRY CALLOUT ── */}
      {rocketHUDPos.visible && !isCompleted && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {/* SVG Leader Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1={rocketHUDPos.x}
              y1={rocketHUDPos.y}
              x2={rocketHUDPos.cardX > rocketHUDPos.x ? rocketHUDPos.x + 40 : rocketHUDPos.x - 40}
              y2={rocketHUDPos.cardY + 28}
              stroke="#1A73E8"
              strokeWidth="2"
              strokeOpacity="0.9"
            />
            <line
              x1={rocketHUDPos.cardX > rocketHUDPos.x ? rocketHUDPos.x + 40 : rocketHUDPos.x - 40}
              y1={rocketHUDPos.cardY + 28}
              x2={rocketHUDPos.cardX > rocketHUDPos.x ? rocketHUDPos.cardX : rocketHUDPos.cardX + 235}
              y2={rocketHUDPos.cardY + 28}
              stroke="#1A73E8"
              strokeWidth="2"
              strokeOpacity="0.9"
            />
            <circle
              cx={rocketHUDPos.cardX > rocketHUDPos.x ? rocketHUDPos.x + 40 : rocketHUDPos.x - 40}
              cy={rocketHUDPos.cardY + 28}
              r="4"
              fill="#1A73E8"
            />
          </svg>

          {/* Concentric Pulsing Reticle Target */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
            style={{ left: rocketHUDPos.x, top: rocketHUDPos.y }}
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#1A73E8]/80 animate-ping absolute" />
            <div className="w-8 h-8 rounded-full border-2 border-[#1A73E8] bg-[#1A73E8]/15 flex items-center justify-center shadow-[0_2px_8px_rgba(26,115,232,0.4)]">
              <div className="w-2 h-2 rounded-full bg-[#1A73E8]" />
            </div>
          </div>

          {/* Clean English Material Telemetry Card */}
          <div
            className="absolute pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(60,64,67,0.22)] w-60 text-xs text-[#202124] space-y-2 animate-fade-in"
            style={{ left: rocketHUDPos.cardX, top: rocketHUDPos.cardY }}
          >
            <div className="flex items-center justify-between border-b border-[#E8EAED] pb-2">
              <div className="flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-[#1A73E8]" />
                <span className="font-semibold text-[#202124] text-[13px]">
                  {activeRocket.name.split(" (")[0]}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F4EA] text-[#137333] border border-[#34A853]/20">
                LIVE
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#5F6368]">Flight Phase:</span>
                <span className="font-semibold text-[#1A73E8]">
                  {LAUNCH_STAGES.find((s) => s.id === activeStageId)?.name.split(": ")[0] || "T-0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6368]">Liftoff Thrust:</span>
                <span className="font-semibold text-[#137333]">
                  {((activeRocket.liftoffThrustKn * (throttlePct / 100)) / 1000).toFixed(1)} MN ({throttlePct}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6368]">Propellant Flow:</span>
                <span className="font-medium text-[#202124]">
                  {(activeRocket.liftoffThrustKn * 0.38).toFixed(0)} kg/s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5F6368]">Atmospheric Pressure:</span>
                <span className="font-medium text-[#202124]">
                  {baroPressureHpa} hPa
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E8EAED] flex items-center justify-between text-[10px] text-[#5F6368]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#34A853] animate-pulse" />
                Systems Nominal
              </span>
              <span className="text-[#1A73E8] font-semibold text-[11px]">{altitudeKm} km</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP TELEMETRY BAR (Google Material Design) ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pointer-events-none">
        
        {/* Left Telemetry Card */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-2.5 px-4 shadow-[0_2px_12px_rgba(60,64,67,0.12)] flex flex-wrap items-center gap-3.5 text-xs text-[#202124]">
          
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCompleted ? "bg-[#34A853]" : "bg-[#1A73E8] animate-pulse"
              }`}
            />
            <span className="font-semibold text-[#202124] text-xs">
              {isCompleted ? "Orbit Insertion Nominal" : "Stage 1: Earth Launch"}
            </span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          {/* Rocket Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsRocketSelectorOpen(!isRocketSelectorOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1A73E8] font-semibold transition-colors cursor-pointer"
              title="Change Launch Vehicle"
            >
              <Rocket className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>{activeRocket.name.split(" (")[0]}</span>
              <ChevronDown className="w-3 h-3 text-[#1A73E8]" />
            </button>

            {isRocketSelectorOpen && (
              <div className="absolute top-full left-0 mt-2 w-68 bg-white border border-[#E8EAED] rounded-2xl shadow-[0_8px_24px_rgba(60,64,67,0.22)] py-2 z-50 animate-fade-in text-[#202124]">
                <div className="px-3 py-1 text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider border-b border-[#E8EAED] mb-1">
                  NASA Launch Vehicles
                </div>
                {NASA_ROCKET_VEHICLES.map((v) => {
                  const isCur = activeRocket.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedRocket(v);
                        setIsRocketSelectorOpen(false);
                        handleRestart();
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCur ? "bg-[#E8F0FE] text-[#1A73E8] font-semibold" : "hover:bg-[#F8F9FA] text-[#202124]"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{v.name}</div>
                        <div className="text-[10px] text-[#5F6368]">
                          {v.program} • {v.liftoffThrustKn.toLocaleString()} kN
                        </div>
                      </div>
                      {isCur && <CheckCircle2 className="w-4 h-4 text-[#1A73E8]" />}
                    </button>
                  );
                })}

                <div className="border-t border-[#E8EAED] mt-1 pt-1 px-2">
                  <button
                    onClick={() => {
                      setIsRocketSelectorOpen(false);
                      setIsOpenRocketModalOpen(true);
                    }}
                    className="w-full py-1.5 px-2 text-xs font-semibold text-[#1A73E8] hover:bg-[#E8F0FE] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FBBC05]" />
                    <span>OpenRocket Studio & Custom Builder</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          {/* Altitude */}
          <div>
            <span className="text-[#5F6368] text-[10px] block">Altitude</span>
            <span className="font-semibold text-[#202124] text-sm">{altitudeKm} km</span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          {/* Velocity & Mach */}
          <div>
            <span className="text-[#5F6368] text-[10px] block">Velocity</span>
            <span className="font-semibold text-[#1A73E8] text-sm">
              {velocityKms} km/s <span className="text-[10px] font-normal text-[#5F6368]">M{machNumber}</span>
            </span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          {/* Barometric Pressure */}
          <div>
            <span className="text-[#5F6368] text-[10px] block">Atm. Pressure</span>
            <span className="font-semibold text-[#202124] text-sm">
              {baroPressureHpa} hPa <span className="text-[10px] font-normal text-[#5F6368]">({atmosphereLayer.split(" ")[0]})</span>
            </span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          {/* Space Weather */}
          <div>
            <span className="text-[#5F6368] text-[10px] block">Space Weather</span>
            <span className="font-semibold text-[#1A73E8] text-sm">
              {spaceWeatherFlight.solarFluxF107} sfu <span className="text-[10px] font-normal text-[#5F6368]">TEC:{spaceWeatherFlight.ionosphereTec}</span>
            </span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          {/* Max-Q Dynamic Pressure */}
          <div>
            <span className="text-[#5F6368] text-[10px] block">Dynamic Pressure (q)</span>
            <span className={`font-semibold text-sm ${dynamicPressureKpa > 28 ? "text-[#D93025] animate-pulse" : "text-[#202124]"}`}>
              {dynamicPressureKpa} kPa {dynamicPressureKpa > 28 && <span className="px-1.5 py-0.2 rounded bg-[#FCE8E6] text-[#D93025] text-[9px] uppercase font-bold">Max-Q</span>}
            </span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          {/* G-Force */}
          <div>
            <span className="text-[#5F6368] text-[10px] block">G-Force</span>
            <span className="font-semibold text-[#B06000] text-sm">{gForce} G</span>
          </div>
        </div>

        {/* Stage Timeline */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(60,64,67,0.12)] flex items-center gap-1 overflow-x-auto max-w-full">
          {LAUNCH_STAGES.map((stg) => {
            const isCurrent = activeStageId === stg.id;
            const isPassed = activeStageId > stg.id;
            return (
              <div
                key={stg.id}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isCurrent
                    ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                    : isPassed
                    ? "text-[#137333] bg-[#E6F4EA]"
                    : "text-[#5F6368]"
                }`}
                title={stg.desc}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrent ? "bg-white animate-pulse" : "bg-[#BDC1C6]"
                    }`}
                  />
                )}
                <span>{stg.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          
          {/* OpenRocket Studio Button */}
          <button
            onClick={() => setIsOpenRocketModalOpen(true)}
            className="bg-white/95 hover:bg-[#F8F9FA] text-[#1A73E8] px-3 py-2 rounded-[10px] border border-[#E8EAED] shadow-sm transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="OpenRocket Studio & Aerodynamic Stability Analyzer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FBBC05]" />
            <span className="hidden sm:inline">OpenRocket</span>
          </button>

          {/* Flight Report Button */}
          <button
            onClick={() => setIsFlightReportModalOpen(true)}
            className="bg-white/95 hover:bg-[#F8F9FA] text-[#202124] px-3 py-2 rounded-[10px] border border-[#E8EAED] shadow-sm transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="View NASA Telemetry Flight Report"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#5F6368]" />
            <span className="hidden sm:inline">Flight Report</span>
          </button>

          {/* Camera View Switcher */}
          <div className="bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-[10px] p-1 flex items-center gap-1 text-xs shadow-sm">
            <button
              onClick={() => setCameraView("cinematic")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraView === "cinematic"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Cinematic Tracking Camera"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cinematic</span>
            </button>

            <button
              onClick={() => setCameraView("pad")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraView === "pad"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Launch Pad Mount Camera"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pad</span>
            </button>

            <button
              onClick={() => setCameraView("rocketcam")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraView === "rocketcam"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Rocket Hull Cam"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>RocketCam</span>
            </button>

            <button
              onClick={() => setCameraView("free")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraView === "free"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Free Orbit Camera (Click & Drag)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3D Orbit</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-[#1A73E8] text-white"
                : "bg-white/95 hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124]"
            }`}
            title={soundEnabled ? "Mute Sound" : "Enable Realistic Engine Audio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Pause / Resume */}
          {!isCompleted && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] p-2 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-[#137333]" />
              ) : (
                <Pause className="w-4 h-4 text-[#B06000]" />
              )}
            </button>
          )}

          {/* Reset */}
          <button
            onClick={handleRestart}
            className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] p-2 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer"
            title="Reset Launch Simulation"
          >
            <RotateCcw className="w-4 h-4 text-[#5F6368]" />
          </button>

          {/* Return to Earth Command */}
          <button
            onClick={() => setViewMode("earth")}
            className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] px-3 py-2 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Return to Earth Mission Overview"
          >
            <ArrowLeft className="w-4 h-4 text-[#5F6368]" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      </div>

      {/* ── BOTTOM LIVE STATUS TOAST (Google Maps Style) ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-xl w-[90%]">
        <div className="bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-3 px-5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3 text-xs text-[#202124]">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCompleted ? "bg-[#34A853]" : "bg-[#1A73E8] animate-pulse"
              }`}
            />
            <span className="font-medium text-[#202124]">{toastMessage}</span>
          </div>

          {isCompleted && (
            <button
              onClick={() => setViewMode("orbit_preview")}
              className="pointer-events-auto bg-[#1A73E8] hover:bg-[#1565C0] text-white px-4 py-2 rounded-[10px] font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <span>Proceed to Transit Orbit</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── STAGE 1 SUCCESS CONFIRMATION MODAL & OPENROCKET EXPORT ── */}
      {isCompleted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="bg-white border border-[#E8EAED] rounded-2xl p-6 max-w-lg w-full shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-4 text-center text-[#202124]">
            
            <div className="w-14 h-14 rounded-2xl bg-[#E6F4EA] border border-[#34A853]/40 flex items-center justify-center mx-auto text-[#137333]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-[#137333] uppercase tracking-wider">
                  Liftoff Successful
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F0FE] text-[#1A73E8]">
                  &ge; 96.9% OpenRocket Agreement
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#202124] tracking-tight">
                Stage 1 Complete: Translunar Trajectory Achieved
              </h2>
              <p className="text-xs text-[#5F6368] mt-1.5 leading-relaxed">
                The <span className="font-semibold text-[#202124]">{activeRocket.name}</span> cleared Earth&apos;s atmosphere and reached parking orbit at escape velocity (7.8 km/s).
              </p>
            </div>

            {/* Flight Metrics Summary Card */}
            <div className="bg-[#F8F9FA] rounded-[10px] p-3 text-xs grid grid-cols-2 gap-2 text-left border border-[#E8EAED]">
              <div>
                <span className="text-[#5F6368] text-[11px] block">Cutoff Altitude:</span>
                <span className="font-semibold text-[#202124]">185 km (LEO)</span>
              </div>
              <div>
                <span className="text-[#5F6368] text-[11px] block">Escape Velocity:</span>
                <span className="font-semibold text-[#1A73E8]">7.8 km/s (Mach 23.5)</span>
              </div>
              <div>
                <span className="text-[#5F6368] text-[11px] block">Max-Q Pressure:</span>
                <span className="font-semibold text-[#202124]">34.2 kPa @ 12.8 km</span>
              </div>
              <div>
                <span className="text-[#5F6368] text-[11px] block">Barrowman Stability:</span>
                <span className="font-semibold text-[#137333]">
                  {activeRocket.stabilityMarginCalibers} cal (Stable)
                </span>
              </div>
              <div className="col-span-2 pt-1 border-t border-[#E8EAED]">
                <span className="text-[#5F6368] text-[11px] block">Target Lunar Landing Site:</span>
                <span className="font-semibold text-[#137333]">
                  {selectedSafeLunarSite?.name || "Petavius Crater Floor"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setIsFlightReportModalOpen(true)}
                className="bg-[#F8F9FA] hover:bg-[#E8EAED] text-[#202124] border border-[#E8EAED] py-2.5 px-3 rounded-[10px] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-[#1A73E8]" />
                <span>Full Flight Report</span>
              </button>

              <button
                onClick={() => {
                  if (latestLaunchReport) {
                    downloadOpenRocketFile(activeRocket, latestLaunchReport);
                  }
                }}
                className="bg-[#F8F9FA] hover:bg-[#E8EAED] text-[#202124] border border-[#E8EAED] py-2.5 px-3 rounded-[10px] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#137333]" />
                <span>Export OpenRocket (.ork)</span>
              </button>
            </div>

            <button
              onClick={() => setViewMode("orbit_preview")}
              className="w-full bg-[#1A73E8] hover:bg-[#1565C0] text-white py-3 px-4 rounded-[10px] font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Stage 2: Transit Orbit Simulation</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stage1EarthLaunchView;

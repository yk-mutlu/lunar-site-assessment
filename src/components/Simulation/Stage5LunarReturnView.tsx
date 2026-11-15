// ═══════════════════════════════════════════════════════════════════════
// Stage5LunarReturnView.tsx
// Stage 5: Moon-to-Earth Return, Hypersonic Reentry & Ocean Splashdown
// 4-Phase Cinematic Sequence Matching Spacecraft Return Video:
// 1) Lunar Surface Ascent & Base Separation
// 2) Trans-Earth Orbit Approach with Blue Earth
// 3) Hypersonic Plasma Fireball & Ablation Sparks Reentry
// 4) Orange-White Parachute Ocean Descent, Water Splashdown & Floating Waves
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useStore } from "@/store";
import {
  Rocket,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Globe,
  Flame,
  ShieldCheck,
  Award,
  Layers,
  Camera,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  Waves,
} from "lucide-react";
import { getSynchronizedLunarHeight } from "@/data/lunar-surface-height";

interface EDLPhase {
  id: number;
  name: string;
  shortDesc: string;
  toast: string;
  startT: number;
  endT: number;
  targetAlt: string;
  targetVel: string;
}

const EDL_PHASES: EDLPhase[] = [
  {
    id: 1,
    name: "1. Lunar Liftoff & Ascent",
    shortDesc: "Lunar Liftoff",
    toast: "Phase 1/4: Ascent Engine Ignition! Capsule separates from lunar descent stage base and climbs into orbit.",
    startT: 0.0,
    endT: 0.25,
    targetAlt: "0 -> 45 km (Lunar Orbit)",
    targetVel: "0 -> 1.7 km/s (Lunar Orbit)",
  },
  {
    id: 2,
    name: "2. Trans-Earth Orbit Approach",
    shortDesc: "Earth Orbit",
    toast: "Phase 2/4: Trans-Earth trajectory insertion. Approaching blue Earth, heat shield aligned with velocity vector.",
    startT: 0.25,
    endT: 0.50,
    targetAlt: "120 -> 85 km (Earth Orbit)",
    targetVel: "Mach 32 (11.0 km/s)",
  },
  {
    id: 3,
    name: "3. Hypersonic Plasma Reentry",
    shortDesc: "Plasma Reentry",
    toast: "Phase 3/4: Hypersonic Ionization. Superheated ablative shield reaches 2,840°C with fiery plasma wake.",
    startT: 0.50,
    endT: 0.75,
    targetAlt: "85 -> 10 km (Atmosphere)",
    targetVel: "Mach 28 -> Mach 1.5",
  },
  {
    id: 4,
    name: "4. Parachute & Ocean Splashdown",
    shortDesc: "Ocean Splashdown",
    toast: "Phase 4/4: Orange-white ring-sail parachute deployed! Water splashdown in Pacific Ocean, floating in rolling waves.",
    startT: 0.75,
    endT: 1.0,
    targetAlt: "10 km -> 0 m Sea Level",
    targetVel: "0.0 m/s (Buoyant Float)",
  },
];

// Continuous Multi-Frequency Pacific Ocean Wave Equation
export function getOceanWaveHeight(x: number, z: number, t: number): number {
  const w1 = Math.sin(x * 0.042 + t * 1.5) * Math.cos(z * 0.032 + t * 1.1) * 0.52;
  const w2 = Math.sin(x * 0.095 - z * 0.082 + t * 2.2) * 0.26;
  const w3 = Math.cos(x * 0.18 + z * 0.16 - t * 3.1) * 0.11;
  return w1 + w2 + w3;
}

export const Stage5LunarReturnView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { selectedSafeLunarSite, setViewMode } = useStore();

  // Telemetry state
  const [altitudeStr, setAltitudeStr] = useState("0 m");
  const [velocityStr, setVelocityStr] = useState("0 km/h");
  const [machNumber, setMachNumber] = useState(0.0);
  const [heatShieldTempC, setHeatShieldTempC] = useState(25);
  const [gForce, setGForce] = useState(1.0);
  const [activePhaseId, setActivePhaseId] = useState(1);
  const [currentToast, setCurrentToast] = useState(EDL_PHASES[0].toast);
  const [isSplashdown, setIsSplashdown] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraMode, setCameraMode] = useState<"cinematic" | "free" | "capsule" | "ocean">("cinematic");
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Audio references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;
  const animFrameRef = useRef<number | null>(null);

  // Jump to specific phase
  const jumpToPhase = (phaseId: number) => {
    const phase = EDL_PHASES.find((p) => p.id === phaseId);
    if (!phase) return;
    progressRef.current = phase.startT + 0.01;
  };

  const progressRef = useRef(0.0);

  // Audio toggle
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
        filter.frequency.setValueAtTime(320, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNodeRef.current = gainNode;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();

        setSoundEnabled(true);
      } catch (err) {
        console.warn("Audio init error:", err);
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
    scene.background = new THREE.Color(0x020306);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      8000
    );
    camera.position.set(-18, 12, 26);

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
    controls.maxDistance = 350;
    controls.minDistance = 2;
    controls.enabled = cameraMode === "free"; // Only enable OrbitControls when in Free 3D mode so it doesn't fight camera tracking

    // ── 2. Environmental Lighting ───────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x1a2638, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 4.0);
    sunLight.position.set(-280, 360, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    scene.add(sunLight);

    // Deep Space Starfield
    const starCount = 2200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 3000;
      starPos[i + 1] = Math.random() * 1600 + 40;
      starPos[i + 2] = (Math.random() - 0.5) * 3000;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.0,
      transparent: true,
      opacity: 0.95,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // ── 3. PHASE 1: LUNAR SURFACE & DESCENT STAGE BASE ──────────────
    const lunarSceneGroup = new THREE.Group();
    scene.add(lunarSceneGroup);

    // Lunar Ground Terrain with Craters
    const lunarGeo = new THREE.CircleGeometry(320, 80);
    lunarGeo.rotateX(-Math.PI / 2);
    const lPos = lunarGeo.attributes.position;
    for (let i = 0; i < lPos.count; i++) {
      const lx = lPos.getX(i);
      const lz = lPos.getZ(i);
      lPos.setY(i, getSynchronizedLunarHeight(lx, lz));
    }
    lunarGeo.computeVertexNormals();

    const lunarMat = new THREE.MeshStandardMaterial({
      color: 0x888b94,
      roughness: 0.94,
      metalness: 0.04,
      flatShading: false,
    });
    const lunarTerrain = new THREE.Mesh(lunarGeo, lunarMat);
    lunarTerrain.receiveShadow = true;
    lunarSceneGroup.add(lunarTerrain);

    // Octagonal Lunar Descent Stage Base (Stays on the Moon at separation!)
    const descentBaseGroup = new THREE.Group();
    descentBaseGroup.position.set(0, 0, 0);
    lunarSceneGroup.add(descentBaseGroup);

    const goldFoilMat = new THREE.MeshStandardMaterial({ color: 0xd69922, metalness: 0.85, roughness: 0.28 });
    const silverLegMat = new THREE.MeshStandardMaterial({ color: 0xd0d4dc, metalness: 0.9, roughness: 0.2 });

    const baseChassis = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 1.4, 8), goldFoilMat);
    baseChassis.position.y = 0.85;
    baseChassis.castShadow = true;
    descentBaseGroup.add(baseChassis);

    // 4 Landing Gear Legs & Footpads
    for (let l = 0; l < 4; l++) {
      const lAng = (l * Math.PI) / 2 + Math.PI / 4;
      const legTruss = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8), silverLegMat);
      legTruss.position.set(Math.cos(lAng) * 2.2, 0.7, Math.sin(lAng) * 2.2);
      legTruss.rotation.z = Math.cos(lAng) * 0.65;
      legTruss.rotation.x = Math.sin(lAng) * 0.65;
      descentBaseGroup.add(legTruss);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 16), goldFoilMat);
      pad.position.set(Math.cos(lAng) * 3.3, 0.05, Math.sin(lAng) * 3.3);
      descentBaseGroup.add(pad);
    }

    // ── 4. PHASE 2: BLUE EARTH WITH ATMOSPHERIC GLOW ───────────────
    const earthGroup = new THREE.Group();
    earthGroup.position.set(0, -60, -280);
    scene.add(earthGroup);

    const earthGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(95, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0x1a5bb0,
        roughness: 0.45,
        metalness: 0.15,
      })
    );
    earthGroup.add(earthGlobe);

    // Cloud Swirl Atmosphere
    const earthCloud = new THREE.Mesh(
      new THREE.SphereGeometry(96.2, 48, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.42,
        roughness: 0.8,
      })
    );
    earthGroup.add(earthCloud);

    // Blue Atmosphere Rim Halo
    const atmosphereHalo = new THREE.Mesh(
      new THREE.SphereGeometry(98.5, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x4da6ff,
        transparent: true,
        opacity: 0.28,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    );
    earthGroup.add(atmosphereHalo);

    // ── 5. PHASE 4: PACIFIC OCEAN WITH ROLLING WAVES ────────────────
    const oceanGroup = new THREE.Group();
    scene.add(oceanGroup);

    const oceanGeo = new THREE.PlaneGeometry(3200, 3200, 140, 140);
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanWater = new THREE.Mesh(
      oceanGeo,
      new THREE.MeshStandardMaterial({
        color: 0x072847,
        roughness: 0.12,
        metalness: 0.88,
        transparent: true,
        opacity: 0.96,
        flatShading: false,
      })
    );
    oceanWater.receiveShadow = true;
    oceanGroup.add(oceanWater);

    // Splashdown Water Spray Plume
    const splashPlume = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 0.8, 6.5, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xe6f4ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
    );
    splashPlume.position.y = 3.25;
    oceanGroup.add(splashPlume);

    // Circular Foam Ring
    const splashRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 2.6, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
    );
    splashRing.rotation.x = -Math.PI / 2;
    splashRing.position.y = 0.12;
    oceanGroup.add(splashRing);

    // Fluorescein Green Sea Dye Marker
    const dyeMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 36).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x00ff77,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      })
    );
    dyeMesh.position.y = 0.08;
    oceanGroup.add(dyeMesh);

    // Coastal Cloud Deck Plane
    const cloudDeck = new THREE.Mesh(
      new THREE.PlaneGeometry(2800, 2800, 16, 16).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0xf5f8ff,
        roughness: 0.95,
        transparent: true,
        opacity: 0.35,
      })
    );
    cloudDeck.position.y = 95.0;
    oceanGroup.add(cloudDeck);

    // ── 6. CONICAL CREW ASCENT & RETURN CAPSULE (APOLLO / ORION) ────
    const spacecraft = new THREE.Group();
    scene.add(spacecraft);

    // Conical Crew Hull (White Heat-Resistant Tiles)
    const capsuleHullMat = new THREE.MeshStandardMaterial({
      color: 0xf0f2f5,
      metalness: 0.5,
      roughness: 0.32,
    });
    const capsuleCone = new THREE.Mesh(new THREE.ConeGeometry(1.85, 2.1, 32), capsuleHullMat);
    capsuleCone.position.y = 1.15;
    capsuleCone.castShadow = true;
    capsuleCone.receiveShadow = true;
    spacecraft.add(capsuleCone);

    // Apex Docking Collar & Hatch
    const forwardBay = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.56, 0.35, 20),
      new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.85, roughness: 0.28 })
    );
    forwardBay.position.y = 2.25;
    spacecraft.add(forwardBay);

    // 4 RCS Thruster Pods
    const rcsMat = new THREE.MeshStandardMaterial({ color: 0x1b1f26, metalness: 0.8 });
    for (let r = 0; r < 4; r++) {
      const rAng = (r * Math.PI) / 2;
      const rcsBlock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.16), rcsMat);
      rcsBlock.position.set(Math.cos(rAng) * 1.3, 0.8, Math.sin(rAng) * 1.3);
      rcsBlock.rotation.y = -rAng;
      spacecraft.add(rcsBlock);
    }

    // Cockpit Windows
    const winMat = new THREE.MeshStandardMaterial({ color: 0x050a12, roughness: 0.05, metalness: 0.95 });
    [-0.35, 0.35].forEach((xW) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.06), winMat);
      win.position.set(xW, 1.2, 0.82);
      win.rotation.set(-0.35, xW * -0.3, 0);
      spacecraft.add(win);
    });

    // Ablative Heat Shield (Black Carbon-Phenolic Blunt Base)
    const heatShieldMat = new THREE.MeshStandardMaterial({
      color: 0x15171c,
      roughness: 0.9,
      metalness: 0.08,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });
    const heatShield = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.72, 0.28, 36),
      heatShieldMat
    );
    heatShield.position.y = 0.14;
    spacecraft.add(heatShield);

    // Phase 1: Ascent Engine Rocket Plume (Fires downwards during lunar liftoff)
    const ascentPlumeGroup = new THREE.Group();
    ascentPlumeGroup.position.set(0, -0.1, 0);
    spacecraft.add(ascentPlumeGroup);

    const plumeCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 2.2, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
    );
    plumeCore.rotation.x = Math.PI;
    plumeCore.position.y = -1.1;
    ascentPlumeGroup.add(plumeCore);

    const plumeFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 3.8, 16),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending })
    );
    plumeFlame.rotation.x = Math.PI;
    plumeFlame.position.y = -1.9;
    ascentPlumeGroup.add(plumeFlame);

    // Phase 3: Hypersonic Plasma Shockwave & Sheath
    const plasmaGroup = new THREE.Group();
    spacecraft.add(plasmaGroup);

    const shockSheath = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff3b00,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      })
    );
    shockSheath.position.y = 0.6;
    plasmaGroup.add(shockSheath);

    const innerPlasma = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfff2dd,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      })
    );
    innerPlasma.position.y = 0.4;
    plasmaGroup.add(innerPlasma);

    // Reentry Ablation Sparks (Sparks trailing behind heat shield)
    const sparkCount = 200;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let s = 0; s < sparkCount * 3; s += 3) {
      sparkPos[s] = (Math.random() - 0.5) * 2.5;
      sparkPos[s + 1] = Math.random() * -5.0;
      sparkPos[s + 2] = (Math.random() - 0.5) * 2.5;
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.5,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    spacecraft.add(sparkPoints);

    // Phase 4: Orange-and-White Striped Main Parachute (Matching video frames!)
    const parachuteGroup = new THREE.Group();
    parachuteGroup.position.set(0, 11.5, 0);
    parachuteGroup.visible = false;
    spacecraft.add(parachuteGroup);

    // Parachute Canopy Canvas Texture with Orange and White Radial Stripes
    const createStripedChuteTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const stripes = 24;
      const stripeWidth = 512 / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#FF5500" : "#FFFFFF"; // International Orange & Pure White
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, 512);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    };
    const chuteTex = createStripedChuteTexture();

    const mainChuteCanopy = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 32, 24, 0, Math.PI * 2, 0, Math.PI / 1.75),
      new THREE.MeshStandardMaterial({
        map: chuteTex || undefined,
        roughness: 0.72,
        metalness: 0.05,
        side: THREE.DoubleSide,
      })
    );
    parachuteGroup.add(mainChuteCanopy);

    // Parachute Suspension Cables to Capsule Apex
    for (let c = 0; c < 8; c++) {
      const cAng = (c * Math.PI * 2) / 8;
      const cordGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(cAng) * 3.4, -0.4, Math.sin(cAng) * 3.4),
        new THREE.Vector3(0, -9.2, 0),
      ]);
      const cord = new THREE.Line(
        cordGeo,
        new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.7 })
      );
      parachuteGroup.add(cord);
    }

    // Heat Shield Smoke/Steam Wisps (Billowing gently off charred heat shield in atmosphere)
    const smokeCount = 80;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let sm = 0; sm < smokeCount * 3; sm += 3) {
      smokePos[sm] = (Math.random() - 0.5) * 1.8;
      smokePos[sm + 1] = Math.random() * 2.5;
      smokePos[sm + 2] = (Math.random() - 0.5) * 1.8;
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 1.2,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    spacecraft.add(smokePoints);

    // 3 Spherical Orange Flotation Balloons (Apex)
    const balloonGroup = new THREE.Group();
    balloonGroup.position.set(0, 2.25, 0);
    balloonGroup.scale.set(0.001, 0.001, 0.001);
    spacecraft.add(balloonGroup);

    const balloonMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.45 });
    for (let b = 0; b < 3; b++) {
      const bAng = (b * Math.PI * 2) / 3;
      const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 16), balloonMat);
      balloon.position.set(Math.cos(bAng) * 0.45, 0.35, Math.sin(bAng) * 0.45);
      balloonGroup.add(balloon);
    }

    // Strobe Recovery Light
    const strobeLight = new THREE.PointLight(0x00ff88, 0, 25);
    strobeLight.position.y = 2.45;
    spacecraft.add(strobeLight);

    // ── 7. ANIMATION & 4-PHASE TIMELINE LOOP ─────────────────────────
    const SIM_DURATION = 22.0; // 22 seconds total (~5.5 seconds per phase as requested)
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Real-time Pacific Ocean Wave Displacement
      const oceanAttr = oceanGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < oceanAttr.count; i++) {
        const ox = oceanAttr.getX(i);
        const oz = oceanAttr.getZ(i);
        oceanAttr.setY(i, getOceanWaveHeight(ox, oz, time));
      }
      oceanAttr.needsUpdate = true;
      oceanGeo.computeVertexNormals();

      // Earth slow rotation
      earthGlobe.rotation.y = time * 0.015;
      earthCloud.rotation.y = time * 0.02;

      if (!isPausedRef.current) {
        const delta = clock.getDelta();
        progressRef.current = Math.min(1.0, progressRef.current + delta / SIM_DURATION);
        const simProgress = progressRef.current;

        // Active Phase Detection
        const curPhase =
          EDL_PHASES.find((p) => simProgress >= p.startT && simProgress <= p.endT) ||
          EDL_PHASES[EDL_PHASES.length - 1];

        setActivePhaseId(curPhase.id);
        setCurrentToast(curPhase.toast);

        // ════════════════════════════════════════════════════════════
        // PHASE 1: LUNAR LIFTOFF & ASCENT (0.00 <= t < 0.25)
        // ════════════════════════════════════════════════════════════
        if (simProgress < 0.25) {
          const p1 = simProgress / 0.25;
          lunarSceneGroup.visible = true;
          earthGroup.visible = false;
          oceanGroup.visible = false;

          // Capsule climbs from lunar base y=1.65 to y=75
          const climbY = 1.65 + Math.pow(p1, 1.8) * 75.0;
          spacecraft.position.set(0, climbY, 0);
          spacecraft.rotation.set(0.05 * Math.sin(time * 3), 0, 0);

          // Ascent rocket flame flicker
          ascentPlumeGroup.visible = true;
          const flicker = 0.85 + Math.random() * 0.3;
          plumeCore.scale.set(flicker, flicker * 1.1, flicker);
          plumeFlame.scale.set(flicker * 1.1, flicker * 1.25, flicker * 1.1);

          // Visibility states
          plasmaGroup.visible = false;
          sparkMat.opacity = 0;
          parachuteGroup.visible = false;
          smokeMat.opacity = 0;
          balloonGroup.scale.set(0.001, 0.001, 0.001);
          strobeLight.intensity = 0;

          scene.background = new THREE.Color(0x020306);
          ambientLight.intensity = 0.45;
          (starMat as THREE.PointsMaterial).opacity = 0.95;

          // Telemetry
          const altKm = (p1 * 45).toFixed(1);
          const velKms = (p1 * 1.7).toFixed(2);
          setAltitudeStr(`${altKm} km (Lunar Alt)`);
          setVelocityStr(`${velKms} km/s (${Math.round(p1 * 6120)} km/h)`);
          setMachNumber(Number((p1 * 5.2).toFixed(1)));
          setHeatShieldTempC(Math.round(25 + p1 * 120));
          setGForce(Number((1.0 + p1 * 1.8).toFixed(2)));

          // Camera Tracking (Phase 1: Lunar Liftoff)
          if (cameraMode === "cinematic") {
            controls.target.set(0, climbY + 0.8, 0);
            camera.position.set(
              -10.0 + p1 * 4.0,
              climbY + 3.2,
              14.0 + p1 * 5.0
            );
            camera.lookAt(0, climbY + 0.8, 0);
          }
        }
        // ════════════════════════════════════════════════════════════
        // PHASE 2: TRANS-EARTH ORBIT APPROACH (0.25 <= t < 0.50)
        // ════════════════════════════════════════════════════════════
        else if (simProgress < 0.50) {
          const p2 = (simProgress - 0.25) / 0.25;
          lunarSceneGroup.visible = false;
          earthGroup.visible = true;
          oceanGroup.visible = false;
          ascentPlumeGroup.visible = false;

          // Capsule cruises in orbit toward Earth
          spacecraft.position.set(
            THREE.MathUtils.lerp(18.0, 0, p2),
            THREE.MathUtils.lerp(14.0, 8.0, p2),
            THREE.MathUtils.lerp(20.0, -10.0, p2)
          );
          // Turn capsule so heat shield faces forward towards reentry direction
          spacecraft.rotation.set(-0.75 + Math.sin(time * 1.2) * 0.02, 0.35 * (1 - p2), 0);

          plasmaGroup.visible = false;
          sparkMat.opacity = 0;
          parachuteGroup.visible = false;
          smokeMat.opacity = 0;
          balloonGroup.scale.set(0.001, 0.001, 0.001);
          strobeLight.intensity = 0;

          scene.background = new THREE.Color(0x020306);
          ambientLight.intensity = 0.55;
          (starMat as THREE.PointsMaterial).opacity = 0.95;

          // Telemetry
          const altKm = Math.round(THREE.MathUtils.lerp(120, 85, p2));
          setAltitudeStr(`${altKm} km (Earth Orbit)`);
          setVelocityStr("39,600 km/h (11.0 km/s)");
          setMachNumber(32.4);
          setHeatShieldTempC(Math.round(THREE.MathUtils.lerp(95, 840, p2)));
          setGForce(0.08);

          // Camera Tracking (Phase 2: Translunar Deep Space)
          if (cameraMode === "cinematic") {
            controls.target.set(spacecraft.position.x, spacecraft.position.y + 0.5, spacecraft.position.z);
            camera.position.set(
              spacecraft.position.x - 9.0,
              spacecraft.position.y + 3.5,
              spacecraft.position.z + 14.0
            );
            camera.lookAt(spacecraft.position.x, spacecraft.position.y + 0.5, spacecraft.position.z);
          }
        }
        // ════════════════════════════════════════════════════════════
        // PHASE 3: HYPERSONIC PLASMA REENTRY (0.50 <= t < 0.75)
        // ════════════════════════════════════════════════════════════
        else if (simProgress < 0.75) {
          const p3 = (simProgress - 0.50) / 0.25;
          lunarSceneGroup.visible = false;
          earthGroup.visible = true;
          oceanGroup.visible = false;
          ascentPlumeGroup.visible = false;

          // Capsule plunges through the upper atmosphere
          const currentY = THREE.MathUtils.lerp(95.0, 32.0, p3);
          spacecraft.position.set(0, currentY, 0);

          // Aerodynamic buffeting
          const buffeting = Math.sin(time * 28.0) * 0.035;
          spacecraft.rotation.set(-0.75 + buffeting, 0, Math.cos(time * 22.0) * 0.025);

          // Fiery plasma sheath & sparks
          plasmaGroup.visible = true;
          const plasmaCurve = Math.sin(p3 * Math.PI);
          shockSheath.material.opacity = Math.min(0.96, 0.45 + plasmaCurve * 0.52);
          innerPlasma.material.opacity = Math.min(0.98, 0.4 + plasmaCurve * 0.58);
          sparkMat.opacity = Math.min(0.92, plasmaCurve * 0.92);

          // Heat shield incandescent glow
          heatShieldMat.emissive.setHex(0xffaa22);
          heatShieldMat.emissiveIntensity = 2.5 + plasmaCurve * 5.0;

          // Update trailing sparks
          const posArr = sparkGeo.attributes.position as THREE.BufferAttribute;
          for (let s = 0; s < sparkCount; s++) {
            let sy = posArr.getY(s) - 0.65;
            if (sy < -8.0) sy = 0;
            posArr.setY(s, sy);
          }
          posArr.needsUpdate = true;

          parachuteGroup.visible = false;
          smokeMat.opacity = 0;
          balloonGroup.scale.set(0.001, 0.001, 0.001);
          strobeLight.intensity = 0;

          const skyColor = new THREE.Color(0x020306).lerp(new THREE.Color(0x0c254a), p3 * 0.85);
          scene.background = skyColor;
          ambientLight.intensity = 0.55 + p3 * 0.45;

          // Telemetry
          const altKm = Math.round(THREE.MathUtils.lerp(85, 10, p3));
          const velKmh = Math.round(THREE.MathUtils.lerp(39600, 1850, p3));
          const mach = Number(THREE.MathUtils.lerp(32.4, 1.5, p3).toFixed(1));
          const peakTemp = Math.round(840 + plasmaCurve * 2000);
          setAltitudeStr(`${altKm} km`);
          setVelocityStr(`${velKmh.toLocaleString()} km/h`);
          setMachNumber(mach);
          setHeatShieldTempC(peakTemp);
          setGForce(Number((1.2 + plasmaCurve * 5.5).toFixed(2)));

          // Camera Tracking (Phase 3: Hypersonic Chase with dramatic shake)
          if (cameraMode === "cinematic") {
            const shake = (Math.random() - 0.5) * 0.12;
            controls.target.set(0, currentY, 0);
            camera.position.set(-10.0 + shake, currentY + 3.5 + shake, 14.0);
            camera.lookAt(0, currentY, 0);
          }
        }
        // ════════════════════════════════════════════════════════════
        // PHASE 4: PARACHUTE DESCENT & OCEAN SPLASHDOWN (0.75 <= t <= 1.0)
        // ════════════════════════════════════════════════════════════
        else {
          const p4 = (simProgress - 0.75) / 0.25;
          lunarSceneGroup.visible = false;
          earthGroup.visible = false;
          oceanGroup.visible = true;
          ascentPlumeGroup.visible = false;
          plasmaGroup.visible = false;
          sparkMat.opacity = 0;

          // Coastal daylight atmosphere
          scene.background = new THREE.Color(0x5ca6f2);
          ambientLight.intensity = 1.15;
          (starMat as THREE.PointsMaterial).opacity = 0;

          // Parachute deployed!
          parachuteGroup.visible = p4 < 0.94;
          if (parachuteGroup.visible) {
            mainChuteCanopy.rotation.y = time * 0.25;
          }

          // Heat shield charred with billowing smoke wisps
          heatShieldMat.emissiveIntensity = 0;
          smokeMat.opacity = Math.max(0, (1 - p4) * 0.65);
          const smArr = smokeGeo.attributes.position as THREE.BufferAttribute;
          for (let sm = 0; sm < smokeCount; sm++) {
            let smy = smArr.getY(sm) + 0.05;
            if (smy > 3.0) smy = 0;
            smArr.setY(sm, smy);
          }
          smArr.needsUpdate = true;

          // Altitude Descent Profile
          if (p4 < 0.92) {
            // Gliding down under the orange-white parachute toward ocean
            const descendY = THREE.MathUtils.lerp(75.0, 0.95, Math.pow(p4 / 0.92, 1.4));
            spacecraft.position.set(0, descendY, 0);
            spacecraft.rotation.set(Math.sin(time * 2.2) * 0.06, 0, Math.cos(time * 1.8) * 0.05);

            splashRing.material.opacity = 0;
            splashPlume.material.opacity = 0;
            dyeMesh.material.opacity = 0;
            balloonGroup.scale.set(0.001, 0.001, 0.001);
            strobeLight.intensity = 0;

            const altM = Math.round((1 - p4 / 0.92) * 10000);
            setAltitudeStr(`${altM} m`);
            setVelocityStr("28 km/h (7.8 m/s)");
            setMachNumber(0.02);
            setHeatShieldTempC(Math.round(THREE.MathUtils.lerp(280, 45, p4 / 0.92)));
            setGForce(1.0);

            // Camera Tracking (Phase 4A: Parachute descent)
            if (cameraMode === "cinematic") {
              controls.target.set(0, descendY + 1.2, 0);
              camera.position.set(-11.0, descendY + 4.5, 15.0);
              camera.lookAt(0, descendY + 1.2, 0);
            }
          } else {
            // Touchdown & Floating on Ocean Waves!
            const waveY = getOceanWaveHeight(0, 0, time);
            const floatY = waveY + 0.22;
            spacecraft.position.set(0, floatY, 0);

            // Natural wave rocking pitch and roll
            const waveSlopeX = (getOceanWaveHeight(0.5, 0, time) - getOceanWaveHeight(-0.5, 0, time));
            const waveSlopeZ = (getOceanWaveHeight(0, 0.5, time) - getOceanWaveHeight(0, -0.5, time));
            spacecraft.rotation.set(waveSlopeZ * 0.8, 0, -waveSlopeX * 0.8);

            // Splash water plume & foam ring
            const splashT = (p4 - 0.92) / 0.08;
            if (splashT < 0.45) {
              const sp = splashT / 0.45;
              splashPlume.scale.set(1 + sp * 1.5, 1 + sp * 0.8, 1 + sp * 1.5);
              splashPlume.material.opacity = (1 - sp) * 0.85;
            } else {
              splashPlume.material.opacity = 0;
            }

            // Expanding foam ring
            splashRing.scale.set(1 + splashT * 4.5, 1 + splashT * 4.5, 1);
            splashRing.material.opacity = Math.max(0, 0.85 - splashT * 0.7);

            // Fluorescein green dye marker
            dyeMesh.scale.set(1 + splashT * 6.5, 1 + splashT * 6.5, 1);
            dyeMesh.material.opacity = Math.min(0.75, splashT * 1.2);

            // Inflate 3 orange flotation balloons
            const bScale = Math.min(1.0, splashT * 3.5);
            balloonGroup.scale.set(bScale, bScale, bScale);

            // Strobe beacon flash
            strobeLight.intensity = Math.sin(time * 8.0) > 0.3 ? 3.5 : 0;

            if (!isSplashdown) {
              setIsSplashdown(true);
            }

            setAltitudeStr("0 m (Sea Level)");
            setVelocityStr("0.0 km/h (Floating)");
            setMachNumber(0.0);
            setHeatShieldTempC(24);
            setGForce(1.0);

            // Camera Tracking (Phase 4B: Floating on water)
            if (cameraMode === "cinematic" || cameraMode === "ocean") {
              controls.target.set(0, floatY + 0.4, 0);
              camera.position.set(6.5, floatY + 2.0, 6.5);
              camera.lookAt(0, floatY + 0.4, 0);
            }
          }
        }
      }

      // Camera Modes
      if (cameraMode === "capsule") {
        controls.target.set(spacecraft.position.x, spacecraft.position.y + 0.4, spacecraft.position.z);
        camera.position.set(spacecraft.position.x - 4.5, spacecraft.position.y + 1.2, spacecraft.position.z + 5.5);
        camera.lookAt(spacecraft.position.x, spacecraft.position.y + 0.4, spacecraft.position.z);
      } else if (cameraMode === "ocean") {
        controls.target.set(spacecraft.position.x, spacecraft.position.y + 0.4, spacecraft.position.z);
        camera.position.set(7.5, 1.8, 7.5);
        camera.lookAt(spacecraft.position.x, spacecraft.position.y + 0.4, spacecraft.position.z);
      } else if (cameraMode === "free") {
        controls.target.set(spacecraft.position.x, spacecraft.position.y, spacecraft.position.z);
        controls.update();
      }

      renderer.render(scene, camera);
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
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [cameraMode]);

  const handleRestart = () => {
    progressRef.current = 0.0;
    setIsSplashdown(false);
    setIsPaused(false);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#020306] font-sans text-[#202124]">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* ── TOP CONTROL & TELEMETRY BAR ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pointer-events-none">

        {/* Left Telemetry Card */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-3 px-5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex flex-wrap items-center gap-4 text-xs text-[#202124]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSplashdown ? "bg-[#34A853]" : "bg-[#1A73E8] animate-pulse"
              }`}
            />
            <div>
              <span className="font-semibold text-[#202124] uppercase text-xs block">
                {isSplashdown ? "Pacific Splashdown Confirmed" : "Stage 5: Earth Return & Splashdown"}
              </span>
              <span className="text-[11px] text-[#5F6368]">
                Artemis III Crew Return Module
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-[#E8EAED] hidden sm:block" />

          <div>
            <span className="text-[#5F6368] text-[10px] block">Altitude</span>
            <span className="font-semibold text-[#202124] text-sm">{altitudeStr}</span>
          </div>

          <div className="h-6 w-px bg-[#E8EAED] hidden sm:block" />

          <div>
            <span className="text-[#5F6368] text-[10px] block">Velocity</span>
            <span className="font-semibold text-[#1A73E8] text-sm">{velocityStr}</span>
          </div>

          <div className="h-6 w-px bg-[#E8EAED] hidden sm:block" />

          <div>
            <span className="text-[#5F6368] text-[10px] block">Mach Number</span>
            <span className="font-semibold text-[#202124] text-sm">Mach {machNumber}</span>
          </div>

          <div className="h-6 w-px bg-[#E8EAED] hidden sm:block" />

          <div>
            <span className="text-[#5F6368] text-[10px] block">Heat Shield</span>
            <span
              className={`font-semibold text-sm ${
                heatShieldTempC > 1800 ? "text-[#EA4335] animate-pulse" : "text-[#E37400]"
              }`}
            >
              {heatShieldTempC}°C
            </span>
          </div>
        </div>

        {/* 4 Phases Tracker & Jump Controls */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex items-center gap-1.5 overflow-x-auto max-w-full">
          {EDL_PHASES.map((phase) => {
            const isCurrent = activePhaseId === phase.id;
            const isPassed = activePhaseId > phase.id;
            return (
              <button
                key={phase.id}
                onClick={() => jumpToPhase(phase.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                    : isPassed
                    ? "text-[#137333] bg-[#E6F4EA] border border-[#34A853]/30 font-medium"
                    : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
                }`}
                title={phase.toast}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrent ? "bg-white animate-pulse" : "bg-[#5F6368]/40"
                    }`}
                  />
                )}
                <span>{phase.shortDesc}</span>
              </button>
            );
          })}
        </div>

        {/* Right Camera Controls & Actions */}
        <div className="pointer-events-auto flex items-center gap-2 self-end lg:self-auto">
          <div className="bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-[10px] p-1 flex items-center gap-1 text-xs shadow-sm">
            <button
              onClick={() => setCameraMode("cinematic")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                cameraMode === "cinematic"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Cinematic Dynamic Multi-Phase Camera"
            >
              Cinematic
            </button>
            <button
              onClick={() => setCameraMode("free")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                cameraMode === "free"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Free 360° Mouse Orbit Control"
            >
              Free 3D
            </button>
            <button
              onClick={() => setCameraMode("capsule")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                cameraMode === "capsule"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Focus on Capsule & Heat Shield"
            >
              Capsule
            </button>
            <button
              onClick={() => setCameraMode("ocean")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                cameraMode === "ocean"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Ocean Surface View"
            >
              Ocean
            </button>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] p-2.5 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="w-4 h-4 text-[#137333]" /> : <Pause className="w-4 h-4 text-[#E37400]" />}
          </button>

          <button
            onClick={handleRestart}
            className="bg-white/95 hover:bg-[#F1F3F4] text-[#1A73E8] p-2.5 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer"
            title="Restart Stage 5 from Lunar Liftoff"
          >
            <RotateCcw className="w-4 h-4 text-[#1A73E8]" />
          </button>

          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-[#1A73E8] text-white"
                : "bg-white/95 hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124]"
            }`}
            title={soundEnabled ? "Mute Atmospheric Sound" : "Enable Sound Effects"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setViewMode("surface_traverse")}
            className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] px-3 py-2 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Back to Stage 4 Lunar Traverse"
          >
            <ArrowLeft className="w-4 h-4 text-[#5F6368]" />
            <span className="hidden sm:inline">Stage 4</span>
          </button>
        </div>
      </div>

      {/* ── BOTTOM LIVE INFORMATION CARD (Google Maps Style) ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-xl w-[90%]">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-3 px-5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3 text-xs text-[#202124]">
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#202124] text-sm">
                {EDL_PHASES.find((p) => p.id === activePhaseId)?.name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] text-[10px] font-semibold">
                LIVE SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-[#5F6368] leading-tight">{currentToast}</p>
          </div>

          {isSplashdown && (
            <button
              onClick={() => setViewMode("2d")}
              className="bg-[#1A73E8] hover:bg-[#1565C0] text-white px-4 py-2 rounded-[10px] font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <span>Review Sites</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── MISSION COMPLETION SUCCESS MODAL ── */}
      {isSplashdown && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="bg-white border border-[#E8EAED] rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-4 text-center text-[#202124]">
            <div className="w-14 h-14 rounded-2xl bg-[#E6F4EA] border border-[#34A853]/40 flex items-center justify-center mx-auto text-[#137333]">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#137333] uppercase tracking-wider block mb-1">
                Lunar Mission Completed Successfully
              </span>
              <h2 className="text-xl font-bold tracking-tight text-[#202124]">
                Crew Capsule Splashdown Confirmed!
              </h2>
              <p className="text-xs text-[#5F6368] mt-1.5 leading-relaxed">
                The crew capsule has successfully returned from the Moon, completed hypersonic atmospheric reentry with maximum thermal protection, deployed ring-sail parachutes, and safely splashed down in the Pacific Ocean. All lunar regolith and ice samples intact.
              </p>
            </div>

            <div className="bg-[#F8F9FA] rounded-[10px] p-3 text-xs grid grid-cols-2 gap-2 text-left border border-[#E8EAED]">
              <div>
                <span className="text-[#5F6368] text-[11px] block">Returned Samples:</span>
                <span className="font-semibold text-[#1A73E8]">11.6 kg Regolith & Ice</span>
              </div>
              <div>
                <span className="text-[#5F6368] text-[11px] block">Splashdown Site:</span>
                <span className="font-semibold text-[#202124]">Pacific Ocean (28.4°N, 142.1°W)</span>
              </div>
              <div>
                <span className="text-[#5F6368] text-[11px] block">Touchdown Speed:</span>
                <span className="font-semibold text-[#137333]">7.8 m/s (Nominal Float)</span>
              </div>
              <div>
                <span className="text-[#5F6368] text-[11px] block">Flotation Ballasts:</span>
                <span className="font-semibold text-[#137333]">Active & Stable</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleRestart}
                className="flex-1 bg-[#F8F9FA] hover:bg-[#E8EAED] text-[#202124] py-2.5 px-3 rounded-[10px] font-semibold text-xs border border-[#E8EAED] transition-all cursor-pointer"
              >
                Replay Mission Return
              </button>
              <button
                onClick={() => setViewMode("2d")}
                className="flex-1 bg-[#1A73E8] hover:bg-[#1565C0] text-white py-2.5 px-3 rounded-[10px] font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Lunar Site Map</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stage5LunarReturnView;

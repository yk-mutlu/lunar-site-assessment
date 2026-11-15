"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "@/store";
import type { LunarRock } from "@/types";
import type { CandidateSite } from "@/data/site-scoring-types";
import { detectSafeLandingSites } from "@/data/site-detection";
import { WaypointSystem } from "./WaypointSystem";
import { CameraFlyController } from "./CameraFlyController";
import {
  Scan,
  ArrowLeft,
  Crosshair,
  Sparkles,
  Info,
  MapPin,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

// Topographic height function for Petavius Crater macro relief in Three.js
const getPetaviusTerrainHeight = (vx: number, vz: number): number => {
  const dist = Math.sqrt(vx * vx + vz * vz);
  let y = 0;

  // 1. Central Peak Massif Complex (+68m)
  if (dist < 85) {
    const p1 = Math.exp(-((vx - 5) ** 2 + (vz + 8) ** 2) / 380) * 68;
    const p2 = Math.exp(-((vx + 18) ** 2 + (vz - 12) ** 2) / 280) * 52;
    const p3 = Math.exp(-((vx - 22) ** 2 + (vz - 25) ** 2) / 320) * 44;
    const fluting = Math.sin(Math.atan2(vz, vx) * 12) * Math.exp(-dist / 35) * 12;
    y += p1 + p2 + p3 + fluting;
  }

  // 2. Bowl crater #5 (Petavius C) at (-95, 35), radius ~28
  const c5Dist = Math.hypot(vx - -95, vz - 35);
  if (c5Dist < 35) {
    const norm = c5Dist / 28;
    if (norm < 1.0) {
      y -= (1 - norm * norm) * 28;
    } else if (norm < 1.35) {
      y += Math.sin(((norm - 1.0) / 0.35) * Math.PI) * 4.5;
    }
  }

  // 3. Rimae Petavius - Deep fracture canyon cutting southwest from central peak
  const rilleDistance = Math.abs(vx * 0.95 + vz * 0.72) / Math.sqrt(0.95 * 0.95 + 0.72 * 0.72);
  if (rilleDistance < 14 && vz > -15 && vz < 160 && vx > -160 && vx < 40) {
    const canyonDepth = Math.cos((rilleDistance / 14) * (Math.PI / 2)) * 16.5;
    y -= canyonDepth;
  }

  // 4. Uplifted crater floor & wrinkled ridges
  y += Math.sin(vx * 0.045) * Math.cos(vz * 0.045) * 3.5;
  y += Math.sin(vx * 0.12 + vz * 0.08) * 1.8;

  // 5. Outer crater rim walls (terraced ramparts rising +85m around boundary)
  if (dist > 160) {
    const rimFactor = Math.min(1.0, (dist - 160) / 100);
    const terraces = Math.sin(rimFactor * Math.PI * 6) * 6.5;
    y += Math.pow(rimFactor, 1.6) * 85 + terraces;
  }

  return y;
};

export const LunarSurfaceInspector: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rockMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const highlightRingRef = useRef<THREE.Mesh | null>(null);
  const waypointSystemRef = useRef<WaypointSystem | null>(null);
  const flyControllerRef = useRef<CameraFlyController>(new CameraFlyController());
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 16, 0));

  const {
    selectedTarget,
    activeLander,
    selectedRock,
    setSelectedRock,
    rockFilter,
    setRockFilter,
    surfaceLidarActive,
    setSurfaceLidarActive,
    setViewMode,
    detectedSites,
    setDetectedSites,
    selectedCandidateSite,
    setSelectedCandidateSite,
    isDetectingSites,
    setIsDetectingSites,
    leftDetailPanelOpen,
    setLeftDetailPanelOpen,
    siteSimulationResults,
    isMapRendererPaused,
  } = useStore();

  const [hoveredRock, setHoveredRock] = useState<LunarRock | null>(null);
  const [hoveredSite, setHoveredSite] = useState<CandidateSite | null>(null);
  const [cameraDistanceM, setCameraDistanceM] = useState<number>(240.0);
  const [lidarSweepAngle, setLidarSweepAngle] = useState<number>(0);
  const [isInCloseUpView, setIsInCloseUpView] = useState<boolean>(false);
  const [isTargetLocked, setIsTargetLocked] = useState<boolean>(false);
  // Default to native Three.js 3D Crater mesh for immediate, reliable, offline-ready display
  const [terrainViewMode, setTerrainViewMode] = useState<"sketchfab" | "lidar">("lidar");
  const [isSketchfabLoaded, setIsSketchfabLoaded] = useState<boolean>(false);

  // Listen for Sketchfab embed readiness or fallback timer to dismiss loader
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      try {
        if (
          typeof e.data === "string" &&
          (e.data.includes("viewerready") || e.data.includes("modelLoaded"))
        ) {
          setIsSketchfabLoaded(true);
        }
      } catch {}
    };
    window.addEventListener("message", handleMsg);

    const timer = setTimeout(() => {
      setIsSketchfabLoaded(true);
    }, 4500);

    return () => {
      window.removeEventListener("message", handleMsg);
      clearTimeout(timer);
    };
  }, []);

  // Automated Safe Site Detection using Petavius DEM function
  useEffect(() => {
    setIsDetectingSites(true);
    // Asynchronous calculation so UI does not stutter
    const timer = setTimeout(() => {
      const sites = detectSafeLandingSites(getPetaviusTerrainHeight, selectedTarget, activeLander);
      setDetectedSites(sites);
      setIsDetectingSites(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedTarget, activeLander, setDetectedSites, setIsDetectingSites]);

  const isMapRendererPausedRef = useRef(isMapRendererPaused);
  isMapRendererPausedRef.current = isMapRendererPaused;

  // Procedural deterministic realistic rocks for LiDAR inspection mode
  const rocks: LunarRock[] = useMemo(() => {
    const list: LunarRock[] = [];
    const seed = Math.abs(Math.sin(selectedTarget.lat * 100 + selectedTarget.lng * 50));

    let s = seed + 0.12345;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    // 1. Small pebbles (çakıl taşları): 8 cm to 28 cm (40 items)
    for (let i = 1; i <= 40; i++) {
      const angle = rnd() * Math.PI * 2;
      const radius = 1.2 + rnd() * 18.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const widthCm = Math.round(8 + rnd() * 20);
      const heightCm = Math.round(widthCm * (0.6 + rnd() * 0.4));
      const depthCm = Math.round(widthCm * (0.7 + rnd() * 0.5));
      const widthM = widthCm / 100;
      const heightM = heightCm / 100;
      const depthM = depthCm / 100;
      const volumeM3 = (widthM * heightM * depthM) * 0.65;
      const weightKg = Number((volumeM3 * 2850).toFixed(1));

      const y = getPetaviusTerrainHeight(x, z) + (heightM * 0.45);
      const slopeDeg = Number((2 + rnd() * 7).toFixed(1));
      const clearanceMarginCm = Math.round((activeLander.footprintDiameterM * 10) - heightCm);

      list.push({
        id: `rock-p-${i}`,
        name: `Pebble #${i < 10 ? `0${i}` : i}`,
        x,
        y,
        z,
        widthM,
        heightM,
        depthM,
        weightKg,
        riskLevel: "safe",
        clearanceMarginCm,
        slopeDeg,
        mineralogy: i % 2 === 0 ? "Anorthositic Plagioclase Pebble" : "Titaniferous Ilmenite Ejecta",
        category: "pebble",
      });
    }

    // 2. Medium rocks: 30 cm to 85 cm (22 items)
    for (let i = 1; i <= 22; i++) {
      const angle = rnd() * Math.PI * 2;
      const radius = 2.5 + rnd() * 22.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const widthCm = Math.round(32 + rnd() * 52);
      const heightCm = Math.round(widthCm * (0.65 + rnd() * 0.4));
      const depthCm = Math.round(widthCm * (0.8 + rnd() * 0.3));
      const widthM = widthCm / 100;
      const heightM = heightCm / 100;
      const depthM = depthCm / 100;
      const volumeM3 = (widthM * heightM * depthM) * 0.7;
      const weightKg = Number((volumeM3 * 2900).toFixed(1));
      const y = getPetaviusTerrainHeight(x, z) + (heightM * 0.45);
      const slopeDeg = Number((5 + rnd() * 9).toFixed(1));

      const isHazard = heightCm > 45;
      const clearanceMarginCm = Math.round(50 - heightCm);

      list.push({
        id: `rock-m-${i}`,
        name: `Rock Fragment #${i < 10 ? `0${i}` : i}`,
        x,
        y,
        z,
        widthM,
        heightM,
        depthM,
        weightKg,
        riskLevel: isHazard ? "hazard" : "caution",
        clearanceMarginCm,
        slopeDeg,
        mineralogy: "Impact Breccia & Vitrified Regolith Matrix",
        category: "rock",
      });
    }

    // 3. Large boulders: 1.0 m to 2.8 m (10 items)
    for (let i = 1; i <= 10; i++) {
      const angle = rnd() * Math.PI * 2;
      const radius = 6.0 + rnd() * 24.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const widthM = Number((1.1 + rnd() * 1.7).toFixed(2));
      const heightM = Number((widthM * (0.7 + rnd() * 0.35)).toFixed(2));
      const depthM = Number((widthM * (0.8 + rnd() * 0.3)).toFixed(2));
      const volumeM3 = (widthM * heightM * depthM) * 0.75;
      const weightKg = Number((volumeM3 * 3000).toFixed(0));
      const y = getPetaviusTerrainHeight(x, z) + (heightM * 0.45);
      const slopeDeg = Number((11 + rnd() * 14).toFixed(1));

      list.push({
        id: `rock-b-${i}`,
        name: `Massive Boulder #${i < 10 ? `0${i}` : i}`,
        x,
        y,
        z,
        widthM,
        heightM,
        depthM,
        weightKg,
        riskLevel: "hazard",
        clearanceMarginCm: -Math.round(heightM * 100 - 50),
        slopeDeg,
        mineralogy: "Crater Floor Massive Anorthosite Block",
        category: "boulder",
      });
    }

    return list;
  }, [selectedTarget, activeLander]);

  const visibleRocks = useMemo(() => {
    if (rockFilter === "pebble") return rocks.filter((r) => r.category === "pebble");
    if (rockFilter === "hazard") return rocks.filter((r) => r.riskLevel === "hazard");
    return rocks;
  }, [rocks, rockFilter]);

  // Three.js Surface Scene Setup (for LiDAR / Rock Inspection Mode)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 85, 240);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Stars
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const r = 400;
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = Math.abs(r * Math.cos(phi)) + 10;
      starPos[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xd8d9e0, size: 0.6, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Earth floating near horizon
    const earthGeo = new THREE.SphereGeometry(7.0, 32, 32);
    const earthMat = new THREE.MeshBasicMaterial({ color: 0x4a9eff });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(-180, 45, -350);
    scene.add(earthMesh);

    // Realistic 3D Lunar Petavius Crater PBR Terrain Mesh (Expansive & Seamless)
    const terrainGeo = new THREE.PlaneGeometry(800, 800, 240, 240);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const uvAttr = terrainGeo.attributes.uv;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = getPetaviusTerrainHeight(vx, vz);
      posAttr.setY(i, vy);

      // Planar Metrik UV (20 metrede bir dikişsiz regolit dokusu)
      uvAttr.setXY(i, vx / 20.0, vz / 20.0);

      // Regolit renk tonlaması (Yükseltilmiş kenarlar açık, çanaklar koyu)
      let albedo = 0.58;
      if (vy > 1.5) albedo += Math.min(0.24, (vy - 1.5) * 0.04);
      else if (vy < -2.0) albedo -= Math.min(0.18, (-vy - 2.0) * 0.02);
      albedo = Math.max(0.38, Math.min(0.92, albedo));

      colors[i * 3] = albedo;
      colors[i * 3 + 1] = albedo;
      colors[i * 3 + 2] = albedo * 1.02;
    }
    terrainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
    terrainGeo.computeTangents();

    const textureLoader = new THREE.TextureLoader();
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
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.94,
      metalness: 0.02,
      vertexColors: true,
      flatShading: false,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Ufka Uzanan Kesintisiz Ay Kabuğu Etekliği (Horizon Skirt: r=380m -> 4500m)
    const skirtGeo = new THREE.RingGeometry(380, 4500, 96, 24);
    skirtGeo.rotateX(-Math.PI / 2);
    const sPos = skirtGeo.attributes.position;
    const sUvs = skirtGeo.attributes.uv;
    const sColors = new Float32Array(sPos.count * 3);

    for (let i = 0; i < sPos.count; i++) {
      const sx = sPos.getX(i);
      const sz = sPos.getZ(i);
      const sr = Math.hypot(sx, sz);

      const sphereDrop = -Math.pow(sr - 380, 2) / 35000;
      const hills = Math.sin(sx * 0.004) * Math.cos(sz * 0.004) * 28.0;
      sPos.setY(i, sphereDrop + hills);

      sUvs.setXY(i, sx / 20.0, sz / 20.0);
      sColors[i * 3] = 0.58;
      sColors[i * 3 + 1] = 0.58;
      sColors[i * 3 + 2] = 0.59;
    }
    skirtGeo.setAttribute("color", new THREE.BufferAttribute(sColors, 3));
    skirtGeo.computeVertexNormals();
    skirtGeo.computeTangents();

    const skirtMesh = new THREE.Mesh(skirtGeo, terrainMat);
    skirtMesh.receiveShadow = false;
    scene.add(skirtMesh);

    // Low Polar Grazing Sun Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    sunLight.position.set(-280, 150, 90);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 800;
    sunLight.shadow.camera.left = -250;
    sunLight.shadow.camera.right = 250;
    sunLight.shadow.camera.top = 250;
    sunLight.shadow.camera.bottom = -250;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Lander Footprint Marker
    const footprintGroup = new THREE.Group();
    scene.add(footprintGroup);

    const centerRingGeo = new THREE.RingGeometry(0.15, 0.19, 32);
    centerRingGeo.rotateX(-Math.PI / 2);
    const centerRingMat = new THREE.MeshBasicMaterial({ color: 0xd86c6c, side: THREE.DoubleSide });
    const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.position.y = 0.05;
    footprintGroup.add(centerRing);

    const legRadius = activeLander.footprintDiameterM / 2;
    const padPositions = [
      [legRadius, legRadius],
      [-legRadius, legRadius],
      [legRadius, -legRadius],
      [-legRadius, -legRadius],
    ];

    padPositions.forEach(([px, pz]) => {
      const padGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 24);
      const padMat = new THREE.MeshStandardMaterial({ color: 0xd86c6c, metalness: 0.8, roughness: 0.2 });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.set(px, 0.05, pz);
      footprintGroup.add(padMesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.8, 0),
        new THREE.Vector3(px, 0.05, pz),
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xd86c6c, transparent: true, opacity: 0.7 });
      footprintGroup.add(new THREE.Line(lineGeo, lineMat));
    });

    // Highlight Ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.35, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const highlightRing = new THREE.Mesh(ringGeo, ringMat);
    highlightRing.visible = false;
    scene.add(highlightRing);
    highlightRingRef.current = highlightRing;

    // Spawn 3D Rocks
    const meshesMap = new Map<string, THREE.Mesh>();
    rockMeshesRef.current = meshesMap;

    rocks.forEach((r) => {
      const baseGeo =
        r.category === "pebble"
          ? new THREE.DodecahedronGeometry(r.widthM * 0.5, 1)
          : r.category === "rock"
            ? new THREE.IcosahedronGeometry(r.widthM * 0.5, 1)
            : new THREE.IcosahedronGeometry(r.widthM * 0.5, 2);

      const vPos = baseGeo.attributes.position;
      for (let k = 0; k < vPos.count; k++) {
        const jx = vPos.getX(k) * (0.85 + Math.random() * 0.3);
        const jy = vPos.getY(k) * (0.85 + Math.random() * 0.3);
        const jz = vPos.getZ(k) * (0.85 + Math.random() * 0.3);
        vPos.setXYZ(k, jx, jy, jz);
      }
      baseGeo.computeVertexNormals();

      const rockColor =
        r.category === "pebble"
          ? 0x8a8d96
          : r.riskLevel === "hazard"
            ? 0x5a5c63
            : 0x767982;

      const rockMat = new THREE.MeshStandardMaterial({
        color: rockColor,
        roughness: 0.92,
        metalness: 0.05,
        flatShading: true,
      });

      const rockMesh = new THREE.Mesh(baseGeo, rockMat);
      rockMesh.position.set(r.x, r.y, r.z);
      rockMesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      rockMesh.userData = { rockData: r };

      scene.add(rockMesh);
      meshesMap.set(r.id, rockMesh);
    });

    // Waypoint System
    const waypointSys = new WaypointSystem();
    waypointSystemRef.current = waypointSys;
    scene.add(waypointSys.group);
    if (detectedSites.length > 0) {
      waypointSys.setSites(detectedSites, scene);
    }

    // Orbit Controls
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let spherical = {
      radius: 260.0,
      theta: 0.08,
      phi: Math.PI / 2.38,
      target: new THREE.Vector3(0, 16, 0),
    };

    const updateCameraPos = () => {
      spherical.radius = Math.max(0.4, Math.min(650.0, spherical.radius));
      spherical.phi = Math.max(0.04, Math.min(Math.PI / 2 - 0.01, spherical.phi));

      camera.position.x =
        spherical.target.x +
        spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y =
        spherical.target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z =
        spherical.target.z +
        spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(spherical.target);

      setCameraDistanceM(Number(spherical.radius.toFixed(2)));
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        previousMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      // Check waypoint hover
      const hitSite = waypointSystemRef.current?.raycast(raycaster);
      if (hitSite) {
        setHoveredSite(hitSite);
        waypointSystemRef.current?.setHovered(hitSite.id);
        mount.style.cursor = "pointer";
      } else {
        setHoveredSite(null);
        waypointSystemRef.current?.setHovered(null);
        mount.style.cursor = isDragging ? "grabbing" : "grab";
      }

      const intersects = raycaster.intersectObjects(Array.from(meshesMap.values()));

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const rockData = hitMesh.userData.rockData as LunarRock;
        setHoveredRock(rockData);

        if (highlightRingRef.current) {
          highlightRingRef.current.position.set(rockData.x, rockData.y + 0.02, rockData.z);
          highlightRingRef.current.scale.setScalar(rockData.widthM * 1.4);
          highlightRingRef.current.visible = true;
        }
      } else {
        setHoveredRock(null);
        if (!selectedRock && highlightRingRef.current) {
          highlightRingRef.current.visible = false;
        }
      }

      if (isDragging) {
        const deltaX = e.clientX - previousMouse.x;
        const deltaY = e.clientY - previousMouse.y;
        spherical.theta -= deltaX * 0.005;
        spherical.phi -= deltaY * 0.005;
        updateCameraPos();
        previousMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.05;
      updateCameraPos();
    };

    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      // Check waypoint click -> trigger cinematic fly-to
      const hitSite = waypointSystemRef.current?.raycast(raycaster);
      if (hitSite) {
        setSelectedCandidateSite(hitSite);
        waypointSystemRef.current?.setSelected(hitSite.id);
        setIsTargetLocked(true);

        const destTarget = new THREE.Vector3(
          hitSite.worldPos.x,
          hitSite.worldPos.y,
          hitSite.worldPos.z
        );

        flyControllerRef.current.flyTo(
          camera.position,
          cameraTargetRef.current,
          destTarget,
          2.8,
          () => {
            setIsInCloseUpView(true);
            setLeftDetailPanelOpen(true);
            setIsTargetLocked(false);
          }
        );
        return;
      }

      const intersects = raycaster.intersectObjects(Array.from(meshesMap.values()));

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const r = hitMesh.userData.rockData as LunarRock;
        setSelectedRock(r);

        spherical.target.set(r.x, r.y, r.z);
        spherical.radius = Math.max(0.6, r.widthM * 2.8);
        updateCameraPos();

        if (highlightRingRef.current) {
          highlightRingRef.current.position.set(r.x, r.y + 0.02, r.z);
          highlightRingRef.current.scale.setScalar(r.widthM * 1.5);
          highlightRingRef.current.visible = true;
        }
      }
    };

    const onDblClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      const hitSite = waypointSystemRef.current?.raycast(raycaster);
      if (hitSite) {
        setSelectedCandidateSite(hitSite);
        window.dispatchEvent(
          new CustomEvent("lunar-simulate-landing-request", {
            detail: hitSite,
          })
        );
      }
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("click", onClick);
    mount.addEventListener("dblclick", onDblClick);

    const onResize = () => {
      if (!mount || !renderer || !camera) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let animId: number;
    let sweep = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      if (isMapRendererPausedRef.current) {
        // Throttle/pause map render loop when simulation runs to save GPU
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      sweep += 0.025;
      setLidarSweepAngle(sweep % (Math.PI * 2));

      // 1. Update camera fly-to if active
      if (flyControllerRef.current.active) {
        flyControllerRef.current.update(dt, camera, cameraTargetRef.current);
        setCameraDistanceM(Number(camera.position.distanceTo(cameraTargetRef.current).toFixed(1)));
      }

      // 2. Update waypoints (perspective scaling & pulse)
      waypointSys.update(dt, camera.position);

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("click", onClick);
      mount.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [rocks, activeLander]);

  useEffect(() => {
    if (sceneRef.current && waypointSystemRef.current && detectedSites.length > 0) {
      waypointSystemRef.current.setSites(detectedSites, sceneRef.current);
    }
  }, [detectedSites]);

  // Synchronize Simulation Result Badges on Waypoints
  useEffect(() => {
    if (waypointSystemRef.current && Object.keys(siteSimulationResults).length > 0) {
      waypointSystemRef.current.setResults(siteSimulationResults);
    }
  }, [siteSimulationResults]);

  useEffect(() => {
    rockMeshesRef.current.forEach((mesh, id) => {
      const isVis = visibleRocks.some((r) => r.id === id);
      mesh.visible = isVis;
    });
  }, [visibleRocks]);

  const handleReturnToOverview = () => {
    if (cameraRef.current && cameraTargetRef.current) {
      flyControllerRef.current.flyBackToOverview(
        cameraRef.current.position,
        cameraTargetRef.current,
        2.5,
        () => {
          setIsInCloseUpView(false);
          setLeftDetailPanelOpen(false);
          setSelectedCandidateSite(null);
          waypointSystemRef.current?.setSelected(null);
        }
      );
    }
  };

  return (
    <div className="relative w-full h-full select-none bg-[#000000] overflow-hidden">
      {/* Target Lock Reticle HUD Animation */}
      {isTargetLocked && (
        <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className="w-40 h-40 border border-[#38bdf8]/60 rounded-full animate-ping opacity-60" />
            <div className="w-28 h-28 border-2 border-dashed border-[#1A73E8] rounded-full animate-spin" style={{ animationDuration: '6s' }} />
            <div className="absolute flex flex-col items-center gap-1 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#E8EAED] shadow-md">
              <span className="text-[10px] font-mono text-[#1A73E8] font-bold tracking-widest uppercase animate-pulse">
                TARGET ACQUIRED (FLY-TO)
              </span>
              <span className="text-xs font-semibold text-[#202124] font-mono">
                {selectedCandidateSite?.code} · {selectedCandidateSite?.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.65)_100%)]" />

      {/* 1. Authentic 4K Sketchfab Petavius Crater 3D Model Viewer */}
      <iframe
        title="Moon - Petavius crater (4K)"
        className={`absolute inset-0 w-full h-full border-0 bg-black ${terrainViewMode === "sketchfab" ? "z-10 block" : "z-0 hidden"
          }`}
        src="https://sketchfab.com/models/ce9c009b517b421eab8c8429b536382f/embed?autostart=1&preload=1&ui_loading=0&ui_hint=0&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_help=0&ui_settings=0&ui_inspector=0&ui_annotations=0&ui_stop=0&ui_vr=0&dnt=1"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        onLoad={() => {
          setTimeout(() => setIsSketchfabLoaded(true), 2500);
        }}
      />

      {/* 4K Model Loading: Sadece tek bir dönen daire */}
      {terrainViewMode === "sketchfab" && !isSketchfabLoaded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070c] select-none pointer-events-none">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 2. Procedural Three.js Surface Mount (LiDAR Mode) */}
      <div
        ref={mountRef}
        className={`absolute inset-0 cursor-grab active:cursor-grabbing ${terrainViewMode === "lidar" ? "z-10 block" : "z-0 hidden"
          }`}
      />

      {/* Top Banner: Sub-Meter Mode Indicator & Return to Orbit */}
      <div className="fixed top-[116px] left-4 z-30 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setViewMode("3d")}
          className="bg-white/95 backdrop-blur-md hover:bg-[#F8F9FA] text-[#202124] rounded-2xl px-4 h-10 flex items-center gap-2 shadow-sm border border-[#E8EAED] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#1A73E8]" />
          <span>Return to 3D Orbit (Step 1)</span>
        </button>

        {/* Return to Overview Button when in closeup mode */}
        {isInCloseUpView && (
          <button
            onClick={handleReturnToOverview}
            className="bg-white/95 backdrop-blur-md hover:bg-[#F8F9FA] text-[#1A73E8] rounded-2xl px-4 h-10 flex items-center gap-2 shadow-sm border border-[#1A73E8]/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer animate-fade-in"
          >
            <RotateCcw className="w-4 h-4 text-[#1A73E8]" />
            <span>← Return to Overview</span>
          </button>
        )}

        <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 h-10 flex items-center gap-2.5 shadow-sm border border-[#E8EAED] text-xs font-sans text-[#202124]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#137333] animate-pulse" />
          <span className="font-semibold text-[#202124]">Petavius Crater 4K Surface Mesh</span>
          <span className="text-[#5F6368] border-l border-[#E8EAED] pl-2.5 text-xs font-medium">
            {terrainViewMode === "sketchfab" ? "Sketchfab 4K Reference Model" : "LiDAR Hazard Grid"}
          </span>
        </div>
      </div>

      {/* Hovered Waypoint Tooltip */}
      {hoveredSite && !selectedCandidateSite && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-[#E8EAED] px-4 py-2.5 text-xs font-sans pointer-events-none flex items-center gap-3 animate-fade-in">
          <span className="px-2.5 py-1 rounded-xl bg-[#F8F9FA] text-[#202124] font-mono font-bold text-xs border border-[#E8EAED]">
            {hoveredSite.code}
          </span>
          <div>
            <span className="font-bold text-[#202124] text-xs block">{hoveredSite.name}</span>
            <span className="text-xs text-[#5F6368]">
              Score: <strong className="text-[#137333] font-mono">{hoveredSite.overallScore.toFixed(1)}/10</strong> • Slope: {hoveredSite.measuredSlopeDeg}°
            </span>
          </div>
          <span className="text-xs text-[#1A73E8] font-semibold bg-[#E8F0FE] px-3 py-1.5 rounded-xl border border-[#D2E3FC]">
            Click to Inspect →
          </span>
        </div>
      )}

      {/* Top Right: Mode Switcher + Rock Filter Pills & LiDAR Scan Toggle */}
      <div className="fixed top-[68px] right-4 z-30 flex items-center gap-2 pointer-events-auto">
        {/* Model Mode Switcher */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-[#E8EAED] p-1 flex items-center gap-1 text-xs">
          <button
            onClick={() => setTerrainViewMode("sketchfab")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${terrainViewMode === "sketchfab"
              ? "bg-[#1A73E8] text-white shadow-sm"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4K Petavius (Sketchfab)</span>
          </button>
          <button
            onClick={() => setTerrainViewMode("lidar")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${terrainViewMode === "lidar"
              ? "bg-[#1A73E8] text-white shadow-sm"
              : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
              }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>LiDAR & Boulder Analysis</span>
          </button>
        </div>

        {/* When in LiDAR mode: Show rock filter pills */}
        {terrainViewMode === "lidar" && (
          <div className="bg-white/95 backdrop-blur-md rounded-full shadow-md border border-[#E8EAED] p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => setRockFilter("all")}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${rockFilter === "all"
                ? "bg-[#1A73E8] text-white font-medium"
                : "text-[#5F6368] hover:text-[#202124]"
                }`}
            >
              All Boulders ({rocks.length})
            </button>
            <button
              onClick={() => setRockFilter("pebble")}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${rockFilter === "pebble"
                ? "bg-[#1A73E8] text-white font-medium"
                : "text-[#5F6368] hover:text-[#202124]"
                }`}
            >
              Pebbles (&lt;30cm)
            </button>
            <button
              onClick={() => setRockFilter("hazard")}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${rockFilter === "hazard"
                ? "bg-[#D93025] text-white font-medium"
                : "text-[#5F6368] hover:text-[#202124]"
                }`}
            >
              Hazardous Blocks (&gt;45cm)
            </button>
          </div>
        )}

        {/* LiDAR Toggle */}
        <button
          onClick={() => {
            if (terrainViewMode !== "lidar") setTerrainViewMode("lidar");
            setSurfaceLidarActive(!surfaceLidarActive);
          }}
          className={`rounded-full px-3.5 h-10 flex items-center gap-1.5 shadow-md border text-xs font-medium transition-colors cursor-pointer ${surfaceLidarActive && terrainViewMode === "lidar"
            ? "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]"
            : "bg-white/95 text-[#5F6368] border-[#E8EAED] hover:bg-[#F8F9FA]"
            }`}
          title="Autonomous LiDAR Hazard Detection (HDA)"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>LiDAR HDA</span>
        </button>
      </div>

      {/* Floating HUD: Selected Rock Telemetry Card (LiDAR Mode) */}
      {selectedRock && terrainViewMode === "lidar" && (
        <div className="fixed bottom-6 left-6 z-40 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#E8EAED] p-4 text-xs font-sans animate-fade-in pointer-events-auto">
          <div className="flex items-start justify-between pb-2 mb-3 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${selectedRock.riskLevel === "safe"
                  ? "bg-[#137333]"
                  : selectedRock.riskLevel === "caution"
                    ? "bg-[#B06000]"
                    : "bg-[#D93025]"
                  }`}
              />
              <div>
                <h4 className="font-bold text-sm text-[#0F172A]">{selectedRock.name}</h4>
                <span className="text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                  {selectedRock.category === "pebble"
                    ? "Regolith Pebble"
                    : selectedRock.category === "rock"
                      ? "Medium Lunar Rock"
                      : "Massive Impact Boulder"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedRock(null)}
              className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] mb-3">
            <div>
              <div className="text-xs text-[#64748B] font-medium">Diameter / Width</div>
              <div className="font-mono text-sm font-bold text-[#0F172A]">
                {Math.round(selectedRock.widthM * 100)} cm
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748B] font-medium">Height</div>
              <div className="font-mono text-sm font-bold text-[#0F172A]">
                {Math.round(selectedRock.heightM * 100)} cm
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748B] font-medium">Mass (Weight)</div>
              <div className="font-mono text-sm font-bold text-[#0F172A]">
                {selectedRock.weightKg} kg{" "}
                <span className="text-xs text-[#64748B] font-normal">
                  ({(selectedRock.weightKg * 0.166).toFixed(1)} kg-f)
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B] font-medium">Engine / Chassis Clearance:</span>
              <span
                className={`font-bold ${selectedRock.riskLevel === "safe"
                  ? "text-[#15803d]"
                  : selectedRock.riskLevel === "caution"
                    ? "text-[#B45309]"
                    : "text-[#B91C1C]"
                  }`}
              >
                {selectedRock.riskLevel === "safe"
                  ? "✓ SAFE (Passes Beneath Chassis)"
                  : selectedRock.riskLevel === "caution"
                    ? "⚠ CAUTION (Near Landing Pad)"
                    : "⛔ CRITICAL HAZARD (Tip-over Risk)"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64748B] font-medium">Distance to Lander Center:</span>
              <span className="font-mono font-bold text-[#0F172A]">
                {Math.sqrt(selectedRock.x ** 2 + selectedRock.z ** 2).toFixed(2)} meters
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64748B] font-medium">Local Slope:</span>
              <span className="font-mono font-bold text-[#0F172A]">{selectedRock.slopeDeg}°</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64748B] font-medium">Mineralogy:</span>
              <span className="text-[#0F172A] font-semibold truncate max-w-[180px]" title={selectedRock.mineralogy}>
                {selectedRock.mineralogy}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredRock && !selectedRock && terrainViewMode === "lidar" && (
        <div className="fixed bottom-6 left-6 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-[#E2E8F0] px-3.5 py-2.5 text-xs font-sans pointer-events-none flex items-center gap-2 text-[#0F172A]">
          <Crosshair className="w-3.5 h-3.5 text-[#C2410C]" />
          <span className="font-bold text-[#0F172A]">{hoveredRock.name}</span>
          <span className="text-[#64748B]">• {Math.round(hoveredRock.widthM * 100)} cm</span>
          <span className="text-xs text-[#C2410C] font-bold">Click to Inspect</span>
        </div>
      )}

      {/* Altitude & Distance Gauge (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-3xl shadow-md border border-[#E2E8F0] p-3.5 text-xs font-sans flex items-center gap-4 pointer-events-auto text-[#0F172A]">
        <div>
          <div className="text-xs text-[#64748B] font-medium">Model / Terrain</div>
          <div className="font-mono text-sm font-bold text-[#0F172A]">
            {terrainViewMode === "sketchfab" ? "Petavius (4K DEM)" : "LiDAR Grid"}
          </div>
        </div>
        <div className="h-6 w-px bg-[#E2E8F0]" />
        <div>
          <div className="text-xs text-[#64748B] font-medium">Crater Diameter</div>
          <div className="font-bold text-xs text-[#0F172A]">177 km (Impact)</div>
        </div>
        <div className="h-6 w-px bg-[#E2E8F0]" />
        <div>
          <div className="text-xs text-[#64748B] font-medium">Central Peak</div>
          <div className="font-mono text-xs font-bold text-[#0F172A]">3,400 m</div>
        </div>
      </div>
    </div>
  );
};

export default LunarSurfaceInspector;

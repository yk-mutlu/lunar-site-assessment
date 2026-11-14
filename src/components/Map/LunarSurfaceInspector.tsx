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
  // Default to the authentic 4K Sketchfab Petavius Crater 3D model requested by the user
  const [terrainViewMode, setTerrainViewMode] = useState<"sketchfab" | "lidar">("sketchfab");

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
        name: `Çakıl Taşı #${i < 10 ? `0${i}` : i}`,
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
        mineralogy: i % 2 === 0 ? "Anortozitik Plajiyoklaz Çakılı" : "Titanyumlu İlmenit Ejektası",
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
        name: `Kaya Parçası #${i < 10 ? `0${i}` : i}`,
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
        mineralogy: "Darbe Breşi & Vitrifize Regolit Çimentosu",
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
        name: `Masif Kaya Blok #${i < 10 ? `0${i}` : i}`,
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
        mineralogy: "Kratersel Krater Tabanı Masif Anortozit Bloğu",
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

    // Realistic 3D Lunar Petavius Crater 4K Terrain Mesh
    const terrainGeo = new THREE.PlaneGeometry(600, 600, 240, 240);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, getPetaviusTerrainHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();
    terrainGeo.setAttribute("uv2", terrainGeo.attributes.uv);

    const textureLoader = new THREE.TextureLoader();
    const albedoTex = textureLoader.load("/textures/petavius/petavius_albedo_4k.jpg");
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = THREE.RepeatWrapping;
    albedoTex.wrapT = THREE.RepeatWrapping;

    const normalTex = textureLoader.load("/textures/petavius/petavius_normal_4k.jpg");
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;

    const aoTex = textureLoader.load("/textures/petavius/petavius_ao_4k.jpg");
    aoTex.wrapS = THREE.RepeatWrapping;
    aoTex.wrapT = THREE.RepeatWrapping;

    const roughnessTex = textureLoader.load("/textures/petavius/petavius_roughness_4k.jpg");
    roughnessTex.wrapS = THREE.RepeatWrapping;
    roughnessTex.wrapT = THREE.RepeatWrapping;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(2.5, 2.5),
      aoMap: aoTex,
      aoMapIntensity: 1.2,
      roughnessMap: roughnessTex,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: false,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

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
            <div className="w-28 h-28 border-2 border-dashed border-[#d86c6c] rounded-full animate-spin" style={{ animationDuration: '6s' }} />
            <div className="absolute flex flex-col items-center gap-1 bg-[#181a20]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#38bdf8]/50">
              <span className="text-[10px] font-mono text-[#38bdf8] font-bold tracking-widest uppercase animate-pulse">
                HEDEF KİLİTLENDİ (FLY-TO)
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {selectedCandidateSite?.code} · {selectedCandidateSite?.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.65)_100%)]" />

      {/* 1. Authentic 4K Sketchfab Petavius Crater 3D Model Viewer (Exact model requested by user) */}
      <iframe
        title="Moon - Petavius crater (4K)"
        className={`absolute inset-0 w-full h-full border-0 bg-black ${
          terrainViewMode === "sketchfab" ? "z-10 block" : "z-0 hidden"
        }`}
        src="https://sketchfab.com/models/ce9c009b517b421eab8c8429b536382f/embed?autostart=1&preload=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_help=0&ui_settings=1&ui_inspector=0&ui_annotations=1&ui_stop=0&ui_vr=0&dnt=1"
        allow="autoplay; fullscreen; xr-spatial-tracking"
      />

      {/* 2. Procedural Three.js Surface Mount (LiDAR Mode) */}
      <div
        ref={mountRef}
        className={`absolute inset-0 cursor-grab active:cursor-grabbing ${
          terrainViewMode === "lidar" ? "z-10 block" : "z-0 hidden"
        }`}
      />

      {/* Top Banner: Sub-Meter Mode Indicator & Return to Orbit */}
      <div className="fixed top-20 left-4 z-30 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setViewMode("3d")}
          className="bg-[#181a20]/95 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] rounded-full px-4 h-10 flex items-center gap-2 shadow-tesla border border-[#282a33] text-xs font-medium transition-transform active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#d86c6c]" />
          <span>Yörüngeye Dön (3D Orbit)</span>
        </button>

        {/* Return to Overview Button when in closeup mode */}
        {isInCloseUpView && (
          <button
            onClick={handleReturnToOverview}
            className="bg-[#181a20]/95 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] rounded-full px-4 h-10 flex items-center gap-2 shadow-tesla border border-[#d86c6c]/60 text-xs font-bold transition-transform active:scale-95 cursor-pointer animate-fade-in"
          >
            <RotateCcw className="w-4 h-4 text-[#d86c6c]" />
            <span className="text-[#d86c6c]">← Haritaya Dön</span>
          </button>
        )}

        <div className="bg-[#181a20]/95 backdrop-blur-md rounded-full px-4 h-10 flex items-center gap-2 shadow-tesla border border-[#282a33] text-xs font-sans text-[#f4f4f6]">
          <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
          <span className="font-semibold text-[#f4f4f6]">Petavius Krateri 4K Yüzey Arazi Modeli</span>
          <span className="text-[#9496a1] border-l border-[#282a33] pl-2 text-[11px]">
            {terrainViewMode === "sketchfab" ? "Sketchfab 4K Orijinal ZBrush" : "LiDAR Simülasyon Ağı"}
          </span>
        </div>
      </div>

      {/* Hovered Waypoint Tooltip */}
      {hoveredSite && !selectedCandidateSite && (
        <div className="fixed top-36 left-1/2 -translate-x-1/2 z-30 bg-[#181a20]/95 backdrop-blur-md rounded-2xl shadow-tesla border border-[#282a33] px-4 py-2.5 text-xs font-sans pointer-events-none flex items-center gap-3 animate-fade-in">
          <span className="px-2 py-0.5 rounded-full bg-[#d86c6c]/20 text-[#d86c6c] font-mono font-bold text-[11px]">
            {hoveredSite.code}
          </span>
          <div>
            <span className="font-bold text-white block">{hoveredSite.name}</span>
            <span className="text-[11px] text-[#9496a1]">
              Puan: <strong className="text-[#34c759] font-mono">{hoveredSite.overallScore.toFixed(1)}/10</strong> • Eğim: {hoveredSite.measuredSlopeDeg}°
            </span>
          </div>
          <span className="text-[10px] text-[#38bdf8] font-medium bg-[#12141a] px-2 py-1 rounded-lg border border-[#22242c]">
            Tıklayarak Yaklaş →
          </span>
        </div>
      )}

      {/* Top Right: Mode Switcher + Rock Filter Pills & LiDAR Scan Toggle */}
      <div className="fixed top-20 right-4 z-30 flex items-center gap-2 pointer-events-auto">
        {/* Model Mode Switcher */}
        <div className="bg-[#181a20]/95 backdrop-blur-md rounded-full shadow-tesla border border-[#282a33] p-1 flex items-center gap-1 text-xs">
          <button
            onClick={() => setTerrainViewMode("sketchfab")}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
              terrainViewMode === "sketchfab"
                ? "bg-[#d86c6c] text-white shadow-sm"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4K Petavius (Sketchfab)</span>
          </button>
          <button
            onClick={() => setTerrainViewMode("lidar")}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
              terrainViewMode === "lidar"
                ? "bg-[#d86c6c] text-white shadow-sm"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>LiDAR & Çakıl İnceleme</span>
          </button>
        </div>

        {/* When in LiDAR mode: Show rock filter pills */}
        {terrainViewMode === "lidar" && (
          <div className="bg-[#181a20]/90 backdrop-blur-md rounded-full shadow-tesla border border-[#282a33] p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => setRockFilter("all")}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                rockFilter === "all"
                  ? "bg-[#d86c6c] text-white font-semibold"
                  : "text-[#9496a1] hover:text-[#f4f4f6]"
              }`}
            >
              Tüm Kayalar ({rocks.length})
            </button>
            <button
              onClick={() => setRockFilter("pebble")}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                rockFilter === "pebble"
                  ? "bg-[#d86c6c] text-white font-semibold"
                  : "text-[#9496a1] hover:text-[#f4f4f6]"
              }`}
            >
              Çakıl Taşları (&lt;30cm)
            </button>
            <button
              onClick={() => setRockFilter("hazard")}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                rockFilter === "hazard"
                  ? "bg-[#d86c6c] text-white font-semibold"
                  : "text-[#9496a1] hover:text-[#f4f4f6]"
              }`}
            >
              Tehlikeli Bloklar (&gt;45cm)
            </button>
          </div>
        )}

        {/* LiDAR Toggle */}
        <button
          onClick={() => {
            if (terrainViewMode !== "lidar") setTerrainViewMode("lidar");
            setSurfaceLidarActive(!surfaceLidarActive);
          }}
          className={`rounded-full px-3.5 h-10 flex items-center gap-1.5 shadow-tesla border text-xs font-medium transition-colors cursor-pointer ${
            surfaceLidarActive && terrainViewMode === "lidar"
              ? "bg-[#34c759]/20 text-[#34c759] border-[#34c759]/40"
              : "bg-[#181a20]/90 text-[#9496a1] border-[#282a33]"
          }`}
          title="LiDAR Otonom Tehlike Taraması"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>LiDAR HDA</span>
        </button>
      </div>

      {/* Floating HUD: Selected Rock Telemetry Card (LiDAR Mode) */}
      {selectedRock && terrainViewMode === "lidar" && (
        <div className="fixed bottom-6 left-6 z-40 max-w-sm w-full bg-[#181a20]/95 backdrop-blur-md rounded-2xl shadow-tesla border border-[#282a33] p-4 text-xs font-sans animate-fade-in pointer-events-auto">
          <div className="flex items-start justify-between pb-2 mb-3 border-b border-[#282a33]">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  selectedRock.riskLevel === "safe"
                    ? "bg-[#34c759]"
                    : selectedRock.riskLevel === "caution"
                    ? "bg-[#ff9f0a]"
                    : "bg-[#d86c6c]"
                }`}
              />
              <div>
                <h4 className="font-semibold text-sm text-[#f4f4f6]">{selectedRock.name}</h4>
                <span className="text-[10px] text-[#9496a1] uppercase tracking-wider">
                  {selectedRock.category === "pebble"
                    ? "Regolit Çakıl Taşı"
                    : selectedRock.category === "rock"
                    ? "Orta Boy Ay Kayası"
                    : "Masif Çarpma Bloğu"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedRock(null)}
              className="p-1 rounded-full text-[#9496a1] hover:text-[#f4f4f6] hover:bg-[#22242c] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#12141a] border border-[#22242c] mb-3">
            <div>
              <div className="text-[10px] text-[#9496a1]">Çap / Genişlik</div>
              <div className="font-mono text-sm font-bold text-[#f4f4f6]">
                {Math.round(selectedRock.widthM * 100)} cm
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#9496a1]">Yükseklik</div>
              <div className="font-mono text-sm font-bold text-[#f4f4f6]">
                {Math.round(selectedRock.heightM * 100)} cm
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#9496a1]">Kütle (Ay Ağırlığı)</div>
              <div className="font-mono text-sm font-bold text-[#f4f4f6]">
                {selectedRock.weightKg} kg{" "}
                <span className="text-[10px] text-[#9496a1]">
                  ({(selectedRock.weightKg * 0.166).toFixed(1)} kg-f)
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[#9496a1]">İniş Motor / Gövde Açıklığı:</span>
              <span
                className={`font-semibold ${
                  selectedRock.riskLevel === "safe"
                    ? "text-[#34c759]"
                    : selectedRock.riskLevel === "caution"
                    ? "text-[#ff9f0a]"
                    : "text-[#d86c6c]"
                }`}
              >
                {selectedRock.riskLevel === "safe"
                  ? "✓ GÜVENLİ (Gövde Altında Kalır)"
                  : selectedRock.riskLevel === "caution"
                  ? "⚠ DİKKAT (Ayak Tabanına Yakın)"
                  : "⛔ KRİTİK TEHLİKE (Devrilme Riski)"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#9496a1]">Lander Merkezine Mesafe:</span>
              <span className="font-mono text-[#f4f4f6]">
                {Math.sqrt(selectedRock.x ** 2 + selectedRock.z ** 2).toFixed(2)} metre
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#9496a1]">Zemin Eğimi (Local Slope):</span>
              <span className="font-mono text-[#f4f4f6]">{selectedRock.slopeDeg}°</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#9496a1]">Mineraloji:</span>
              <span className="text-[#f4f4f6] text-[11px] truncate max-w-[170px]" title={selectedRock.mineralogy}>
                {selectedRock.mineralogy}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredRock && !selectedRock && terrainViewMode === "lidar" && (
        <div className="fixed bottom-6 left-6 z-30 bg-[#181a20]/90 backdrop-blur-md rounded-xl shadow-tesla border border-[#282a33] px-3 py-2 text-xs font-sans pointer-events-none flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-[#d86c6c]" />
          <span className="font-semibold text-[#f4f4f6]">{hoveredRock.name}</span>
          <span className="text-[#9496a1]">• {Math.round(hoveredRock.widthM * 100)} cm</span>
          <span className="text-[11px] text-[#ff9f0a]">Tıklayarak İncele</span>
        </div>
      )}

      {/* Altitude & Distance Gauge (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-30 bg-[#181a20]/90 backdrop-blur-md rounded-2xl shadow-tesla border border-[#282a33] p-3 text-xs font-sans flex items-center gap-4 pointer-events-auto">
        <div>
          <div className="text-[10px] text-[#9496a1]">Model / Arazi</div>
          <div className="font-mono text-sm font-bold text-[#f4f4f6]">
            {terrainViewMode === "sketchfab" ? "Petavius (4K DEM)" : "LiDAR Grid"}
          </div>
        </div>
        <div className="h-6 w-px bg-[#282a33]" />
        <div>
          <div className="text-[10px] text-[#9496a1]">Krater Çapı</div>
          <div className="font-semibold text-xs text-[#d86c6c]">177 km (Darbe)</div>
        </div>
        <div className="h-6 w-px bg-[#282a33]" />
        <div>
          <div className="text-[10px] text-[#9496a1]">Merkezi Tepe</div>
          <div className="font-mono text-xs text-[#f4f4f6]">3,400 m</div>
        </div>
      </div>
    </div>
  );
};

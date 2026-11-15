// ═══════════════════════════════════════════════════════════════════════
// ThreeOrbitMissionPreview.tsx
// Interactive 3D Earth-Moon Translunar Orbit Mission Preview
// Dynamic Launch Date (Today Toggle), Unlimited Lunar Site Selection & HUD
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useStore } from "@/store";
import {
  Rocket,
  Globe,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ChevronDown,
  Navigation,
  Crosshair,
  RefreshCw,
  Eye,
  Map as MapIcon,
} from "lucide-react";
import {
  PRESET_SAFE_LUNAR_SITES,
  SafeLunarSiteOption,
} from "@/data/lunar-safe-sites";
import { TwoDimLunarMapPickerModal } from "./TwoDimLunarMapPickerModal";

export type { SafeLunarSiteOption };

interface ThreeOrbitMissionPreviewProps {
  onStartDescentSimulation: () => void;
}

export const ThreeOrbitMissionPreview: React.FC<ThreeOrbitMissionPreviewProps> = ({
  onStartDescentSimulation,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const moonTargetGroupRef = useRef<THREE.Group | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const trajectoryArrowRef = useRef<THREE.Group | null>(null);
  const safePinsGroupRef = useRef<THREE.Group | null>(null);

  const {
    selectedLaunchSite,
    setViewMode,
    isMapRendererPaused,
    setSimulationSiteData,
    selectedSafeLunarSite,
    setSelectedSafeLunarSite,
    launchTimeMode,
    setLaunchTimeMode,
  } = useStore();

  // ── 1. Dynamic Date State (Today vs Optimal TLI) ─────────────────
  const isTodayLaunch = launchTimeMode === "today";
  const setIsTodayLaunch = (isToday: boolean) => setLaunchTimeMode(isToday ? "today" : "optimal");
  const [todayDateFormatted, setTodayDateFormatted] = useState("");

  // ── 2. Active Lunar Landing Target (Unlimited Choice) ────────────
  const [activeLunarTarget, setActiveLunarTarget] = useState<SafeLunarSiteOption>(
    selectedSafeLunarSite || PRESET_SAFE_LUNAR_SITES[0]
  );
  const activeLunarTargetRef = useRef<SafeLunarSiteOption>(selectedSafeLunarSite || PRESET_SAFE_LUNAR_SITES[0]);

  // Keep synced with store
  useEffect(() => {
    if (selectedSafeLunarSite) {
      handleSelectLunarSite(selectedSafeLunarSite);
    }
  }, [selectedSafeLunarSite]);

  // ── 3. 2D Lunar Map Picker Modal State ───────────────────────────
  const [is2DMapPickerOpen, setIs2DMapPickerOpen] = useState(false);

  // Format today's date on client mount
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + `, ${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")} UTC`;
    setTodayDateFormatted(formatted);
  }, []);

  // Convert lat/lng to 3D Cartesian coordinates on sphere of radius R
  const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  const handleSelectLunarSite = (site: SafeLunarSiteOption) => {
    setActiveLunarTarget(site);
    activeLunarTargetRef.current = site;

    // Reposition green landing beacon on the Moon
    if (moonTargetGroupRef.current) {
      const targetLocalPos = latLngToVector3(site.lat, site.lng, 0.275);
      moonTargetGroupRef.current.position.copy(targetLocalPos);
      moonTargetGroupRef.current.lookAt(targetLocalPos.clone().multiplyScalar(2));
      moonTargetGroupRef.current.visible = true;
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x020306);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 5.2, 11.5);
    camera.lookAt(2.0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const textureLoader = new THREE.TextureLoader();

    // 2. Starfield (Deep Space)
    const starCount = 2200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xd8d8e8,
      size: 0.9,
      transparent: true,
      opacity: 0.8,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // 3. Earth Globe Mesh
    const earthGeo = new THREE.SphereGeometry(1.0, 96, 96);
    const earthColorTex = textureLoader.load("/textures/earth_surface.jpg");
    earthColorTex.colorSpace = THREE.SRGBColorSpace;
    const earthNormalTex = textureLoader.load("/textures/earth_normal.jpg");
    const earthSpecularTex = textureLoader.load("/textures/earth_specular.jpg");

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthColorTex,
      normalMap: earthNormalTex,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: earthSpecularTex,
      roughness: 0.65,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.castShadow = true;
    earthMesh.receiveShadow = true;
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Earth Cloud Layer
    const cloudsGeo = new THREE.SphereGeometry(1.014, 64, 64);
    const cloudsTex = textureLoader.load("/textures/earth_clouds.png");
    cloudsTex.colorSpace = THREE.SRGBColorSpace;
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.82,
      roughness: 0.9,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Atmospheric Rayleigh Scattering Glow
    const atmosphereGeo = new THREE.SphereGeometry(1.036, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.24, 0.72, 0.98, 1.0) * intensity * 1.8;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    scene.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));

    // 4. Earth Launch Site Red Pulsing Marker
    const earthSitePos = latLngToVector3(selectedLaunchSite.lat, selectedLaunchSite.lng, 1.005);
    const earthSiteGroup = new THREE.Group();
    earthSiteGroup.position.copy(earthSitePos);
    earthSiteGroup.lookAt(earthSitePos.clone().multiplyScalar(2));
    scene.add(earthSiteGroup);

    // Red core dot
    const redDotGeo = new THREE.SphereGeometry(0.022, 16, 16);
    const redDotMat = new THREE.MeshBasicMaterial({ color: 0xff1e38 });
    const redDot = new THREE.Mesh(redDotGeo, redDotMat);
    earthSiteGroup.add(redDot);

    // Red beacon vertical laser
    const redLaserGeo = new THREE.CylinderGeometry(0.003, 0.006, 0.35, 16);
    const redLaserMat = new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const redLaser = new THREE.Mesh(redLaserGeo, redLaserMat);
    redLaser.position.set(0, 0, 0.175);
    redLaser.rotation.x = Math.PI / 2;
    earthSiteGroup.add(redLaser);

    // 5. Photorealistic Moon in Orbit (Scale ratio 0.272)
    const moonGeo = new THREE.SphereGeometry(0.272, 64, 64);
    const moonTexture = textureLoader.load("/textures/moon_surface_4k.jpg");
    moonTexture.colorSpace = THREE.SRGBColorSpace;
    const moonElevationTex = textureLoader.load("/textures/layer_elevation.jpg");

    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTexture,
      bumpMap: moonElevationTex,
      bumpScale: 0.035,
      roughness: 0.92,
      metalness: 0.04,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;

    // 5B. Safe Sites Visual Pins on the Moon Surface (Annotated Safe Landing Sites)
    const safePinsGroup = new THREE.Group();
    moonMesh.add(safePinsGroup);
    safePinsGroupRef.current = safePinsGroup;

    PRESET_SAFE_LUNAR_SITES.forEach((site) => {
      const pinPos = latLngToVector3(site.lat, site.lng, 0.275);
      const pinGroup = new THREE.Group();
      pinGroup.position.copy(pinPos);
      pinGroup.lookAt(pinPos.clone().multiplyScalar(2));

      // Small subtle green beacon ring
      const ringGeo = new THREE.RingGeometry(0.010, 0.016, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: site.safetyRank === 1 ? 0x34c759 : 0x22c55e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      pinGroup.add(ringMesh);

      // Dot
      const dotGeo = new THREE.SphereGeometry(0.006, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: site.safetyRank === 1 ? 0x4ade80 : 0x22c55e,
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      pinGroup.add(dotMesh);

      safePinsGroup.add(pinGroup);
    });

    // Active Selected Moon Landing Site Glowing Target Marker
    const moonTargetGroup = new THREE.Group();
    moonMesh.add(moonTargetGroup);
    moonTargetGroupRef.current = moonTargetGroup;

    const targetLocalPos = latLngToVector3(
      activeLunarTargetRef.current.lat,
      activeLunarTargetRef.current.lng,
      0.275
    );
    moonTargetGroup.position.copy(targetLocalPos);
    moonTargetGroup.lookAt(targetLocalPos.clone().multiplyScalar(2));

    // Green/cyan landing beacon dot
    const targetDotGeo = new THREE.SphereGeometry(0.014, 16, 16);
    const targetDotMat = new THREE.MeshBasicMaterial({ color: 0x34c759 });
    const targetDot = new THREE.Mesh(targetDotGeo, targetDotMat);
    moonTargetGroup.add(targetDot);

    // Target reticle ring
    const targetRingGeo = new THREE.RingGeometry(0.018, 0.026, 32);
    const targetRingMat = new THREE.MeshBasicMaterial({
      color: 0x34c759,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
    moonTargetGroup.add(targetRing);

    // 6. Moon Orbit Path Guide Ring (Subtle Ellipse)
    const orbitPathGeo = new THREE.BufferGeometry();
    const orbitPoints: THREE.Vector3[] = [];
    const orbitRadius = 7.8;
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      orbitPoints.push(
        new THREE.Vector3(
          orbitRadius * Math.cos(angle),
          Math.sin(angle) * 0.55,
          orbitRadius * Math.sin(angle)
        )
      );
    }
    orbitPathGeo.setFromPoints(orbitPoints);
    const orbitPathMat = new THREE.LineBasicMaterial({
      color: 0x2e384d,
      transparent: true,
      opacity: 0.45,
    });
    scene.add(new THREE.Line(orbitPathGeo, orbitPathMat));

    // 7. Translunar Transfer Trajectory (Dashed Curve Line)
    const curvePointsCount = 120;
    const trajectoryGeo = new THREE.BufferGeometry();
    const initialPoints: THREE.Vector3[] = new Array(curvePointsCount).fill(new THREE.Vector3(0, 0, 0));
    trajectoryGeo.setFromPoints(initialPoints);

    const trajectoryMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.16,
      gapSize: 0.08,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const trajectoryLine = new THREE.Line(trajectoryGeo, trajectoryMat);
    scene.add(trajectoryLine);
    trajectoryLineRef.current = trajectoryLine;

    // 7B. Predicted TLI Rendezvous / Intercept Target Marker on Moon Orbit
    const rendezvousMarkerGroup = new THREE.Group();
    scene.add(rendezvousMarkerGroup);

    const rdzRingGeo = new THREE.RingGeometry(0.36, 0.42, 32);
    rdzRingGeo.rotateX(-Math.PI / 2);
    const rdzRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const rdzRing = new THREE.Mesh(rdzRingGeo, rdzRingMat);
    rendezvousMarkerGroup.add(rdzRing);

    const tickMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 });
    const tick1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.55, 0, 0), new THREE.Vector3(0.55, 0, 0)]),
      tickMat
    );
    const tick2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.55), new THREE.Vector3(0, 0, 0.55)]),
      tickMat
    );
    rendezvousMarkerGroup.add(tick1);
    rendezvousMarkerGroup.add(tick2);

    // 8. Animated 3D Traversal Spacecraft (Starship HLS Silhouette)
    const arrowGroup = new THREE.Group();
    scene.add(arrowGroup);
    trajectoryArrowRef.current = arrowGroup;

    // Starship Cylindrical Fuselage
    const shipBodyGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.16, 16);
    const shipBodyMat = new THREE.MeshStandardMaterial({ color: 0xebedf2, metalness: 0.88, roughness: 0.2 });
    const shipBody = new THREE.Mesh(shipBodyGeo, shipBodyMat);
    arrowGroup.add(shipBody);

    // Starship Ogive Nose Cone
    const shipNoseGeo = new THREE.ConeGeometry(0.038, 0.09, 16);
    const shipNose = new THREE.Mesh(shipNoseGeo, shipBodyMat);
    shipNose.position.y = 0.125;
    arrowGroup.add(shipNose);

    // Forward Canards (Swept flaps near nose)
    const canardGeo = new THREE.BoxGeometry(0.11, 0.022, 0.008);
    const canardMesh = new THREE.Mesh(canardGeo, shipBodyMat);
    canardMesh.position.set(0, 0.12, 0);
    arrowGroup.add(canardMesh);

    // Aft Delta Body Flaps (at base)
    const aftFlapGeo = new THREE.BoxGeometry(0.14, 0.055, 0.010);
    const aftFlapMesh = new THREE.Mesh(aftFlapGeo, shipBodyMat);
    aftFlapMesh.position.set(0, -0.045, 0);
    arrowGroup.add(aftFlapMesh);

    // Vacuum Blue Thruster Pulse Glow
    const thrusterGeo = new THREE.SphereGeometry(0.028, 12, 12);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const thrusterMesh = new THREE.Mesh(thrusterGeo, thrusterMat);
    thrusterMesh.position.set(0, -0.09, 0);
    arrowGroup.add(thrusterMesh);

    // 9. Directional Sunlight
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ea, 3.2);
    sunLight.position.set(8, 3, 7);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 10. Interactive Camera Controls (Orbit Drag, Zoom & Moon Clicking)
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let mouseDownPos = { x: 0, y: 0 };
    let spherical = { radius: 12.0, theta: 0.45, phi: Math.PI / 2.6 };
    let lookTarget = new THREE.Vector3(2.0, 0, 0);

    const updateCameraPos = () => {
      spherical.radius = Math.max(2.5, Math.min(22.0, spherical.radius));
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));

      camera.position.x = lookTarget.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = lookTarget.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = lookTarget.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(lookTarget);
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      // Dynamic cursor feedback when hovering over Moon
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      if (moonMeshRef.current) {
        const intersects = raycaster.intersectObject(moonMeshRef.current);
        if (intersects.length > 0) {
          mount.style.cursor = "crosshair";
        } else {
          mount.style.cursor = isDragging ? "grabbing" : "grab";
        }
      }

      if (!isDragging) return;
      const deltaX = e.clientX - previousMouse.x;
      const deltaY = e.clientY - previousMouse.y;

      spherical.theta -= deltaX * 0.005;
      spherical.phi -= deltaY * 0.005;

      updateCameraPos();
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.006;
      updateCameraPos();
    };

    // ── CLICK ON MOON: UNLIMITED FREE LUNAR LANDING SITE SELECTION ──
    const onClick = (e: MouseEvent) => {
      const clickDist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (clickDist > 6) return; // Ignore drag/camera orbit

      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      if (moonMeshRef.current) {
        const intersects = raycaster.intersectObject(moonMeshRef.current);
        if (intersects.length > 0) {
          const hit = intersects[0];
          const moonMesh = moonMeshRef.current;
          // Calculate local coordinates on the Moon
          const localHit = hit.point.clone().sub(moonMesh.position).applyQuaternion(moonMesh.quaternion.clone().invert());
          const norm = localHit.normalize();

          const lat = Number((Math.asin(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI)).toFixed(2));
          const theta = Math.atan2(norm.z, -norm.x);
          let lng = theta * (180 / Math.PI) - 180;
          if (lng < -180) lng += 360;
          if (lng > 180) lng -= 360;
          lng = Number(lng.toFixed(2));

          // Check if clicked near an existing preset safe site (< 4.0 deg)
          const matchedPreset = PRESET_SAFE_LUNAR_SITES.find((s) => {
            const dLat = Math.abs(s.lat - lat);
            const dLng = Math.abs(s.lng - lng);
            return Math.hypot(dLat, dLng) < 4.0;
          });

          if (matchedPreset) {
            handleSelectLunarSite(matchedPreset);
          } else {
            const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "K" : "G"}`;
            const lngStr = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? "D" : "B"}`;
            const isPolar = Math.abs(lat) > 75;
            const customSlope = Number((1.8 + Math.random() * 3.2).toFixed(1));
            const safetyPct = Number(Math.max(68, Math.min(94, 95 - customSlope * 2.5)).toFixed(1));

            const customSite: SafeLunarSiteOption = {
              id: `custom_lunar_${lat}_${lng}`,
              name: `Custom Lunar Site (${latStr}, ${lngStr})`,
              shortName: `Custom (${latStr})`,
              code: "CUSTOM",
              lat,
              lng,
              elevationM: 850,
              slopeDeg: customSlope,
              safetyScorePct: safetyPct,
              illuminationPct: isPolar ? 84 : 50,
              safetyRank: 99,
              safetyLabel: "Custom Target",
              category: "Custom",
              boulderRisk: customSlope > 3.5 ? "Moderate" : "Low",
              description: `Landing coordinates freely designated on the 3D lunar surface (${lat.toFixed(2)}°, ${lng.toFixed(2)}°).`,
              isCustom: true,
            };
            handleSelectLunarSite(customSite);
          }
        }
      }
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("click", onClick);

    // 11. Orbital Mechanics Render Loop (True TLI Keplerian Interception)
    let animId: number;

    // Anchor encounter angle in inertial space
    const encounterAngle = 0.92;
    const leadAngle = 0.68; // ~39° orbital motion during 68.4h transit
    const cycleDuration = 9.0; // 9 seconds per simulated Earth-to-Moon transit cycle

    // Fixed Encounter Target Position on Moon's orbit
    const encounterMoonX = orbitRadius * Math.cos(encounterAngle);
    const encounterMoonZ = orbitRadius * Math.sin(encounterAngle);
    const encounterMoonY = Math.sin(encounterAngle) * 0.55;
    const encounterMoonPos = new THREE.Vector3(encounterMoonX, encounterMoonY, encounterMoonZ);

    rendezvousMarkerGroup.position.copy(encounterMoonPos);

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isMapRendererPaused) {
        const time = performance.now() * 0.001;

        // Slow Earth cloud layer rotation
        if (cloudsMeshRef.current) {
          cloudsMeshRef.current.rotation.y += 0.0003;
        }

        // Earth Rotation
        if (earthMeshRef.current) {
          earthMeshRef.current.rotation.y += 0.00015;
        }

        // Normalized flight progress [0 -> 1]
        const flightProgress = (time % cycleDuration) / cycleDuration;

        // Realistic Moon Orbit: When spacecraft launches (progress=0), the Moon is behind by leadAngle (~39 deg).
        // As the spacecraft travels along its transfer trajectory, the Moon advances along its orbit.
        // Exactly at flightProgress = 1.0, the Moon and the spacecraft both arrive at encounterAngle!
        const currentMoonAngle = encounterAngle - (1.0 - flightProgress) * leadAngle;
        const moonX = orbitRadius * Math.cos(currentMoonAngle);
        const moonZ = orbitRadius * Math.sin(currentMoonAngle);
        const moonY = Math.sin(currentMoonAngle) * 0.55;
        moonMesh.position.set(moonX, moonY, moonZ);
        moonMesh.rotation.y = currentMoonAngle + Math.PI; // Tidal lock facing Earth

        // Stable Keplerian Translunar Trajectory leading directly ahead to predicted rendezvous point
        const startPos = latLngToVector3(selectedLaunchSite.lat, selectedLaunchSite.lng, 1.01);
        const currentTarget = activeLunarTargetRef.current;
        const targetLocalPos = latLngToVector3(currentTarget.lat, currentTarget.lng, 0.275);
        const encounterTargetWorld = targetLocalPos.clone().add(encounterMoonPos);

        // Fixed transfer arc in inertial space (spacecraft aims ahead at future Moon rendezvous position)
        const toEncounter = encounterMoonPos.clone().sub(startPos);
        const mid1 = startPos.clone().add(new THREE.Vector3(
          toEncounter.x * 0.32 - toEncounter.z * 0.20,
          1.45,
          toEncounter.z * 0.32 + toEncounter.x * 0.20
        ));
        const mid2 = startPos.clone().lerp(encounterMoonPos, 0.74);
        mid2.y += 0.85;

        const curve = new THREE.CatmullRomCurve3([startPos, mid1, mid2, encounterTargetWorld]);
        const curvePoints = curve.getPoints(curvePointsCount);

        // Update dashed line geometry (stays stable aiming at intercept)
        if (trajectoryLineRef.current) {
          trajectoryLineRef.current.geometry.setFromPoints(curvePoints);
          trajectoryLineRef.current.computeLineDistances();
        }

        // Animate Spacecraft along the ballistic transfer trajectory
        if (trajectoryArrowRef.current) {
          const currentPoint = curve.getPointAt(flightProgress);
          const tangent = curve.getTangentAt(flightProgress).normalize();

          trajectoryArrowRef.current.position.copy(currentPoint);
          trajectoryArrowRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);

          // Pulse thruster
          const pulse = (Math.sin(time * 12) + 1) * 0.5;
          thrusterMesh.scale.set(1.0 + 0.4 * pulse, 1.0 + 0.4 * pulse, 1.0 + 0.4 * pulse);
        }

        // Pulse rendezvous marker
        const rdzPulse = (Math.sin(time * 6) + 1) * 0.5;
        rdzRing.scale.set(1.0 + 0.15 * rdzPulse, 1.0 + 0.15 * rdzPulse, 1.0);
        rdzRing.rotation.z += 0.015;

        // Pulse red launch beacon on Earth
        const redPulse = (Math.sin(time * 7) + 1) * 0.5;
        redDot.scale.set(1.0 + 0.3 * redPulse, 1.0 + 0.3 * redPulse, 1.0 + 0.3 * redPulse);

        // Rotate Moon target reticle
        targetRing.rotation.z += 0.02;

        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("click", onClick);
      window.removeEventListener("resize", handleResize);

      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [selectedLaunchSite, isMapRendererPaused]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#020306] font-sans">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. TOP MISSION CONTROL BANNER: LAUNCH WINDOW & DATE SELECTOR        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-[94%] md:w-auto">
        <div className="bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-3xl p-3 md:px-5 md:py-3 shadow-[0_4px_16px_rgba(15,23,42,0.1)] flex flex-col md:flex-row items-center justify-between gap-3 text-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-[#C2410C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#64748B]">
                  {isTodayLaunch ? "Live Launch Day (Today)" : "Optimal Launch Window"}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" title="Active Time" />
              </div>
              <div className="text-sm md:text-base font-bold text-[#0F172A]">
                {isTodayLaunch ? todayDateFormatted : "Nov 18, 2026, 04:42:00 UTC"}
              </div>
            </div>
          </div>

          <div className="h-7 w-px bg-[#E2E8F0] hidden md:block" />

          {/* Date Mode Toggle: "Set to Today" vs "Optimal TLI" */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTodayLaunch(true)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isTodayLaunch
                ? "bg-[#0F172A] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1]"
                }`}
              title="Set launch time to current time"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Set to Today</span>
            </button>

            <button
              onClick={() => setIsTodayLaunch(false)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${!isTodayLaunch
                ? "bg-[#0F172A] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1]"
                }`}
              title="Return to optimal computed TLI window"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Optimal TLI (Nov 18)</span>
            </button>
          </div>

          <div className="h-7 w-px bg-[#E2E8F0] hidden md:block" />

          {/* Countdown & Flight Details */}
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[#64748B] text-xs font-medium block">Countdown</span>
              <span className={`font-bold text-sm ${isTodayLaunch ? "text-[#15803d]" : "text-[#C2410C]"}`}>
                {isTodayLaunch ? "T-00:14:22" : "T-02d 18:34"}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] text-xs font-medium block">Flight Duration</span>
              <span className="font-bold text-sm text-[#0F172A]">~68.4 Hours</span>
            </div>
          </div>

          <div className="h-7 w-px bg-[#E2E8F0] hidden md:block" />

          {/* Quick Exit to Moon Site (Step 1) */}
          <button
            onClick={() => setViewMode("3d")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[#F8FAFC] text-[#1A73E8] hover:bg-[#E8F0FE] border border-[#CBD5E1]"
            title="Return to Lunar Landing Site Navigator (Step 1)"
          >
            <Globe className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>1. Moon Site</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. LEFT CARD: EARTH LAUNCH COMPLEX (ORIGIN)                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-[120px] left-4 z-20 w-72 md:w-80 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-3xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.1)] space-y-3 text-xs text-[#0F172A]">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]" />
              <span className="font-bold text-[#0F172A]">Earth Launch Complex</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C]">
              Origin
            </span>
          </div>

          <div>
            <div className="text-base font-bold text-[#0F172A]">{selectedLaunchSite.name}</div>
            <div className="text-[#64748B] text-xs mt-0.5 font-medium">{selectedLaunchSite.location}</div>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
              <span className="text-[#64748B] font-medium">Coordinates:</span>
              <span className="font-mono font-bold text-[#0F172A]">
                {selectedLaunchSite.lat >= 0 ? `${selectedLaunchSite.lat.toFixed(2)}°N` : `${Math.abs(selectedLaunchSite.lat).toFixed(2)}°S`},{" "}
                {selectedLaunchSite.lng >= 0 ? `${selectedLaunchSite.lng.toFixed(2)}°E` : `${Math.abs(selectedLaunchSite.lng).toFixed(2)}°W`}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
              <span className="text-[#64748B] font-medium">Launch Vehicle:</span>
              <span className="font-bold text-[#C2410C]">
                {selectedLaunchSite.supportedLaunchVehicles[0] || "Starship HLS"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
              <span className="text-[#64748B] font-medium">Pad Elevation:</span>
              <span className="font-bold text-[#0F172A]">{selectedLaunchSite.elevationM} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. RIGHT CARD: LUNAR TARGET SITE SELECTOR                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-[68px] right-4 z-20 w-80 md:w-88 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-3xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.1)] space-y-3.5 text-xs text-[#0F172A]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
              <span className="font-bold text-[#0F172A]">Lunar Target Site</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${activeLunarTarget.safetyRank === 1
              ? "bg-[#DCFCE7] text-[#15803d]"
              : activeLunarTarget.isCustom
                ? "bg-[#F1F5F9] text-[#0F172A]"
                : "bg-[#FEF3C7] text-[#B45309]"
              }`}>
              {activeLunarTarget.safetyLabel}
            </span>
          </div>

          {/* ── 2D LUNAR MAP BUTTON ── */}
          <button
            onClick={() => setIs2DMapPickerOpen(true)}
            className="w-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] p-3 rounded-2xl font-bold text-xs shadow-xs flex items-center justify-between transition-colors cursor-pointer group"
            title="Open 2D Lunar Map to inspect safe sites and designate landing coordinates"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#C2410C]">
                <MapIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[#0F172A] text-xs font-bold flex items-center gap-1.5">
                  <span>Select Site on 2D Lunar Map</span>
                  <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                </div>
                <div className="text-xs text-[#64748B] font-medium">Candidate sites & custom coordinates</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-[#C2410C]">
              <span>Open</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Interactive 2D Mini-Map Preview */}
          <div
            onClick={() => setIs2DMapPickerOpen(true)}
            className="relative w-full aspect-[2.4/1] rounded-[10px] overflow-hidden border border-[#E8EAED] hover:border-[#1A73E8] transition-colors cursor-pointer group bg-[#1e1e1e]"
            title="Click to Open 2D Lunar Map"
          >
            <img
              src="/textures/moon_surface.jpg"
              alt="2D Lunar Surface"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
            />

            {/* Glowing green dots for safe sites */}
            {PRESET_SAFE_LUNAR_SITES.slice(0, 8).map((site) => {
              const x = ((site.lng + 180) / 360) * 100;
              const y = ((90 - site.lat) / 180) * 100;
              return (
                <div
                  key={site.id}
                  className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full bg-[#34A853] ring-1 ring-white/80 shadow-sm"
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              );
            })}

            {/* Selected site ping beacon on mini-map */}
            <div
              className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-[#EA4335] ring-2 ring-white animate-ping"
              style={{
                left: `${((activeLunarTarget.lng + 180) / 360) * 100}%`,
                top: `${((90 - activeLunarTarget.lat) / 180) * 100}%`,
              }}
            />
            <div
              className="absolute w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full bg-[#EA4335] ring-1 ring-white"
              style={{
                left: `${((activeLunarTarget.lng + 180) / 360) * 100}%`,
                top: `${((90 - activeLunarTarget.lat) / 180) * 100}%`,
              }}
            />

            {/* Bottom info banner over mini-map */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end justify-between p-2">
              <span className="text-xs text-white font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#15803d]" />
                Safe Zones
              </span>
              <span className="text-xs text-[#CBD5E1] font-semibold group-hover:underline">
                Expand ↗
              </span>
            </div>
          </div>

          {/* Preset Safe Sites Dropdown */}
          <div className="space-y-1">
            <label className="text-xs text-[#64748B] font-semibold flex items-center justify-between">
              <span>Candidate Safe Landing Sites</span>
              <span className="text-xs text-[#15803d] font-bold">By Score</span>
            </label>
            <div className="relative">
              <select
                value={activeLunarTarget.id}
                onChange={(e) => {
                  const found = PRESET_SAFE_LUNAR_SITES.find((s) => s.id === e.target.value);
                  if (found) handleSelectLunarSite(found);
                }}
                className="w-full bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-2xl px-3 py-2.5 text-xs text-[#0F172A] font-semibold focus:outline-none focus:border-[#0F172A] cursor-pointer appearance-none pr-8 transition-colors"
              >
                {activeLunarTarget.isCustom && (
                  <option value={activeLunarTarget.id}>
                    📍 {activeLunarTarget.name} (Custom Target)
                  </option>
                )}
                {PRESET_SAFE_LUNAR_SITES.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.safetyRank}. {site.name} ({site.safetyScorePct}%)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Highlighted Selected Target Details */}
          <div className="space-y-2 pt-1 text-xs">
            {/* Highlighted Coordinates */}
            <div className="flex justify-between items-center p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] font-medium">Target Coordinates:</span>
              <span className="font-mono font-bold text-[#15803d]">
                {Math.abs(activeLunarTarget.lat).toFixed(2)}°{activeLunarTarget.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(activeLunarTarget.lng).toFixed(2)}°{activeLunarTarget.lng >= 0 ? "E" : "W"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Safety Score</span>
                <span className="font-bold text-[#15803d] text-base">
                  {activeLunarTarget.safetyScorePct}%
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Surface Slope</span>
                <span className="font-bold text-[#0F172A] text-base">
                  {activeLunarTarget.slopeDeg}°
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
              <span className="text-[#64748B] font-medium">Illumination Duration:</span>
              <span className="text-[#0F172A] font-bold">{activeLunarTarget.illuminationPct}% Annual</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
              <span className="text-[#64748B] font-medium">Terrain Elevation:</span>
              <span className="text-[#0F172A] font-bold">+{activeLunarTarget.elevationM} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. BOTTOM ACTION CONTROL BAR                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-3 w-[92%] max-w-lg pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E2E8F0] rounded-3xl p-3 shadow-[0_4px_16px_rgba(15,23,42,0.12)] flex items-center justify-between w-full gap-2 text-[#0F172A]">
          {/* Back to Launch Sim Button */}
          <button
            onClick={() => setViewMode("launch_sim")}
            className="bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] px-4 py-2.5 rounded-2xl font-bold text-xs border border-[#CBD5E1] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Return to Earth Launch Simulation (Step 3)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden sm:inline">Stage 3: Liftoff</span>
          </button>

          {/* Mission Legend */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1 text-xs text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-[#0F172A]" />
              <span className="font-medium">Trajectory</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
              <span className="font-medium">Liftoff</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#15803d]" />
              <span className="font-medium">Landing</span>
            </div>
          </div>

          {/* Primary Action Button: Proceed to Lunar Descent Simulator */}
          <button
            onClick={() => {
              // Set the simulation candidate site to the selected lunar site
              setSimulationSiteData({
                id: activeLunarTarget.id,
                name: activeLunarTarget.name,
                code: activeLunarTarget.code,
                rank: activeLunarTarget.safetyRank,
                reason: activeLunarTarget.description,
                worldPos: { x: 0, y: 0, z: 0 },
                geoCoord: { lat: activeLunarTarget.lat, lng: activeLunarTarget.lng },
                elevationM: activeLunarTarget.elevationM,
                measuredSlopeDeg: activeLunarTarget.slopeDeg,
                maxSlopeDeg: activeLunarTarget.slopeDeg + 2.0,
                roughnessRa: 0.12,
                boulderDensityPerM2: 0.02,
                flatDiameterM: 180,
                craterDistM: 450,
                craterDiameterM: 80,
                sunAngleDeg: 1.5,
                solarIlluminationPct: activeLunarTarget.illuminationPct,
                radiationScore: 8.5,
                tempDayK: 260,
                tempNightK: 85,
                dustRisk: "Low",
                earthLOS: true,
                earthElevationDeg: 8.5,
                solarEfficiencyPct: 92,
                waterIceDistKm: 1.2,
                scientificInterest: "South Pole Volatiles & High Illumination",
                approachClearanceDeg: 25,
                scores: {} as any,
                overallScore: activeLunarTarget.safetyScorePct / 10,
                suitabilityLabel: activeLunarTarget.safetyScorePct > 90 ? "Optimal" : "Highly Suitable",
                goNoGo: {
                  slopePass: true,
                  flatDiameterPass: true,
                  earthLOSPass: true,
                  boulderPass: true,
                },
              });
              onStartDescentSimulation();
            }}
            className="flex-1 bg-[#C2410C] hover:bg-[#9A3412] text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Rocket className="w-4 h-4 fill-current text-white" />
            <span>Stage 5: Proceed to Descent</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. 2D Lunar Map Landing Site Picker Modal */}
      <TwoDimLunarMapPickerModal
        isOpen={is2DMapPickerOpen}
        onClose={() => setIs2DMapPickerOpen(false)}
        selectedSite={activeLunarTarget}
        onSelectSite={(site) => {
          handleSelectLunarSite(site);
          setSelectedSafeLunarSite(site);
        }}
      />
    </div>
  );
};

export default ThreeOrbitMissionPreview;

"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useStore, NOTABLE_TARGETS } from "@/store";
import { computePolygonStats } from "@/data/polygon-analytics";
import type { LayerMode, LunarTarget } from "@/types";
import { Compass, RotateCcw, ZoomIn, ZoomOut, Sun, Maximize2, Crosshair, Globe, Pentagon } from "lucide-react";

export const ThreeMoonWorkstation: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const reticleGroupRef = useRef<THREE.Group | null>(null);
  const polygonGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  const [mouseCoord, setMouseCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [altitudeKm, setAltitudeKm] = useState(3800);
  const [currentHemisphere, setCurrentHemisphere] = useState<"Northern" | "Southern">("Northern");

  const {
    activeLayer,
    layerOpacity,
    lunarDayHour,
    enableLighting,
    selectedTarget,
    setSelectedTarget,
    footprintRadiusKm,
    isPolygonMode,
    polygonPoints,
    addPolygonPoint,
    setPolygonStats,
    activeLander,
    setViewMode,
    rightPanelOpen,
  } = useStore();

  const isPolygonModeRef = useRef(isPolygonMode);
  isPolygonModeRef.current = isPolygonMode;

  const polygonPointsRef = useRef(polygonPoints);
  polygonPointsRef.current = polygonPoints;

  const activeLanderRef = useRef(activeLander);
  activeLanderRef.current = activeLander;

  // Texture references
  const texturesRef = useRef<Record<LayerMode, THREE.Texture | null>>({
    imagery: null,
    elevation: null,
    slope: null,
    water_ice: null,
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0d0e12); // Deep Tesla obsidian canvas

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 4.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Starfield Background (Deep Space subtle stars)
    const starCount = 1000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x9aa0a6, size: 0.5, transparent: true, opacity: 0.4 });
    scene.add(new THREE.Points(starGeo, starMat));

    // 3. Moon Mesh (radius = 1.0 unit = 1737.4 km)
    const sphereGeo = new THREE.SphereGeometry(1.0, 128, 128);
    const textureLoader = new THREE.TextureLoader();

    // Load textures
    const imageryTex = textureLoader.load("/textures/moon_surface_4k.jpg");
    imageryTex.colorSpace = THREE.SRGBColorSpace;
    texturesRef.current.imagery = imageryTex;

    const elevTex = textureLoader.load("/textures/layer_elevation.jpg");
    elevTex.colorSpace = THREE.SRGBColorSpace;
    texturesRef.current.elevation = elevTex;

    const slopeTex = textureLoader.load("/textures/layer_slope.jpg");
    slopeTex.colorSpace = THREE.SRGBColorSpace;
    texturesRef.current.slope = slopeTex;

    const iceTex = textureLoader.load("/textures/layer_water_ice.jpg");
    iceTex.colorSpace = THREE.SRGBColorSpace;
    texturesRef.current.water_ice = iceTex;

    const sphereMat = new THREE.MeshStandardMaterial({
      map: imageryTex,
      bumpMap: elevTex,
      bumpScale: 0.05,
      roughness: 0.92,
      metalness: 0.03,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Distant Earth in Lunar Sky (Apollo "Earthrise" effect)
    const earthGeo = new THREE.SphereGeometry(0.55, 64, 64);
    const earthTex = textureLoader.load("/textures/earth_surface.jpg");
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.7,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(-18, 9, -24); // Positioned high in the cislunar backdrop
    scene.add(earthMesh);

    // Earth atmosphere halo in lunar sky
    const earthHaloGeo = new THREE.SphereGeometry(0.57, 32, 32);
    const earthHaloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    const earthHaloMesh = new THREE.Mesh(earthHaloGeo, earthHaloMat);
    earthHaloMesh.position.copy(earthMesh.position);
    scene.add(earthHaloMesh);

    // 4. Lighting (Sun with shadow terminator + ambient light + Earthshine fill light)
    const ambientLight = new THREE.AmbientLight(0xffffff, enableLighting ? 0.38 : 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffdf6, 2.8);
    sunLight.position.set(3, 1, 3);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Dünya Işığı (Earthshine): Ay'ın gece tarafını aydınlatan zarif mavi-beyaz dolaylı yansıma
    const earthshineLight = new THREE.DirectionalLight(0x88c4ff, 0.65);
    earthshineLight.position.set(-18, 9, -24);
    scene.add(earthshineLight);

    // 5. Target Reticle Group
    const reticleGroup = new THREE.Group();
    scene.add(reticleGroup);
    reticleGroupRef.current = reticleGroup;

    // Reticle center ring
    const ringGeo = new THREE.RingGeometry(0.015, 0.018, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd86c6c, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    reticleGroup.add(ringMesh);

    // Outer dispersion circle (2km footprint scaled)
    const footprintGeo = new THREE.RingGeometry(0.04, 0.044, 48);
    const footprintMat = new THREE.MeshBasicMaterial({
      color: 0xd86c6c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const footprintMesh = new THREE.Mesh(footprintGeo, footprintMat);
    reticleGroup.add(footprintMesh);

    // 6. Polygon Group for 3D area selection
    const polygonGroup = new THREE.Group();
    scene.add(polygonGroup);
    polygonGroupRef.current = polygonGroup;

    // 7. Camera Interaction & Orbit
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let spherical = { radius: 4.2, theta: 0.2, phi: Math.PI / 2.2 };

    const updateCameraPos = () => {
      spherical.radius = Math.max(1.35, Math.min(10.0, spherical.radius));
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0, 0);

      setAltitudeKm(Math.round((spherical.radius - 1.0) * 1737.4));
      setCurrentHemisphere(camera.position.y >= 0 ? "Northern" : "Southern");
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast for hover coordinates
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const intersects = raycaster.intersectObject(sphere);

      if (intersects.length > 0 && intersects[0].uv) {
        const uv = intersects[0].uv;
        const lng = Number(((uv.x - 0.5) * 360).toFixed(2));
        const lat = Number(((uv.y - 0.5) * 180).toFixed(2));
        setMouseCoord({ lat, lng });
      } else {
        setMouseCoord(null);
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
      spherical.radius += e.deltaY * 0.003;
      updateCameraPos();
    };

    // Click on surface: either point picking or polygon vertex adding
    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const intersects = raycaster.intersectObject(sphere);

      if (intersects.length > 0 && intersects[0].uv) {
        const uv = intersects[0].uv;
        const lng = Number(((uv.x - 0.5) * 360).toFixed(2));
        const lat = Number(((uv.y - 0.5) * 180).toFixed(2));

        if (isPolygonModeRef.current) {
          const pt = { lat, lng };
          addPolygonPoint(pt);
          const newPts = [...polygonPointsRef.current, pt];
          if (newPts.length >= 3) {
            const stats = computePolygonStats(newPts, activeLanderRef.current);
            setPolygonStats(stats);
          }
        } else {
          setSelectedTarget({
            id: `custom_${Date.now()}`,
            name: `Target Site (${lat >= 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, ${lng >= 0 ? `${lng}°E` : `${Math.abs(lng)}°W`})`,
            lat,
            lng,
            elevationM: Math.round(Math.sin(lat) * 2000),
            description: "Target coordinates selected directly on the 3D lunar sphere.",
            isCandidate: false,
          });
        }
      }
    };

    // Double click to descend directly to the surface & inspect rocks
    const onDblClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const intersects = raycaster.intersectObject(sphere);

      if (intersects.length > 0 && intersects[0].uv) {
        const uv = intersects[0].uv;
        const lng = Number(((uv.x - 0.5) * 360).toFixed(2));
        const lat = Number(((uv.y - 0.5) * 180).toFixed(2));

        setSelectedTarget({
          id: `custom_${Date.now()}`,
          name: `Target Site (${lat >= 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, ${lng >= 0 ? `${lng}°E` : `${Math.abs(lng)}°W`})`,
          lat,
          lng,
          elevationM: Math.round(Math.sin(lat) * 2000),
          description: "Sub-meter surface and regolith boulder inspection.",
          isCandidate: false,
        });
        setViewMode("surface");
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

    // 8. Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

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
  }, []);

  // Update layer texture
  useEffect(() => {
    if (!sphereRef.current) return;
    const mat = sphereRef.current.material as THREE.MeshStandardMaterial;
    const tex = texturesRef.current[activeLayer] || texturesRef.current.imagery;
    if (tex) {
      mat.map = tex;
      mat.opacity = layerOpacity;
      mat.transparent = layerOpacity < 1.0;
      mat.needsUpdate = true;
    }
  }, [activeLayer, layerOpacity]);

  // Update lighting (True celestial Sun position based on astronomical synodic time, independent of site selection)
  useEffect(() => {
    if (!sunLightRef.current || !sceneRef.current) return;

    const synodicPeriod = 708.73;
    const solarFraction = (((lunarDayHour % synodicPeriod) + synodicPeriod) % synodicPeriod) / synodicPeriod;
    const subSolarLng = (180 - solarFraction * 360 + 360) % 360;
    const lunarSeasonPhase = (lunarDayHour / (365.25 * 24)) * 2 * Math.PI;
    const subSolarLat = 1.54 * Math.sin(lunarSeasonPhase);

    const phi = ((90 - subSolarLat) * Math.PI) / 180;
    const theta = ((subSolarLng + 180) * Math.PI) / 180;

    const sunDist = 6.0;
    const x = -sunDist * Math.sin(phi) * Math.cos(theta);
    const y = sunDist * Math.cos(phi);
    const z = sunDist * Math.sin(phi) * Math.sin(theta);

    sunLightRef.current.position.set(x, y, z);
    sunLightRef.current.intensity = enableLighting ? 2.6 : 0.0;

    sceneRef.current.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) {
        obj.intensity = enableLighting ? 0.38 : 0.75;
      }
    });
  }, [lunarDayHour, enableLighting]);

  // Update 3D Reticle position
  useEffect(() => {
    if (!reticleGroupRef.current) return;

    const phi = ((90 - selectedTarget.lat) * Math.PI) / 180;
    const theta = ((selectedTarget.lng + 180) * Math.PI) / 180;

    const r = 1.002;
    const x = -r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);

    reticleGroupRef.current.position.set(x, y, z);
    reticleGroupRef.current.lookAt(x * 2, y * 2, z * 2);

    const scale = footprintRadiusKm / 2.0;
    const outerRing = reticleGroupRef.current.children[1];
    if (outerRing) {
      outerRing.scale.set(scale, scale, scale);
    }
  }, [selectedTarget, footprintRadiusKm]);

  // Update 3D Polygon lines
  useEffect(() => {
    if (!polygonGroupRef.current) return;
    const group = polygonGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (polygonPoints.length === 0) return;

    const points3D: THREE.Vector3[] = [];
    for (const pt of polygonPoints) {
      const phi = ((90 - pt.lat) * Math.PI) / 180;
      const theta = ((pt.lng + 180) * Math.PI) / 180;
      const r = 1.003;
      const x = -r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      points3D.push(new THREE.Vector3(x, y, z));

      // Small vertex marker
      const dotGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xd86c6c });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.set(x, y, z);
      group.add(dotMesh);
    }

    if (points3D.length >= 2) {
      if (points3D.length >= 3) {
        // Close polygon loop
        points3D.push(points3D[0]);
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points3D);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xd86c6c,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
    }
  }, [polygonPoints]);

  const flyToTarget = (lat: number, lng: number) => {
    if (!cameraRef.current) return;
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lng + 180) * Math.PI) / 180;
    const dist = lat < -70 ? 2.2 : 3.2;

    const targetX = dist * Math.sin(phi) * Math.sin(theta);
    const targetY = dist * Math.cos(phi);
    const targetZ = dist * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(targetX, targetY, targetZ);
    cameraRef.current.lookAt(0, 0, 0);
    setCurrentHemisphere(targetY >= 0 ? "Northern" : "Southern");
  };

  return (
    <div className="relative w-full h-full bg-[#1a1c22] overflow-hidden select-none">
      {/* Unified Telemetry & Hemisphere Status Pill at Top Center (Clean, Unobstructed) */}
      <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
        <div className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#E8EAED] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center gap-3 text-xs font-sans text-[#202124] pointer-events-auto">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              currentHemisphere === "Northern" ? "bg-[#1A73E8]" : "bg-[#EA4335]"
            } animate-pulse`}
          />
          <span className="font-semibold text-[#202124]">
            {currentHemisphere === "Northern" ? "Northern Hemisphere" : "Southern Hemisphere"}
          </span>
          <span className="text-[#E8EAED]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#5F6368]">Cursor:</span>
            {mouseCoord ? (
              <span className="font-mono text-[#202124] font-medium tabular-nums">
                {mouseCoord.lat >= 0 ? `${mouseCoord.lat}°N` : `${Math.abs(mouseCoord.lat)}°S`},{" "}
                {mouseCoord.lng >= 0 ? `${mouseCoord.lng}°E` : `${Math.abs(mouseCoord.lng)}°W`}
              </span>
            ) : (
              <span className="text-[#9AA0A6] font-mono">Off-Disk</span>
            )}
          </div>
          <span className="text-[#E8EAED]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#5F6368]">Altitude:</span>
            <span className="font-mono text-[#202124] font-medium tabular-nums">
              {altitudeKm.toLocaleString()} km
            </span>
          </div>
          <span className="text-[#E8EAED]">•</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#1A73E8] font-medium">
            <span>|—— 100 km ——|</span>
          </div>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div
        ref={mountRef}
        className={`w-full h-full ${
          isPolygonMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
        }`}
      />

      {/* Floating Navigation Controls (Bottom Right - Smoothly shifts when Right Place Card is open) */}
      <div className={`absolute bottom-6 z-30 flex flex-col items-center gap-2 select-none pointer-events-auto transition-all duration-300 ${
        rightPanelOpen ? "right-[408px]" : "right-4"
      }`}>
        {/* Quick Orientation Pill Group */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#E8EAED] p-1 flex flex-col gap-1 text-[11px] font-sans text-[#202124]">
          <button
            onClick={() => flyToTarget(-89.9, 0)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#F1F3F4] text-[#202124] font-medium flex items-center gap-1.5 transition-colors text-left cursor-pointer"
            title="South Pole (Artemis Landing Zone)"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>South Pole</span>
          </button>
          <button
            onClick={() => flyToTarget(89.5, 0)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] transition-colors text-left cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>North Pole</span>
          </button>
          <button
            onClick={() => flyToTarget(0, 0)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] transition-colors text-left cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Near Side</span>
          </button>
          <button
            onClick={() => flyToTarget(0, 180)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] transition-colors text-left cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Far Side</span>
          </button>
        </div>

        {/* Zoom In / Zoom Out Vertical Pill */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#E8EAED] flex flex-col overflow-hidden text-[#202124]">
          <button
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.multiplyScalar(0.85);
              }
            }}
            className="p-2.5 hover:bg-[#F1F3F4] text-[#202124] border-b border-[#E8EAED] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.multiplyScalar(1.15);
              }
            }}
            className="p-2.5 hover:bg-[#F1F3F4] text-[#202124] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreeMoonWorkstation;

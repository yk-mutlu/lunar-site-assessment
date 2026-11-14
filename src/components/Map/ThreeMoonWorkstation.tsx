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
  const [currentHemisphere, setCurrentHemisphere] = useState<"KYK" | "GYK">("KYK");

  const {
    activeLayer,
    layerOpacity,
    sunAzimuthDeg,
    sunElevationDeg,
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
    const imageryTex = textureLoader.load("/textures/moon_surface.jpg");
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
      roughness: 0.88,
      metalness: 0.05,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);
    sphereRef.current = sphere;

    // 4. Lighting (Sun with shadow terminator + ambient light: darker shadow side for realistic vacuum)
    const ambientLight = new THREE.AmbientLight(0xffffff, enableLighting ? 0.08 : 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
    sunLight.position.set(3, 1, 3);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

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
      setCurrentHemisphere(camera.position.y >= 0 ? "KYK" : "GYK");
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
            name: `Saha (${lat >= 0 ? `${lat}°K` : `${Math.abs(lat)}°G`}, ${lng >= 0 ? `${lng}°D` : `${Math.abs(lng)}°B`})`,
            lat,
            lng,
            elevationM: Math.round(Math.sin(lat) * 2000),
            description: "3D küre üzerinden seçilen hedef iniş noktası.",
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
          name: `Saha (${lat >= 0 ? `${lat}°K` : `${Math.abs(lat)}°G`}, ${lng >= 0 ? `${lng}°D` : `${Math.abs(lng)}°B`})`,
          lat,
          lng,
          elevationM: Math.round(Math.sin(lat) * 2000),
          description: "Sub-metre yüzey ve çakıl taşı incelemesi.",
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

  // Update lighting (Sun position & ambient)
  useEffect(() => {
    if (!sunLightRef.current || !sceneRef.current) return;
    const radAz = (sunAzimuthDeg * Math.PI) / 180;
    const radEl = (sunElevationDeg * Math.PI) / 180;

    const dist = 5.0;
    const x = dist * Math.cos(radEl) * Math.sin(radAz);
    const y = dist * Math.sin(radEl);
    const z = dist * Math.cos(radEl) * Math.cos(radAz);

    sunLightRef.current.position.set(x, y, z);
    sunLightRef.current.intensity = enableLighting ? 2.4 : 0.0;

    sceneRef.current.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) {
        obj.intensity = enableLighting ? 0.08 : 0.65;
      }
    });
  }, [sunAzimuthDeg, sunElevationDeg, enableLighting]);

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
    setCurrentHemisphere(targetY >= 0 ? "KYK" : "GYK");
  };

  return (
    <div className="relative w-full h-full bg-[#1a1c22] overflow-hidden select-none">
      {/* Dynamic Hemisphere Indicator (KYK / GYK) at Top Center */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
        <div className="bg-[#181a20]/95 backdrop-blur-md px-6 py-2 rounded-full border border-[#282a33] shadow-tesla flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              currentHemisphere === "KYK" ? "bg-[#4a9eff]" : "bg-[#d86c6c]"
            } animate-pulse shadow-sm`}
          />
          <span className="font-mono text-base font-extrabold tracking-wider text-[#f4f4f6]">
            {currentHemisphere}
          </span>
          <span className="text-[#9496a1] text-xs font-sans font-medium border-l border-[#282a33] pl-2.5">
            {currentHemisphere === "KYK" ? "Kuzey Yarımküre" : "Güney Yarımküre"}
          </span>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div
        ref={mountRef}
        className={`w-full h-full ${
          isPolygonMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
        }`}
      />

      {/* Tesla Style Floating Navigation Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-4 z-30 flex flex-col items-center gap-2 select-none pointer-events-auto">
        {/* Quick Orientation Pill Group */}
        <div className="bg-[#181a20]/95 backdrop-blur-md rounded-2xl shadow-tesla border border-[#282a33] p-1 flex flex-col gap-1 text-[11px] font-sans">
          <button
            onClick={() => flyToTarget(-89.9, 0)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#22242c] text-[#f4f4f6] font-medium flex items-center gap-1.5 transition-colors text-left cursor-pointer"
            title="Güney Kutbu (Artemis İniş Havzası)"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#d86c6c]" />
            <span>Güney Kutbu</span>
          </button>
          <button
            onClick={() => flyToTarget(89.5, 0)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#22242c] text-[#9496a1] hover:text-[#f4f4f6] transition-colors text-left cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Kuzey Kutbu</span>
          </button>
          <button
            onClick={() => flyToTarget(0, 0)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#22242c] text-[#9496a1] hover:text-[#f4f4f6] transition-colors text-left cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Yakın Yüz</span>
          </button>
          <button
            onClick={() => flyToTarget(0, 180)}
            className="px-2.5 py-1.5 rounded-xl hover:bg-[#22242c] text-[#9496a1] hover:text-[#f4f4f6] transition-colors text-left cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Uzak Yüz</span>
          </button>
        </div>

        {/* Zoom In / Zoom Out Vertical Pill */}
        <div className="bg-[#181a20]/95 backdrop-blur-md rounded-2xl shadow-tesla border border-[#282a33] flex flex-col overflow-hidden">
          <button
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.multiplyScalar(0.85);
              }
            }}
            className="p-2.5 hover:bg-[#22242c] text-[#f4f4f6] border-b border-[#282a33] transition-colors cursor-pointer"
            title="Yakınlaştır"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.multiplyScalar(1.15);
              }
            }}
            className="p-2.5 hover:bg-[#22242c] text-[#f4f4f6] transition-colors cursor-pointer"
            title="Uzaklaştır"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Surface Descent Button & Scale Telemetry Pill (Bottom Center) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 select-none">
        <button
          onClick={() => setViewMode("surface")}
          className="bg-[#d86c6c] hover:bg-[#c55a5a] text-white px-5 py-2 rounded-full shadow-tesla border border-[#e68383]/40 flex items-center gap-2 text-xs font-semibold transition-transform active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <Crosshair className="w-4 h-4" />
          <span>Yüzeye İn & Çakıl/Kaya İncele (Sub-Meter)</span>
        </button>

        <div className="bg-[#181a20]/95 rounded-full px-4 py-1.5 shadow-tesla border border-[#282a33] flex items-center gap-4 text-xs font-sans text-[#9496a1] pointer-events-auto backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="text-[#9496a1]">İmleç:</span>
            {mouseCoord ? (
              <span className="font-mono text-[#f4f4f6] font-medium tabular-nums">
                {mouseCoord.lat >= 0 ? `${mouseCoord.lat}°K` : `${Math.abs(mouseCoord.lat)}°G`},{" "}
                {mouseCoord.lng >= 0 ? `${mouseCoord.lng}°D` : `${Math.abs(mouseCoord.lng)}°B`}
              </span>
            ) : (
              <span className="text-[#5c5e69] font-mono">Boşlukta</span>
            )}
          </div>
          <span className="text-[#282a33]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#9496a1]">İrtifa:</span>
            <span className="font-mono text-[#f4f4f6] font-medium tabular-nums">
              {altitudeKm.toLocaleString()} km
            </span>
          </div>
          <span className="text-[#282a33]">•</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#d86c6c] font-medium">
            <span>|—— 100 km ——|</span>
          </div>
        </div>
      </div>
    </div>
  );
};



"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useStore } from "@/store";
import { LAUNCH_SITES, LaunchSite } from "@/data/earth-launch-service";
import {
  Compass,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sun,
  Maximize2,
  Crosshair,
  Globe,
  Rocket,
  ArrowRight,
  Radio,
  Layers,
  Sparkles,
  Mountain,
  Eye,
} from "lucide-react";

export const ThreeEarthWorkstation: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const pinGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const selectionBeaconGroupRef = useRef<THREE.Group | null>(null);
  const coreDotMeshRef = useRef<THREE.Mesh | null>(null);
  const coreDotMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const pulseRing1MeshRef = useRef<THREE.Mesh | null>(null);
  const pulseRing1MatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const pulseRing2MeshRef = useRef<THREE.Mesh | null>(null);
  const pulseRing2MatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const reticleMeshRef = useRef<THREE.Mesh | null>(null);
  const beaconBeamMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const targetSphericalRef = useRef<{ phi: number; theta: number; radius: number; active: boolean } | null>(null);

  const [mouseCoord, setMouseCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [altitudeKm, setAltitudeKm] = useState(12800);
  const [currentHemisphere, setCurrentHemisphere] = useState<"Northern" | "Southern">("Northern");
  const [hoveredSite, setHoveredSite] = useState<LaunchSite | null>(null);
  const [isMoonHovered, setIsMoonHovered] = useState(false);
  const [topographyIntensity, setTopographyIntensity] = useState<number>(1.2);

  const {
    selectedLaunchSite,
    setSelectedLaunchSite,
    setViewMode,
    isMapRendererPaused,
  } = useStore();


  const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;


    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x020306);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 4.4);
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
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.8,
      transparent: true,
      opacity: 0.75,
    });
    scene.add(new THREE.Points(starGeo, starMat));


    const earthGeo = new THREE.SphereGeometry(1.0, 128, 128);

    const earthColorTex = textureLoader.load("/textures/earth_surface.jpg");
    earthColorTex.colorSpace = THREE.SRGBColorSpace;

    const earthNormalTex = textureLoader.load("/textures/earth_normal.jpg");
    const earthSpecularTex = textureLoader.load("/textures/earth_specular.jpg");

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthColorTex,
      normalMap: earthNormalTex,
      normalScale: new THREE.Vector2(topographyIntensity, topographyIntensity),
      roughnessMap: earthSpecularTex,
      roughness: 0.65,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.castShadow = true;
    earthMesh.receiveShadow = true;
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;


    const cloudsGeo = new THREE.SphereGeometry(1.014, 96, 96);
    const cloudsTex = textureLoader.load("/textures/earth_clouds.png");
    cloudsTex.colorSpace = THREE.SRGBColorSpace;

    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.82,
      blending: THREE.NormalBlending,
      roughness: 0.9,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;


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
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);


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
    (moonMesh as any).isMoonTarget = true;
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;


    const ambientLight = new THREE.AmbientLight(0xffffff, 0.12);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ea, 3.4);
    sunLight.position.set(5, 2, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 25;
    scene.add(sunLight);
    sunLightRef.current = sunLight;


    const pinGroup = new THREE.Group();
    scene.add(pinGroup);
    pinGroupRef.current = pinGroup;

    LAUNCH_SITES.forEach((site) => {
      const pos = latLngToVector3(site.lat, site.lng, 1.018);


      const ringGeo = new THREE.RingGeometry(0.016, 0.022, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(pos.clone().multiplyScalar(2));
      pinGroup.add(ringMesh);


      const pinHeadGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const pinHeadMat = new THREE.MeshBasicMaterial({
        color: 0xd86c6c,
      });
      const pinHead = new THREE.Mesh(pinHeadGeo, pinHeadMat);
      pinHead.position.copy(pos);
      (pinHead as any).siteData = site;
      pinGroup.add(pinHead);
    });


    const beaconGroup = new THREE.Group();
    beaconGroup.name = "SelectionBeaconGroup";
    scene.add(beaconGroup);
    selectionBeaconGroupRef.current = beaconGroup;


    const coreGeo = new THREE.SphereGeometry(0.016, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      transparent: true,
      opacity: 1.0,
      depthTest: true,
      depthWrite: false,
    });
    const coreDot = new THREE.Mesh(coreGeo, coreMat);
    coreDot.position.set(0, 0, 0.005);
    beaconGroup.add(coreDot);
    coreDotMeshRef.current = coreDot;
    coreDotMatRef.current = coreMat;


    const reticleGeo = new THREE.RingGeometry(0.022, 0.027, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xff2e48,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      depthWrite: false,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.position.set(0, 0, 0.006);
    beaconGroup.add(reticleMesh);
    reticleMeshRef.current = reticleMesh;

    // C. Animated Expanding Radar Wave 1 (Ping Wave)
    const waveGeo1 = new THREE.RingGeometry(0.022, 0.038, 32);
    const waveMat1 = new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
    });
    const waveMesh1 = new THREE.Mesh(waveGeo1, waveMat1);
    waveMesh1.position.set(0, 0, 0.004);
    beaconGroup.add(waveMesh1);
    pulseRing1MeshRef.current = waveMesh1;
    pulseRing1MatRef.current = waveMat1;

    // D. Animated Expanding Radar Wave 2 (Secondary Phase-shifted Ping Wave)
    const waveGeo2 = new THREE.RingGeometry(0.022, 0.038, 32);
    const waveMat2 = new THREE.MeshBasicMaterial({
      color: 0xff3b52,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
    });
    const waveMesh2 = new THREE.Mesh(waveGeo2, waveMat2);
    waveMesh2.position.set(0, 0, 0.003);
    beaconGroup.add(waveMesh2);
    pulseRing2MeshRef.current = waveMesh2;
    pulseRing2MatRef.current = waveMat2;

    // E. Vertical Glowing Red Laser Beacon Beam shooting up into orbit
    const beamHeight = 0.28; // ~1800 km orbital altitude
    const beamGeo = new THREE.CylinderGeometry(0.002, 0.005, beamHeight, 16);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      transparent: true,
      opacity: 0.8,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 0, beamHeight / 2);
    beamMesh.rotation.x = Math.PI / 2;
    beaconGroup.add(beamMesh);
    beaconBeamMatRef.current = beamMat;

    // F. Top Beacon Light Head (Apex)
    const apexGeo = new THREE.SphereGeometry(0.008, 16, 16);
    const apexMat = new THREE.MeshBasicMaterial({
      color: 0xff4d66,
      transparent: true,
      opacity: 0.9,
    });
    const apexMesh = new THREE.Mesh(apexGeo, apexMat);
    apexMesh.position.set(0, 0, beamHeight);
    beaconGroup.add(apexMesh);

    // Position beacon at initially selected site
    const setBeaconToLocation = (lat: number, lng: number) => {
      if (!selectionBeaconGroupRef.current) return;
      const pos = latLngToVector3(lat, lng, 1.002);
      selectionBeaconGroupRef.current.position.copy(pos);
      selectionBeaconGroupRef.current.lookAt(pos.clone().multiplyScalar(2));
      selectionBeaconGroupRef.current.visible = true;
    };
    if (selectedLaunchSite) {
      setBeaconToLocation(selectedLaunchSite.lat, selectedLaunchSite.lng);
    }

    // 9. Camera Interaction & Orbit
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let mouseDownPos = { x: 0, y: 0 };
    let mouseDownTime = 0;
    let spherical = { radius: 4.2, theta: 0.35, phi: Math.PI / 2.3 };

    const updateCameraPos = () => {
      spherical.radius = Math.max(1.35, Math.min(10.0, spherical.radius));
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0, 0);

      setAltitudeKm(Math.round((spherical.radius - 1.0) * 6371));
      setCurrentHemisphere(camera.position.y >= 0 ? "Northern" : "Southern");
    };
    updateCameraPos();

    const handleSelectSite = (site: LaunchSite) => {
      setSelectedLaunchSite(site);
      setBeaconToLocation(site.lat, site.lng);

      // Smooth camera transition toward newly selected site
      const pos = latLngToVector3(site.lat, site.lng, 1.0);
      const norm = pos.clone().normalize();
      const targetPhi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
      const targetTheta = Math.atan2(norm.x, norm.z);

      targetSphericalRef.current = {
        phi: targetPhi,
        theta: targetTheta,
        radius: Math.max(1.8, Math.min(spherical.radius, 2.5)),
        active: true,
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
      mouseDownPos = { x: e.clientX, y: e.clientY };
      mouseDownTime = performance.now();
      if (targetSphericalRef.current) {
        targetSphericalRef.current.active = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      // Check Moon hover
      let moonHover = false;
      if (moonMeshRef.current) {
        const moonIntersects = raycaster.intersectObject(moonMeshRef.current);
        moonHover = moonIntersects.length > 0;
        setIsMoonHovered(moonHover);
      }

      // Check Earth surface coordinate hover
      const intersects = raycaster.intersectObject(earthMesh);
      const isEarthHovered = intersects.length > 0;
      if (isEarthHovered && intersects[0].uv) {
        const uv = intersects[0].uv;
        const lng = Number(((uv.x - 0.5) * 360).toFixed(2));
        const lat = Number(((uv.y - 0.5) * 180).toFixed(2));
        setMouseCoord({ lat, lng });
      } else {
        setMouseCoord(null);
      }

      // Check Pin hover
      const pinIntersects = raycaster.intersectObjects(pinGroup.children);
      const isPinHovered = pinIntersects.length > 0 && !!(pinIntersects[0].object as any).siteData;
      if (isPinHovered) {
        setHoveredSite((pinIntersects[0].object as any).siteData);
      } else {
        setHoveredSite(null);
      }

      // Dynamic cursor feedback
      if (moonHover || isPinHovered) {
        mount.style.cursor = "pointer";
      } else if (isEarthHovered) {
        mount.style.cursor = "crosshair";
      } else {
        mount.style.cursor = isDragging ? "grabbing" : "grab";
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

    const onClick = (e: MouseEvent) => {
      const clickDist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      const clickDuration = performance.now() - mouseDownTime;
      // If user moved more than 7px or held mouse down for > 450ms, it was a drag/orbit, not a click
      if (clickDist > 7 || clickDuration > 450) return;

      const rect = mount.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      // 1. Click on Moon -> Fly to Moon!
      if (moonMeshRef.current) {
        const moonIntersects = raycaster.intersectObject(moonMeshRef.current);
        if (moonIntersects.length > 0) {
          setViewMode("3d");
          return;
        }
      }

      // 2. Click on preset spaceport pin
      const pinIntersects = raycaster.intersectObjects(pinGroup.children);
      if (pinIntersects.length > 0) {
        const hitPin = pinIntersects.find((p) => (p.object as any).siteData);
        if (hitPin) {
          const site = (hitPin.object as any).siteData as LaunchSite;
          handleSelectSite(site);
          return;
        }
      }

      // 3. Click directly on Earth globe surface -> Select arbitrary region!
      const earthIntersects = raycaster.intersectObject(earthMesh);
      if (earthIntersects.length > 0) {
        const hit = earthIntersects[0];
        let lat: number;
        let lng: number;

        if (hit.uv) {
          lng = Number(((hit.uv.x - 0.5) * 360).toFixed(2));
          lat = Number(((hit.uv.y - 0.5) * 180).toFixed(2));
        } else {
          const norm = hit.point.clone().normalize();
          lat = Number((Math.asin(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI)).toFixed(2));
          const theta = Math.atan2(norm.z, -norm.x);
          let l = theta * (180 / Math.PI) - 180;
          if (l < -180) l += 360;
          if (l > 180) l -= 360;
          lng = Number(l.toFixed(2));
        }

        // Check if clicked near an existing preset spaceport (< 3.0 deg)
        const matchedPreset = LAUNCH_SITES.find((s) => {
          const dLat = Math.abs(s.lat - lat);
          const dLng = Math.abs(s.lng - lng);
          return Math.hypot(dLat, dLng) < 3.0;
        });

        if (matchedPreset) {
          handleSelectSite(matchedPreset);
        } else {
          const latFmt = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
          const lngFmt = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? "E" : "W"}`;
          const customSite: LaunchSite = {
            id: `custom_${lat.toFixed(2)}_${lng.toFixed(2)}`,
            name: `Designated Site (${latFmt}, ${lngFmt})`,
            location: `${latFmt}, ${lngFmt} • Earth Surface`,
            lat: Number(lat.toFixed(2)),
            lng: Number(lng.toFixed(2)),
            elevationM: 10,
            supportedLaunchVehicles: ["Custom Mission Vehicle", "Artemis HLS Transfer Stage"],
            description: `Designated site selected via 3D Earth globe (${lat.toFixed(2)}°, ${lng.toFixed(2)}°). Real-time space weather, wind, and radiation telemetry active.`,
            isCustom: true,
          };
          handleSelectSite(customSite);
        }
      }
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("click", onClick);

    // 10. Render Loop & Orbital Dynamics
    let animId: number;
    let orbitAngle = 0.8;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isMapRendererPaused) {
        const time = performance.now() * 0.001;

        const blinkCycle = (Math.sin(time * 8.0) + 1.0) * 0.5; // 0.0 to 1.0
        if (coreDotMatRef.current) {
          coreDotMatRef.current.opacity = 0.35 + 0.65 * blinkCycle;
        }
        if (coreDotMeshRef.current) {
          const sc = 1.0 + 0.35 * blinkCycle;
          coreDotMeshRef.current.scale.set(sc, sc, sc);
        }

        // 2. Radar Wave 1 (Dışa doğru genişleyen ilk radar halkası)
        const p1 = (time * 1.15) % 1.0;
        const scale1 = 1.0 + p1 * 3.5;
        if (pulseRing1MeshRef.current) {
          pulseRing1MeshRef.current.scale.set(scale1, scale1, 1);
        }
        if (pulseRing1MatRef.current) {
          pulseRing1MatRef.current.opacity = Math.pow(1.0 - p1, 1.5) * 0.95;
        }

        // 3. Radar Wave 2 (Faz kaydırılmış ikinci radar halkası)
        const p2 = (time * 1.15 + 0.5) % 1.0;
        const scale2 = 1.0 + p2 * 3.5;
        if (pulseRing2MeshRef.current) {
          pulseRing2MeshRef.current.scale.set(scale2, scale2, 1);
        }
        if (pulseRing2MatRef.current) {
          pulseRing2MatRef.current.opacity = Math.pow(1.0 - p2, 1.5) * 0.95;
        }

        // 4. Reticle Ring Rotation
        if (reticleMeshRef.current) {
          reticleMeshRef.current.rotation.z += 0.015;
        }

        // 5. Vertical Laser Beacon Column Pulsing
        if (beaconBeamMatRef.current) {
          beaconBeamMatRef.current.opacity = 0.4 + 0.55 * blinkCycle;
        }

        // Smooth camera transition toward target if active
        if (targetSphericalRef.current && targetSphericalRef.current.active) {
          spherical.phi = THREE.MathUtils.lerp(spherical.phi, targetSphericalRef.current.phi, 0.07);

          let dTheta = targetSphericalRef.current.theta - spherical.theta;
          while (dTheta > Math.PI) dTheta -= Math.PI * 2;
          while (dTheta < -Math.PI) dTheta += Math.PI * 2;
          spherical.theta += dTheta * 0.07;

          spherical.radius = THREE.MathUtils.lerp(spherical.radius, targetSphericalRef.current.radius, 0.07);
          updateCameraPos();

          if (Math.abs(dTheta) < 0.003 && Math.abs(spherical.phi - targetSphericalRef.current.phi) < 0.003) {
            targetSphericalRef.current.active = false;
          }
        }

        // Slow realistic cloud layer drift
        if (cloudsMeshRef.current) {
          cloudsMeshRef.current.rotation.y += 0.0003;
        }

        // Realistic Moon Orbit around Earth (radius = 6.2 units, inclination = 5.14 deg)
        if (moonMeshRef.current) {
          orbitAngle += 0.0004;
          const orbitR = 6.2;
          const moonX = orbitR * Math.cos(orbitAngle);
          const moonZ = orbitR * Math.sin(orbitAngle);
          const moonY = Math.sin(orbitAngle) * 0.45; // 5.14 deg orbital tilt
          moonMeshRef.current.position.set(moonX, moonY, moonZ);
          moonMeshRef.current.rotation.y += 0.0004; // Tidally locked synchronous rotation
        }

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
  }, [setSelectedLaunchSite, setViewMode, isMapRendererPaused, topographyIntensity]);

  // Synchronize beacon & smoothly point camera when selectedLaunchSite changes from outside (e.g. dropdown)
  useEffect(() => {
    if (!selectedLaunchSite) return;
    if (selectionBeaconGroupRef.current) {
      const pos = latLngToVector3(selectedLaunchSite.lat, selectedLaunchSite.lng, 1.002);
      selectionBeaconGroupRef.current.position.copy(pos);
      selectionBeaconGroupRef.current.lookAt(pos.clone().multiplyScalar(2));
      selectionBeaconGroupRef.current.visible = true;

      const norm = pos.clone().normalize();
      const targetPhi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
      const targetTheta = Math.atan2(norm.x, norm.z);
      targetSphericalRef.current = {
        phi: targetPhi,
        theta: targetTheta,
        radius: 2.4,
        active: true,
      };
    }
  }, [selectedLaunchSite]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#020306]">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Center: Click-to-Select Guidance Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#E8EAED] text-xs text-[#5F6368] shadow-md">
        <Crosshair className="w-3.5 h-3.5 text-[#1A73E8] animate-pulse" />
        <span>Click anywhere on the globe to <strong className="text-[#202124] font-medium">designate a launch site</strong> and update telemetry</span>
      </div>

      {/* Hovered Site or Moon Tooltip HUD */}
      {hoveredSite && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-30 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#1A73E8]/30 shadow-lg flex items-center gap-2.5 animate-fade-in font-sans">
          <div className="w-6 h-6 rounded-full bg-[#E8F0FE] flex items-center justify-center">
            <Rocket className="w-3.5 h-3.5 text-[#1A73E8]" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#202124]">{hoveredSite.name}</div>
            <div className="text-[10px] text-[#5F6368]">
              {hoveredSite.location} • {hoveredSite.supportedLaunchVehicles[0]}
            </div>
          </div>
        </div>
      )}

      {isMoonHovered && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-30 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#1A73E8]/40 shadow-lg flex items-center gap-2.5 animate-fade-in font-sans">
          <div className="w-6 h-6 rounded-full bg-[#E8F0FE] flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-[#1A73E8]" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#202124]">The Moon • 4K Topographic Surface</div>
            <div className="text-[10px] text-[#5F6368]">
              Click to navigate to 3D Lunar Orbit Workstation
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right: Topographic Relief, Coordinates & Altitude Telemetry */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2 font-sans select-none">
        {/* Selected Active Location Indicator */}
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#E8EAED] text-xs shadow-md flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1A73E8] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1A73E8]" />
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#5F6368]">Selected:</span>
            <span className="font-semibold text-[#202124] font-mono">{selectedLaunchSite.name}</span>
            <span className="text-[11px] text-[#1A73E8] font-mono font-medium">
              ({selectedLaunchSite.lat >= 0 ? `+${selectedLaunchSite.lat.toFixed(1)}°` : `${selectedLaunchSite.lat.toFixed(1)}°`}, {selectedLaunchSite.lng >= 0 ? `+${selectedLaunchSite.lng.toFixed(1)}°` : `${selectedLaunchSite.lng.toFixed(1)}°`})
            </span>
          </div>
        </div>

        {/* Topographic Relief Indicator */}
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-[#E8EAED] text-xs shadow-sm flex items-center gap-2">
          <Mountain className="w-3.5 h-3.5 text-[#1A73E8]" />
          <span className="text-[11px] text-[#5F6368]">Topography:</span>
          <span className="font-mono text-xs font-medium text-[#137333]">Active (Normal Map)</span>
        </div>

        {/* Orbit Telemetry Pill */}
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#E8EAED] text-xs shadow-sm flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span className="text-[#5F6368]">Orbital Altitude:</span>
            <span className="font-semibold text-[#202124] font-mono">{altitudeKm.toLocaleString()} km</span>
          </div>

          <div className="h-3 w-px bg-[#E8EAED]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[#5F6368]">Cursor:</span>
            <span className="font-mono text-[#202124]">
              {mouseCoord
                ? `${mouseCoord.lat > 0 ? `+${mouseCoord.lat}` : mouseCoord.lat}°, ${mouseCoord.lng > 0 ? `+${mouseCoord.lng}` : mouseCoord.lng
                }°`
                : `${currentHemisphere} Orbit`}
            </span>
          </div>
        </div>

        {/* Quick View Navigation / Switch to Moon Action */}
        <button
          onClick={() => setViewMode("3d")}
          className="bg-[#1A73E8] hover:bg-[#1557B0] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          title="Switch to 3D Lunar Orbit Workstation and Artemis Candidate Sites"
        >
          <span>Go to 3D Lunar Orbit</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ThreeEarthWorkstation;

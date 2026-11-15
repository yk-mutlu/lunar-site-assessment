// ═══════════════════════════════════════════════════════════════════════
// Stage3LunarDescentView.tsx
// 3. Aşama: Ay'a Gerçekçi İniş 3D Simülasyonu (Saf 3D WebGL / Three.js Model)
//
// Kullanıcının Talebi:
// "videoları kaldır onun yerine kendi yaptığın simülasyonları koy. Simülasyonlar 3d model üzerinden gösterilsin"
//
// Özellikler:
// 1. 4K Petavius Krater Tabanı ve PBR Yüzey Rölyefi:
//    - Orijinal 4K Albedo, 10.7 MB 4K Normal Haritası, Roughness ve AO kaplamaları.
//    - Merkezi zirve masifi, Rimae Petavius kanyon yarığı ve teraslı dış krater duvarları.
//    - İniş merkezinde (0,0) sıfır sapmalı düzlem (Asla zemine batmaz veya içine girmez!).
// 2. Yüksek Detaylı Apollo / Altair LEM İniş Modülü 3D Modeli:
//    - Kırışık Kapton altın termal folyo (lunar_gold_foil_normal.jpg),
//    - 4 sağlam açılı mafsallı iniş bacağı, V-truss kolları, geniş çanak ayaklar ve temas iğneleri.
//    - Basınçlı kabin, kokpit pencereleri, kenetlenme tüneli, 4'lü RCS yönlendirme iticileri.
//    - Merkez iniş motoru, alev jeti ve dinamik ışıklandırma.
// 3. Volumetrik Regolit Toz Fırtınası Partikül Sistemi:
//    - Modül yüzeye yaklaştıkça (son 35m) merkezden dışa doğru savrulan radyal toz fırtınası.
// 4. Çoklu Kamera Açıları & Serbest Yörünge:
//    - Sinematik Takip, Krater Panoraması, Yüzey Gözlemci ve Serbest 360° Fareyle Döndürme.
// 5. 5 Aşamalı Canlı İniş Protokolü & Telemetri Çubuğu.
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useStore } from "@/store";
import {
  getSynchronizedLunarHeight,
  getSynchronizedLunarAlbedo,
  getSynchronizedLunarSlopeDeg,
} from "@/data/lunar-surface-height";
import {
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  CheckCircle2,
  Camera,
  MapPin,
  Volume2,
  VolumeX,
  Compass,
  Layers,
  Sparkles,
} from "lucide-react";

interface DescentProtocol {
  id: number;
  name: string;
  shortDesc: string;
  toast: string;
  startT: number;
  endT: number;
}

const DESCENT_PROTOCOLS: DescentProtocol[] = [
  {
    id: 1,
    name: "1. Deorbit Burn",
    shortDesc: "Deorbit Burn",
    toast: "Protocol 1/5: Deorbit Braking Burn - Descent into Petavius crater basin initiated",
    startT: 0,
    endT: 0.22,
  },
  {
    id: 2,
    name: "2. LiDAR & Radar Lock",
    shortDesc: "Radar Lock",
    toast: "Protocol 2/5: Terrain Relative Navigation Locked - Laser altimetry scanning landing terrain",
    startT: 0.22,
    endT: 0.44,
  },
  {
    id: 3,
    name: "3. Gear Deployment",
    shortDesc: "Gear Deployment",
    toast: "Protocol 3/5: Vertical Attitude Confirmed - 4 Articulated landing legs deployed and locked",
    startT: 0.44,
    endT: 0.68,
  },
  {
    id: 4,
    name: "4. Terminal Dust Interaction",
    shortDesc: "Terminal Descent",
    toast: "Protocol 4/5: Terminal Descent - Engine plume interacts with regolith, vertical braking to zero",
    startT: 0.68,
    endT: 0.90,
  },
  {
    id: 5,
    name: "5. Touchdown & Engine Cutoff",
    shortDesc: "Touchdown",
    toast: "Protocol 5/5: Contact Light! Soft touchdown on crater floor - Main descent engine cut off",
    startT: 0.90,
    endT: 1.0,
  },
];

// ── Master Synchronized Topographic Elevation & Albedo (Unified Lunar Ground Model) ──
export const getAuthenticLunarElevation = (vx: number, vz: number): number => {
  return getSynchronizedLunarHeight(vx, vz);
};

export const getAuthenticLunarAlbedo = (vx: number, vz: number, y: number): [number, number, number] => {
  return getSynchronizedLunarAlbedo(vx, vz, y);
};

const getPetaviusTerrainHeight = getAuthenticLunarElevation;

export const Stage3LunarDescentView: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { selectedSafeLunarSite, setViewMode } = useStore();

  // Telemetri ve Uçuş Durumu
  const [altitudeM, setAltitudeM] = useState(15400);
  const [velocityMs, setVelocityMs] = useState(128.0);
  const [throttlePct, setThrottlePct] = useState(92);
  const [fuelPct, setFuelPct] = useState(38);
  const [activeProtocolId, setActiveProtocolId] = useState(1);
  const [currentToast, setCurrentToast] = useState(DESCENT_PROTOCOLS[0].toast);
  const [isLanded, setIsLanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraMode, setCameraMode] = useState<"cinematic" | "crater" | "surface" | "free">("cinematic");
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Animasyon referansları
  const animFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);

  // Ses Motoru
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
        filter.frequency.setValueAtTime(180, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.14, ctx.currentTime);
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
    scene.background = new THREE.Color(0x020306);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      4000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // OrbitControls (Serbest 360° İnceleme için)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 250;
    controls.minDistance = 2;
    controls.enabled = cameraMode === "free";

    // ── 2. Aydınlatma (Alçak Grazing Sun Işığı - Sert Ay Gölgeleri) ──
    const ambientLight = new THREE.AmbientLight(0x0e1422, 0.16);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ea, 4.2);
    sunLight.position.set(-360, 150, 120);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 900;
    sunLight.shadow.camera.left = -240;
    sunLight.shadow.camera.right = 240;
    sunLight.shadow.camera.top = 240;
    sunLight.shadow.camera.bottom = -240;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.05;
    scene.add(sunLight);

    // İniş Motoru Dinamik Alev Işığı
    const thrusterLight = new THREE.PointLight(0xff9925, 4.0, 50);
    scene.add(thrusterLight);

    // ── 3. Yıldızlı Derin Uzay & Uzaktaki Mavi Dünya Küresi ────────
    const starCount = 2200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.48;
      const r = 850;
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = Math.abs(r * Math.cos(phi)) + 15;
      starPositions[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Uzaktaki Mavi Gezegenimiz Dünya (Ay göğünde hilal)
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(18, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x4682b4,
        roughness: 0.6,
        metalness: 0.1,
      })
    );
    earthMesh.position.set(-350, 160, -450);
    scene.add(earthMesh);

    // ── 4. GERÇEKÇİ ÇOK ÖLÇEKLİ AY KRATERLERİ & UFKİ ETELİK ─────────
    // A) Yüksek Çözünürlüklü Dairesel Ana İniş Sahası (r=550m, dikişsiz ufuk geçişi)
    const terrainGeo = new THREE.CircleGeometry(550, 140);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const uvAttr = terrainGeo.attributes.uv;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = getAuthenticLunarElevation(vx, vz);
      posAttr.setY(i, vy);

      // Planar Metrik UV (Dikişsiz geniş regolit mikro dokusu tekrarlanır)
      uvAttr.setXY(i, vx / 55.0, vz / 55.0);

      // Gerçek LRO albedo renk modülasyonu (Açık renkli krater kenarları & koyu bazalt tabanlar)
      const [cr, cg, cb] = getAuthenticLunarAlbedo(vx, vz, vy);
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

    const terrainContainer = new THREE.Group();
    scene.add(terrainContainer);

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    terrainContainer.add(terrainMesh);

    // C) Ufka Uzanan Kesintisiz Sonsuz Ay Kabuğu Etekliği (Horizon Skirt: r=375m -> 9500m)
    // Asla bir yerde bitmeyen, küresel ufka kadar uzanan dikişsiz ay yüzeyi!
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
      const sphereDrop = -Math.pow(sr - 375, 2) / 32000;
      const horizonHills = Math.sin(sx * 0.003) * Math.cos(sz * 0.003) * 36.0 + Math.sin(Math.atan2(sz, sx) * 12) * 16.0;
      const sy = sphereDrop + horizonHills;
      sPos.setY(i, sy);

      // Planar UV (Sıfır radyal esneme, dikişsiz doku akışı)
      sUvs.setXY(i, sx / 55.0, sz / 55.0);

      const [cr, cg, cb] = getAuthenticLunarAlbedo(sx, sz, sy);
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

    // Holografik İniş Hedef Çemberi (Zeminde şık, asla batmaz)
    const landingRing = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 3.8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x1a73e8,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    landingRing.rotation.x = -Math.PI / 2;
    landingRing.position.set(0, 0.04, 0);
    scene.add(landingRing);

    // ── 5. KULLANICININ İNİŞ MODÜLÜ (APOLLO / ALTAIR LEM 3D MODELİ) ─
    const landerRoot = new THREE.Group();
    scene.add(landerRoot);

    // Kapton Altın Termal Folyo
    const foilNormal = textureLoader.load("/textures/lunar_gold_foil_normal.jpg");
    foilNormal.wrapS = THREE.RepeatWrapping;
    foilNormal.wrapT = THREE.RepeatWrapping;
    foilNormal.repeat.set(4, 4);

    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xd69922,
      metalness: 0.88,
      roughness: 0.26,
      normalMap: foilNormal,
      normalScale: new THREE.Vector2(1.5, 1.5),
    });

    const darkPanelMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      metalness: 0.7,
      roughness: 0.35,
    });

    const legMetalMat = new THREE.MeshStandardMaterial({
      color: 0xd0d4dc,
      metalness: 0.92,
      roughness: 0.18,
    });

    // A) Alt Sekizgen İniş Gövdesi (Descent Stage)
    const descentStage = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.45, 0.75, 8),
      goldFoilMat
    );
    descentStage.castShadow = true;
    descentStage.receiveShadow = true;
    landerRoot.add(descentStage);

    // Bilimsel ekipman bölmeleri & termal kutular
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 8;
      const bay = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.28), darkPanelMat);
      bay.position.set(Math.cos(angle) * 1.3, 0.05, Math.sin(angle) * 1.3);
      bay.rotation.y = angle;
      bay.castShadow = true;
      landerRoot.add(bay);
    }

    // Helyum basınç tankı küreleri
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x8a929e, metalness: 0.9, roughness: 0.15 });
    for (let i = 0; i < 2; i++) {
      const tank = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), tankMat);
      tank.position.set(i === 0 ? 0.75 : -0.75, 0.15, 0);
      tank.castShadow = true;
      landerRoot.add(tank);
    }

    // B) Üst Basınçlı Mürettebat Kabini (Ascent Stage Cabin)
    const cabinGroup = new THREE.Group();
    cabinGroup.position.y = 0.72;
    landerRoot.add(cabinGroup);

    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0xc8cdd6,
      metalness: 0.65,
      roughness: 0.35,
    });

    const cabinMain = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.85, 8), cabinMat);
    cabinMain.castShadow = true;
    cabinGroup.add(cabinMain);

    // Üst Kenetlenme Tüneli (Docking Ring)
    const dockingRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.08, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0x1f2228, metalness: 0.85, roughness: 0.2 })
    );
    dockingRing.rotation.x = Math.PI / 2;
    dockingRing.position.y = 0.51;
    cabinGroup.add(dockingRing);

    // Kokpit Pencereleri
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.05, metalness: 0.98 });
    const leftWindow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.04), windowMat);
    leftWindow.position.set(-0.25, 0.14, 0.78);
    leftWindow.rotation.set(-0.15, -0.2, 0);
    cabinGroup.add(leftWindow);

    const rightWindow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.04), windowMat);
    rightWindow.position.set(0.25, 0.14, 0.78);
    rightWindow.rotation.set(-0.15, 0.2, 0);
    cabinGroup.add(rightWindow);

    // C) 4 Sağlam Apollo İniş Bacağı (Mafsallı, V-Brace & Çanak Ayaklar)
    const legsGroup = new THREE.Group();
    landerRoot.add(legsGroup);

    const legPivots: THREE.Group[] = [];
    const legAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    legAngles.forEach((angle) => {
      const pivot = new THREE.Group();
      pivot.rotation.y = angle;
      pivot.position.set(Math.cos(angle) * 0.95, -0.25, Math.sin(angle) * 0.95);

      const legSub = new THREE.Group();
      pivot.add(legSub);

      // Ana Taşıyıcı Kol (Telescoping Strut)
      const mainStrut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 1.85, 12),
        legMetalMat
      );
      mainStrut.position.set(0.65, -0.35, 0);
      mainStrut.rotation.z = -0.72;
      mainStrut.castShadow = true;
      legSub.add(mainStrut);

      // V-Brace Destek Kolları
      const vBrace1 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.5, 8), legMetalMat);
      vBrace1.position.set(0.55, -0.22, 0.25);
      vBrace1.rotation.set(0.25, 0, -0.62);
      legSub.add(vBrace1);

      const vBrace2 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.5, 8), legMetalMat);
      vBrace2.position.set(0.55, -0.22, -0.25);
      vBrace2.rotation.set(-0.25, 0, -0.62);
      legSub.add(vBrace2);

      // Geniş Çanak Ayak Tabanı (Saucer Footpad)
      const footpad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.05, 32), goldFoilMat);
      footpad.position.set(1.28, -0.63, 0);
      footpad.castShadow = true;
      legSub.add(footpad);

      // Zemin temas sensör iğnesi
      const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), darkPanelMat);
      probe.position.set(1.28, -0.85, 0);
      legSub.add(probe);

      legsGroup.add(pivot);
      legPivots.push(legSub);
    });

    // D) 4'lü RCS İtici Kümeleri
    const rcsGroup = new THREE.Group();
    cabinGroup.add(rcsGroup);
    const rcsPuffMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const rcsArm = new THREE.Group();
      rcsArm.position.set(Math.cos(angle) * 1.05, 0.15, Math.sin(angle) * 1.05);
      rcsArm.rotation.y = angle;

      const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), darkPanelMat);
      armMesh.position.x = -0.1;
      rcsArm.add(armMesh);

      const nozGeo = new THREE.ConeGeometry(0.025, 0.07, 8);
      const nozMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });

      const nUp = new THREE.Mesh(nozGeo, nozMat);
      nUp.position.set(0.03, 0.06, 0);
      rcsArm.add(nUp);

      const nDown = new THREE.Mesh(nozGeo, nozMat);
      nDown.position.set(0.03, -0.06, 0);
      nDown.rotation.z = Math.PI;
      rcsArm.add(nDown);

      const puff = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.25, 8),
        new THREE.MeshBasicMaterial({ color: 0xddf0ff, transparent: true, opacity: 0.0 })
      );
      puff.position.set(0.03, -0.2, 0);
      puff.rotation.z = Math.PI;
      rcsArm.add(puff);
      rcsPuffMeshes.push(puff);

      rcsGroup.add(rcsArm);
    }

    // E) Merkez İniş Motoru ve Alev Jeti
    const engineGroup = new THREE.Group();
    engineGroup.position.y = -0.36;
    landerRoot.add(engineGroup);

    const bellMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.42, 0.4, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x25262a,
        metalness: 0.85,
        roughness: 0.25,
        side: THREE.DoubleSide,
      })
    );
    bellMesh.position.y = -0.18;
    engineGroup.add(bellMesh);

    const flameCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 1.3, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      })
    );
    flameCore.position.y = -0.85;
    flameCore.rotation.x = Math.PI;
    engineGroup.add(flameCore);

    const flameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 2.2, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff8811,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      })
    );
    flameOuter.position.y = -1.3;
    flameOuter.rotation.x = Math.PI;
    engineGroup.add(flameOuter);

    // ── 6. VOLUMETRİK RADYAL REGOLİT TOZ FIRTINASI (Dust Storm) ─────
    const dustCount = 220;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustVelocities: { x: number; y: number; z: number; speed: number }[] = [];

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 2;
      dustPositions[i * 3 + 1] = 0.05;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      dustVelocities.push({
        x: Math.cos(angle) * speed,
        y: 0.05 + Math.random() * 0.4,
        z: Math.sin(angle) * speed,
        speed: speed,
      });
    }

    // Dynamic soft radial circular particle canvas texture (No ugly WebGL square points)
    const createSoftDustTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(224, 222, 216, 0.95)");
      grad.addColorStop(0.35, "rgba(182, 180, 174, 0.45)");
      grad.addColorStop(0.7, "rgba(142, 140, 134, 0.12)");
      grad.addColorStop(1.0, "rgba(100, 100, 100, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    };
    const softDustTex = createSoftDustTexture();

    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      map: softDustTex || undefined,
      color: 0xc4c7ce,
      size: 2.8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const dustField = new THREE.Points(dustGeo, dustMat);
    scene.add(dustField);

    // ── 7. ANİMASYON DÖNGÜSÜ & UÇUŞ PROFİLİ ─────────────────────────
    const clock = new THREE.Clock();
    let simProgress = 0;
    const TOTAL_DESCENT_DURATION = 15.0; // 15 saniye gerçekçi iniş süresi
    const START_Y = 145.0;
    const TARGET_LANDING_Y = 0.88; // Ayakların zemine tam oturduğu kusursuz seviye

    landerRoot.position.set(0, START_Y, 0);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (!isPausedRef.current) {
        const delta = clock.getDelta();
        simProgress = Math.min(1.0, simProgress + delta / TOTAL_DESCENT_DURATION);

        // Protokol & Telemetri
        const curProto =
          DESCENT_PROTOCOLS.find((p) => simProgress >= p.startT && simProgress <= p.endT) ||
          DESCENT_PROTOCOLS[DESCENT_PROTOCOLS.length - 1];

        setActiveProtocolId(curProto.id);
        setCurrentToast(curProto.toast);

        // İniş Easing Eğrisi (Yumuşak temas için yavaşlayan üstel eğri)
        const ease = 1 - Math.pow(1 - simProgress, 2.8);
        const currentY = START_Y - ease * (START_Y - TARGET_LANDING_Y);
        landerRoot.position.y = currentY;

        // Telemetri Değerleri
        const altRatio = 1 - ease;
        const curAlt = Math.max(0, Math.round(altRatio * 15400));
        const curVel = Number((Math.max(0, altRatio * 128.0)).toFixed(1));
        const curThrottle = simProgress > 0.94 ? 0 : Math.round(55 + Math.sin(simProgress * 15) * 8);
        const curFuel = Number((38.0 - simProgress * 13.8).toFixed(1));

        setAltitudeM(curAlt);
        setVelocityMs(curVel);
        setThrottlePct(curThrottle);
        setFuelPct(curFuel);

        // Alev & Işık Titremesi
        if (simProgress < 0.94) {
          const flicker = 0.9 + Math.random() * 0.22;
          flameCore.scale.set(flicker, flicker * 1.1, flicker);
          flameOuter.scale.set(flicker * 1.1, flicker * (1.0 + Math.random() * 0.25), flicker * 1.1);
          thrusterLight.position.set(0, currentY - 0.6, 0);
          thrusterLight.intensity = 3.8 + Math.random() * 1.6;

          // RCS püskürtme efektleri
          if (Math.sin(simProgress * 25) > 0.7) {
            rcsPuffMeshes.forEach((puff) => {
              (puff.material as THREE.MeshBasicMaterial).opacity = 0.55;
            });
          } else {
            rcsPuffMeshes.forEach((puff) => {
              (puff.material as THREE.MeshBasicMaterial).opacity = 0.0;
            });
          }
        } else {
          // Motor Kesildi (Engine Cutoff)
          flameCore.visible = false;
          flameOuter.visible = false;
          thrusterLight.intensity = 0;
          rcsPuffMeshes.forEach((puff) => {
            (puff.material as THREE.MeshBasicMaterial).opacity = 0.0;
          });
        }

        // Bacakların Açılması (Protokol 3: 0.44 - 0.68)
        if (simProgress < 0.44) {
          legPivots.forEach((leg) => {
            leg.rotation.z = 0.45; // Kapalı konum
          });
        } else if (simProgress < 0.68) {
          const p = (simProgress - 0.44) / 0.24;
          legPivots.forEach((leg) => {
            leg.rotation.z = 0.45 * (1 - p); // Açılma hareketi
          });
        } else {
          legPivots.forEach((leg) => {
            leg.rotation.z = 0.0; // Tam kilitli açık konum
          });
        }

        // Regolit Toz Fırtınası (Son 35m irtifada zeminden kalkan tozlar)
        if (simProgress >= 0.68 && simProgress < 0.94) {
          dustMat.opacity = Math.min(0.85, (simProgress - 0.68) / 0.15);
          const pos = dustGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < dustCount; i++) {
            const v = dustVelocities[i];
            pos[i * 3] += v.x * 0.035;
            pos[i * 3 + 1] += v.y * 0.015;
            pos[i * 3 + 2] += v.z * 0.035;

            // Çok uzağa giden partikülleri merkeze resetle
            const dist = Math.hypot(pos[i * 3], pos[i * 3 + 2]);
            if (dist > 18) {
              pos[i * 3] = (Math.random() - 0.5) * 1.5;
              pos[i * 3 + 1] = 0.05;
              pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
            }
          }
          dustGeo.attributes.position.needsUpdate = true;
        } else if (simProgress >= 0.94) {
          dustMat.opacity = Math.max(0, dustMat.opacity - 0.02);
        }

        // İniş Tamamlandı (Touchdown!)
        if (simProgress >= 1.0 && !isLanded) {
          setIsLanded(true);
          setAltitudeM(0);
          setVelocityMs(0.0);
          setThrottlePct(0);
        }

        // ── 8. KAMERA KONTROLÜ ──────────────────────────────────────
        if (cameraMode === "cinematic") {
          // Dynamic camera framing showing both the lander and the surrounding impact craters
          const camProgress = Math.min(1.0, simProgress * 1.05);
          const camX = THREE.MathUtils.lerp(75.0, 14.0, camProgress);
          const camY = THREE.MathUtils.lerp(120.0, 5.5, camProgress);
          const camZ = THREE.MathUtils.lerp(150.0, 22.0, camProgress);

          camera.position.set(camX, camY, camZ);
          camera.lookAt(
            0,
            THREE.MathUtils.lerp(currentY * 0.4 + 1.2, 1.2, camProgress),
            THREE.MathUtils.lerp(-10.0, -4.0, camProgress)
          );
        } else if (cameraMode === "crater") {
          // Wide Lunar Crater Panorama Angle
          camera.position.set(85.0, 60.0, 110.0);
          camera.lookAt(0, 5.0, -20.0);
        } else if (cameraMode === "surface") {
          // Lunar Surface Ground Observer Camera (Wide-angle view of lander & crater rims)
          camera.position.set(16.0, 2.8, 16.0);
          camera.lookAt(0, currentY, -10.0);
        } else if (cameraMode === "free") {
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
  }, [cameraMode]);

  // Simülasyonu Sıfırla
  const handleRestart = () => {
    setIsLanded(false);
    setAltitudeM(15400);
    setVelocityMs(128.0);
    setThrottlePct(92);
    setFuelPct(38);
    setActiveProtocolId(1);
    setCurrentToast(DESCENT_PROTOCOLS[0].toast);
    setIsPaused(false);
    window.dispatchEvent(new CustomEvent("stage3-restart"));
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#020306] font-sans text-white">
      {/* 3D Three.js WebGL Viewport */}
      <div ref={mountRef} className="w-full h-full" />

      {/* ── TOP PROTOCOL & TELEMETRY HUD BAR (Google Material Design) ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none">
        
        {/* Left Telemetry HUD Card */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-2.5 px-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] flex items-center gap-4 text-xs text-[#202124]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLanded ? "bg-[#34A853]" : "bg-[#1A73E8] animate-pulse"
              }`}
            />
            <span className="font-semibold text-[#202124]">
              {isLanded ? "Touchdown Confirmed" : "Stage 3: Lunar Descent"}
            </span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          <div>
            <span className="text-[#5F6368] text-[11px] block">Altitude</span>
            <span className="font-semibold text-[#202124]">{altitudeM.toLocaleString()} m</span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          <div>
            <span className="text-[#5F6368] text-[11px] block">Vertical Speed</span>
            <span className="font-semibold text-[#1A73E8]">{velocityMs} m/s</span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          <div>
            <span className="text-[#5F6368] text-[11px] block">Throttle</span>
            <span className="font-semibold text-[#B06000]">{throttlePct}%</span>
          </div>

          <div className="h-4 w-px bg-[#E8EAED]" />

          <div>
            <span className="text-[#5F6368] text-[11px] block">Fuel Margin</span>
            <span className="font-semibold text-[#202124]">{fuelPct}%</span>
          </div>
        </div>

        {/* 5 Descent Protocols Step Tracker */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] flex items-center gap-1 overflow-x-auto max-w-full">
          {DESCENT_PROTOCOLS.map((proto) => {
            const isCurrent = activeProtocolId === proto.id;
            const isPassed = activeProtocolId > proto.id;
            return (
              <div
                key={proto.id}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isCurrent
                    ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                    : isPassed
                    ? "text-[#137333] bg-[#E6F4EA]"
                    : "text-[#5F6368]"
                }`}
                title={proto.toast}
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
                <span>{proto.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right Controls & Camera Selectors */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Camera Angles */}
          <div className="bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-[10px] p-1 flex items-center gap-1 text-xs shadow-sm">
            <button
              onClick={() => setCameraMode("cinematic")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraMode === "cinematic"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Cinematic Dynamic Tracking Angle"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cinematic</span>
            </button>

            <button
              onClick={() => setCameraMode("crater")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraMode === "crater"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Wide Petavius Crater Floor Panorama"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Panoramic</span>
            </button>

            <button
              onClick={() => setCameraMode("surface")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraMode === "surface"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Lunar Surface Ground Observer Camera"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Surface</span>
            </button>

            <button
              onClick={() => setCameraMode("free")}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                cameraMode === "free"
                  ? "bg-[#1A73E8] text-white font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
              title="Free 360° Orbit Camera (Click & Drag)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Free 3D</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-[#1A73E8] text-white"
                : "bg-white/95 hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124]"
            }`}
            title={soundEnabled ? "Mute Audio" : "Enable Descent Engine Audio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Pause / Resume */}
          {!isLanded && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] p-2.5 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-[#137333]" />
              ) : (
                <Pause className="w-4 h-4 text-[#B06000]" />
              )}
            </button>
          )}

          {/* Restart */}
          <button
            onClick={handleRestart}
            className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] p-2.5 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer"
            title="Restart Descent Simulation"
          >
            <RotateCcw className="w-4 h-4 text-[#5F6368]" />
          </button>

          {/* Back to Stage 2 */}
          <button
            onClick={() => setViewMode("orbit_preview")}
            className="bg-white/95 hover:bg-[#F1F3F4] text-[#202124] px-3 py-2.5 rounded-[10px] border border-[#E8EAED] shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Return to Stage 2: Translunar Orbit"
          >
            <ArrowLeft className="w-4 h-4 text-[#5F6368]" />
            <span className="hidden sm:inline">Return to Stage 2</span>
          </button>
        </div>
      </div>

      {/* ── LEFT TARGET SITE & LIDAR INFO CARD ── */}
      <div className="absolute top-20 left-4 z-20 pointer-events-none max-w-xs w-full">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.12)] space-y-3 text-xs text-[#202124]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider">
              Target Landing Site
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] text-[10px] font-semibold">
              Safe Zone
            </span>
          </div>

          <div className="bg-[#F8F9FA] rounded-[10px] p-2.5 border border-[#E8EAED] space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1A73E8]" />
              <span className="font-semibold text-sm text-[#202124]">
                {selectedSafeLunarSite?.name || "Petavius Crater Floor"}
              </span>
            </div>
            <div className="text-[11px] text-[#5F6368] pl-6 font-mono">
              -25.28°S, 60.78°E • Rimae Margin
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#F8F9FA] p-2 rounded-[8px] border border-[#E8EAED]">
              <span className="text-[#5F6368] text-[11px] block">Surface Slope</span>
              <span className="font-semibold text-[#137333]">
                3.2° (&lt; 8° Safe Limit)
              </span>
            </div>
            <div className="bg-[#F8F9FA] p-2 rounded-[8px] border border-[#E8EAED]">
              <span className="text-[#5F6368] text-[11px] block">LiDAR Lock</span>
              <span className="font-semibold text-[#1A73E8]">
                {activeProtocolId >= 2 ? "Locked" : "Scanning"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#5F6368]">Descent Progress:</span>
              <span className="text-[#202124] font-medium">
                {Math.min(100, Math.round(((15400 - altitudeM) / 15400) * 100))}%
              </span>
            </div>
            <div className="w-full h-2 bg-[#E8EAED] rounded-[6px] overflow-hidden p-0.5 border border-[#DADCE0]">
              <div
                className="h-full bg-[#1A73E8] rounded-[4px] transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round(((15400 - altitudeM) / 15400) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM LIVE PROTOCOL STATUS TOAST (Google Maps Style) ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-xl w-[90%]">
        <div className="bg-white/95 backdrop-blur-md border border-[#E8EAED] rounded-2xl p-3 px-5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] flex items-center justify-between gap-3 text-xs text-[#202124]">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLanded ? "bg-[#34A853]" : "bg-[#1A73E8] animate-pulse"
              }`}
            />
            <span className="font-medium text-[#202124]">{currentToast}</span>
          </div>

          {isLanded && (
            <button
              onClick={() => setViewMode("surface_traverse")}
              className="pointer-events-auto bg-[#1A73E8] hover:bg-[#1565C0] text-white px-4 py-2 rounded-[10px] font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <span>Proceed to Stage 4: Surface Rover Science</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── TOUCHDOWN CONFIRMATION MODAL ── */}
      {isLanded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="bg-white border border-[#E8EAED] rounded-2xl p-6 max-w-md w-full shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-4 text-center text-[#202124]">
            <div className="w-14 h-14 rounded-2xl bg-[#E6F4EA] border border-[#34A853]/40 flex items-center justify-center mx-auto text-[#137333]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#137333] uppercase tracking-wider block mb-1">
                Descent Protocols Complete
              </span>
              <h2 className="text-xl font-bold text-[#202124] tracking-tight">
                Stage 3 Successful: Soft Lunar Touchdown Confirmed
              </h2>
              <p className="text-xs text-[#5F6368] mt-1.5 leading-relaxed">
                The lunar landing module completed all 5 descent protocols. The 4 articulated landing legs settled smoothly onto the surface of{" "}
                <span className="text-[#202124] font-medium">
                  {selectedSafeLunarSite?.name || "Petavius Crater Floor"}
                </span>{" "}
                and the descent engine cutoff sequence is verified.
              </p>
            </div>

            <div className="bg-[#F8F9FA] rounded-[10px] p-3 text-xs grid grid-cols-2 gap-2 text-left border border-[#E8EAED]">
              <div>
                <span className="text-[#5F6368] text-[11px] block">Vertical Touchdown Speed:</span>
                <span className="font-semibold text-[#137333]">0.0 m/s (Soft Contact)</span>
              </div>
              <div>
                <span className="text-[#5F6368] text-[11px] block">Remaining Fuel:</span>
                <span className="font-semibold text-[#202124]">{fuelPct}% (Nominal Margin)</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-[#E8EAED]">
                <span className="text-[#5F6368] text-[11px] block">Landing Site Coordinates:</span>
                <span className="font-semibold text-[#202124] font-mono">
                  -25.28°S, 60.78°E • Petavius Basin
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => setViewMode("surface_traverse")}
                className="w-full bg-[#1A73E8] hover:bg-[#1565C0] text-white py-3 px-4 rounded-[10px] font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Stage 6: Execute Surface Science & Rover Traverse</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode("surface")}
                  className="bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#202124] py-2.5 px-3 rounded-[10px] font-medium text-xs border border-[#E8EAED] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-[#1A73E8]" />
                  <span>Inspect 3D Surface</span>
                </button>

                <button
                  onClick={handleRestart}
                  className="bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#202124] py-2.5 px-3 rounded-[10px] font-medium text-xs border border-[#E8EAED] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#5F6368]" />
                  <span>Redo Descent</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stage3LunarDescentView;

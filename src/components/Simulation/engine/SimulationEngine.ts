// ═══════════════════════════════════════════════════════════════════════
// SimulationEngine.ts
// Standalone, reusable, high-fidelity Lunar Landing Simulation Engine
// Meets NASA Space Apps Challenge AAA visual & scientific criteria
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import {
  SimulationConfig,
  DEFAULT_CONFIG,
  SimulationResult,
  CameraMode,
  QualityLevel,
  QUALITY_PRESETS,
  LANDER_PROFILES,
  PHYSICS_DT,
} from './config';
import { generateHeightmap, buildTerrainMesh, createBoulders, sampleHeight } from './TerrainGenerator';
import { buildSpacecraft, SpacecraftParts } from './SpacecraftModel';
import { PhysicsState, createInitialState, stepPhysics, generateResult } from './PhysicsEngine';
import { EnginePlume, RCSJets, RegolithParticles, DebrisSystem } from './EffectsSystem';
import { CameraSystem } from './CameraSystem';
import { AudioEngine } from './AudioEngine';
import { FailureAnimator } from './FailureAnimations';

export interface TelemetryData {
  altitudeM: number;
  verticalSpeedMs: number;
  horizontalSpeedMs: number;
  fuelPct: number;
  throttlePct: number;
  phase: string;
  gForce: number;
  groundSlopeDeg: number;
  radarStatus: 'LOCK' | 'SEARCH' | 'CORRUPTED';
  isAnomaly: boolean;
  anomalyMessage?: string;
}

export class SimulationEngine {
  private mount: HTMLElement;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private cameraSystem: CameraSystem;
  private audioEngine: AudioEngine;
  private failureAnimator: FailureAnimator;

  // Scene Objects
  private terrainMesh: THREE.Mesh | null = null;
  private bouldersMesh: THREE.InstancedMesh | null = null;
  private spacecraftParts: SpacecraftParts | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private earthMesh: THREE.Mesh | null = null;
  private starsPoints: THREE.Points | null = null;

  // Visual Effects
  private plume: EnginePlume | null = null;
  private rcsJets: RCSJets | null = null;
  private regolithParticles: RegolithParticles | null = null;
  private debrisSystem: DebrisSystem | null = null;

  // Simulation State
  private config: SimulationConfig = { ...DEFAULT_CONFIG };
  private physicsState: PhysicsState;
  private heightmap: Float32Array | null = null;
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private physicsAccumulator = 0;
  private timeScale = 1.0;
  private quality: QualityLevel = 'high';

  // Callbacks
  private onTelemetryCallback?: (data: TelemetryData) => void;
  private onCompleteCallback?: (result: SimulationResult) => void;

  constructor(mount: HTMLElement, quality: QualityLevel = 'high') {
    this.mount = mount;
    this.quality = quality;

    // 1. Scene & Renderer setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020204);

    const aspect = mount.clientWidth / (mount.clientHeight || 1);
    this.cameraSystem = new CameraSystem(aspect);
    this.cameraSystem.setupMouseControls(mount);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(mount.clientWidth, mount.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.mount.appendChild(this.renderer.domElement);

    // 2. Audio & Failure Subsystems
    this.audioEngine = new AudioEngine();
    this.failureAnimator = new FailureAnimator();

    // 3. Initial physics dummy state
    this.physicsState = createInitialState(this.config);

    // 4. Build Environment
    this.setupLighting();
    this.setupCosmos();
    this.buildTerrainAndAssets();

    // 5. Start Render Loop
    this.startLoop();

    // 6. Handle resize
    window.addEventListener('resize', this.handleResize);
  }

  // ── Setup Lighting ──────────────────────────────────────────────────
  private setupLighting() {
    // Faint bounce light from lunar regolith (deep space has almost zero ambient)
    this.ambientLight = new THREE.AmbientLight(0x1a1e28, 0.18);
    this.scene.add(this.ambientLight);

    // Harsh low-angle lunar sunlight
    this.sunLight = new THREE.DirectionalLight(0xfff5ea, 3.2);
    this.updateSunPosition();
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1200;
    this.sunLight.shadow.camera.left = -250;
    this.sunLight.shadow.camera.right = 250;
    this.sunLight.shadow.camera.top = 250;
    this.sunLight.shadow.camera.bottom = -250;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  private updateSunPosition() {
    if (!this.sunLight) return;
    const azRad = (this.config.sunAzimuthDeg * Math.PI) / 180;
    const elRad = (this.config.sunElevationDeg * Math.PI) / 180;
    const dist = 500;

    const x = dist * Math.cos(elRad) * Math.sin(azRad);
    const y = dist * Math.sin(elRad);
    const z = dist * Math.cos(elRad) * Math.cos(azRad);

    this.sunLight.position.set(x, y, z);
    this.sunLight.target.position.set(0, 0, 0);
    this.scene.add(this.sunLight.target);
  }

  // ── Setup Stars and Blue Earth ──────────────────────────────────────
  private setupCosmos() {
    const qConfig = QUALITY_PRESETS[this.quality];

    // Starfield (non-twinkling in vacuum, varied magnitudes)
    const starGeo = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    const starColors: number[] = [];

    for (let i = 0; i < qConfig.starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 2500;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.sin(phi) * Math.sin(theta)) + 50; // Dome above
      const z = r * Math.cos(phi);

      starPositions.push(x, y, z);

      // Star color temperatures (blue-white to warm yellow)
      const starType = Math.random();
      if (starType > 0.8) {
        starColors.push(0.7, 0.8, 1.0); // B-class
      } else if (starType > 0.4) {
        starColors.push(1.0, 1.0, 1.0); // A/F class
      } else {
        starColors.push(1.0, 0.9, 0.7); // G/K class
      }
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    this.starsPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsPoints);

    // Blue Earth disc near horizon
    const earthGeo = new THREE.SphereGeometry(18, 32, 32);
    const earthMat = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
    });
    this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthMesh.position.set(-600, 120, -1200);
    this.scene.add(this.earthMesh);
  }

  // ── Build Terrain, Boulders & Spacecraft ─────────────────────────────
  private buildTerrainAndAssets() {
    const qConfig = QUALITY_PRESETS[this.quality];

    // Clean previous objects if any
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
    }
    if (this.bouldersMesh) {
      this.scene.remove(this.bouldersMesh);
      this.bouldersMesh.geometry.dispose();
      (this.bouldersMesh.material as THREE.Material).dispose();
    }

    // 1. Procedural Heightmap & Terrain
    const { heightmap, craters } = generateHeightmap(
      qConfig.terrainSegments,
      qConfig.terrainSize,
      this.config.terrainSeed,
      qConfig.craterCount,
      this.config.slopeDeg,
      this.config.heightmapData
    );
    this.heightmap = heightmap;

    this.terrainMesh = buildTerrainMesh(
      heightmap,
      qConfig.terrainSegments,
      qConfig.terrainSize,
      craters
    );
    this.scene.add(this.terrainMesh);

    // 2. Instanced Boulders
    this.bouldersMesh = createBoulders(
      heightmap,
      qConfig.terrainSegments,
      qConfig.terrainSize,
      qConfig.boulderCount,
      craters,
      this.config.terrainSeed
    );
    this.scene.add(this.bouldersMesh);

    // 3. Spacecraft Model
    const profile = LANDER_PROFILES[this.config.landerProfile] || LANDER_PROFILES.clps_medium;
    if (this.spacecraftParts) {
      this.scene.remove(this.spacecraftParts.group);
    }
    this.spacecraftParts = buildSpacecraft(profile);
    this.scene.add(this.spacecraftParts.group);

    // 4. Effects Systems
    if (this.plume) this.plume.dispose();
    this.plume = new EnginePlume(profile.modelScale);
    this.spacecraftParts.group.add(this.plume.group);

    if (this.rcsJets) this.rcsJets.dispose();
    this.rcsJets = new RCSJets(
      this.spacecraftParts.rcsPositions,
      this.spacecraftParts.group,
      profile.modelScale
    );

    if (this.regolithParticles) this.regolithParticles.dispose();
    this.regolithParticles = new RegolithParticles(qConfig.particleCount, this.scene);

    if (this.debrisSystem) this.debrisSystem.dispose();
    this.debrisSystem = new DebrisSystem(80, this.scene);

    // Place lander at initial altitude
    this.spacecraftParts.group.position.set(0, this.config.initialAltitudeM, 0);
  }

  // ── Public API Methods ──────────────────────────────────────────────
  public startSimulation(userConfig?: Partial<SimulationConfig>) {
    if (this.isRunning) return;

    if (userConfig) {
      this.config = { ...this.config, ...userConfig };
      this.updateSunPosition();
      this.buildTerrainAndAssets();
    }

    this.audioEngine.init();
    this.audioEngine.startEngine();

    this.physicsState = createInitialState(this.config);
    this.failureAnimator.reset();
    if (this.regolithParticles) this.regolithParticles.clear();
    if (this.debrisSystem) this.debrisSystem.clear();

    this.isRunning = true;
    this.physicsAccumulator = 0;
  }

  public reset() {
    this.isRunning = false;
    this.audioEngine.stopEngine();
    this.physicsState = createInitialState(this.config);
    this.failureAnimator.reset();

    if (this.regolithParticles) this.regolithParticles.clear();
    if (this.debrisSystem) this.debrisSystem.clear();

    if (this.spacecraftParts) {
      this.spacecraftParts.group.position.set(0, this.config.initialAltitudeM, 0);
      this.spacecraftParts.group.rotation.set(0, 0, 0);
      this.spacecraftParts.engineLight.intensity = 0;
      this.spacecraftParts.body.scale.set(1, 1, 1);
    }

    if (this.plume) {
      this.plume.update(0, 0.016);
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraSystem.setMode(mode);
  }

  public setTimeScale(scale: number) {
    this.timeScale = Math.max(0.1, Math.min(4.0, scale));
  }

  public toggleAudio() {
    this.audioEngine.toggleMute();
  }

  public isAudioMuted(): boolean {
    return this.audioEngine.muted;
  }

  public onTelemetry(cb: (data: TelemetryData) => void) {
    this.onTelemetryCallback = cb;
  }

  public onComplete(cb: (result: SimulationResult) => void) {
    this.onCompleteCallback = cb;
  }

  public getPhysicsState(): PhysicsState {
    return this.physicsState;
  }

  public getConfig(): SimulationConfig {
    return this.config;
  }

  // ── Render & Physics Loop ───────────────────────────────────────────
  private startLoop() {
    this.lastTime = performance.now();

    const loop = (now: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      // Clamp delta time to avoid spiral of death
      const dt = Math.min(rawDt, 0.1) * this.timeScale;

      if (this.isRunning) {
        // Fixed timestep 120Hz physics integration
        this.physicsAccumulator += dt;
        while (this.physicsAccumulator >= PHYSICS_DT) {
          const prevState = this.physicsState;
          this.physicsState = stepPhysics(this.physicsState, this.config, PHYSICS_DT);
          this.physicsAccumulator -= PHYSICS_DT;

          // Check if completion reached on this step
          if (!prevState.isComplete && this.physicsState.isComplete) {
            this.handleTouchdown();
          }
        }

        // Trigger RCS visual pulse on lateral adjustments
        if (Math.abs(this.physicsState.velX) > 0.5 || Math.abs(this.physicsState.velZ) > 0.5) {
          this.rcsJets?.fire([0, 1, 2]);
          if (Math.random() < 0.08) {
            this.audioEngine.playRCSClick();
          }
        }
      }

      // Update Subsystems
      this.updateVisuals(dt);
      this.updateTelemetry();

      // Render
      this.renderer.render(this.scene, this.cameraSystem.camera);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private handleTouchdown() {
    this.audioEngine.stopEngine();

    // Trigger Failure Animation or Nominal Touchdown Sound
    if (this.physicsState.failure !== 'none') {
      const terrainH = this.sampleCurrentTerrainHeight();
      this.failureAnimator.trigger(
        this.physicsState.failure,
        this.audioEngine,
        this.debrisSystem!,
        this.spacecraftParts!.group.position,
        terrainH
      );
    } else {
      this.audioEngine.playTouchdown();
      // Nominal gear align to slope
      if (this.spacecraftParts) {
        this.spacecraftParts.group.rotation.z = (this.config.slopeDeg * Math.PI) / 180;
      }
    }

    const finalResult = generateResult(this.physicsState, this.config);
    if (this.onCompleteCallback) {
      this.onCompleteCallback(finalResult);
    }
  }

  private sampleCurrentTerrainHeight(): number {
    if (!this.heightmap) return 0;
    const qConfig = QUALITY_PRESETS[this.quality];
    return sampleHeight(
      this.heightmap,
      qConfig.terrainSegments,
      qConfig.terrainSize,
      this.physicsState.posX,
      this.physicsState.posZ
    );
  }

  private updateVisuals(dt: number) {
    if (!this.spacecraftParts) return;

    const terrainY = this.sampleCurrentTerrainHeight();
    const currentAltitude = Math.max(0, this.physicsState.posY - terrainY);

    // Apply lander positions from physics
    const lander = this.spacecraftParts.group;
    lander.position.set(
      this.physicsState.posX,
      Math.max(terrainY, this.physicsState.posY),
      this.physicsState.posZ
    );

    // Failure animation update
    const failureEffects = this.failureAnimator.update(
      dt,
      this.spacecraftParts,
      this.debrisSystem!,
      this.audioEngine,
      this.config.slopeDeg
    );

    if (this.physicsState.failure === 'none') {
      lander.rotation.x = this.physicsState.pitch;
      lander.rotation.z = this.physicsState.roll;
      lander.rotation.y = this.physicsState.yaw;
    }

    // Engine plume & illumination
    const throttle = this.physicsState.fuelMassKg > 0 ? this.physicsState.throttle : 0;
    this.plume?.update(throttle, dt);
    this.spacecraftParts.engineLight.intensity = throttle * 4.5;
    this.audioEngine.updateEngine(throttle);

    // RCS & Particles
    this.rcsJets?.update(dt);
    this.regolithParticles?.update(
      dt,
      currentAltitude,
      this.physicsState.posX,
      this.physicsState.posZ,
      throttle,
      terrainY
    );
    this.debrisSystem?.update(dt, terrainY);

    // Camera update with shake
    this.cameraSystem.update(
      dt,
      lander.position,
      currentAltitude,
      this.physicsState.isComplete,
      this.physicsState.failure,
      this.physicsState.timeS
    );

    if (failureEffects.cameraShake > 0) {
      this.cameraSystem.camera.position.x += (Math.random() - 0.5) * failureEffects.cameraShake;
      this.cameraSystem.camera.position.y += (Math.random() - 0.5) * failureEffects.cameraShake;
    }
  }

  private updateTelemetry() {
    if (!this.onTelemetryCallback) return;

    const profile = LANDER_PROFILES[this.config.landerProfile] || LANDER_PROFILES.clps_medium;
    const totalFuel = this.config.massKg - profile.dryMassKg;
    const fuelPct = totalFuel > 0 ? (this.physicsState.fuelMassKg / totalFuel) * 100 : 0;

    const terrainY = this.sampleCurrentTerrainHeight();
    const actualAlt = Math.max(0, this.physicsState.posY - terrainY);
    const horizSpeed = Math.sqrt(this.physicsState.velX ** 2 + this.physicsState.velZ ** 2);

    let radarStatus: 'LOCK' | 'SEARCH' | 'CORRUPTED' = 'LOCK';
    if (this.physicsState.failure === 'radar_lock_loss') {
      radarStatus = 'CORRUPTED';
    } else if (actualAlt > 2500) {
      radarStatus = 'SEARCH';
    }

    this.onTelemetryCallback({
      altitudeM: Math.round(actualAlt),
      verticalSpeedMs: Number(Math.abs(this.physicsState.velY).toFixed(1)),
      horizontalSpeedMs: Number(horizSpeed.toFixed(1)),
      fuelPct: Math.round(Math.max(0, fuelPct)),
      throttlePct: Math.round(this.physicsState.throttle * 100),
      phase: this.physicsState.phase,
      gForce: Number(this.physicsState.maxGForce.toFixed(2)),
      groundSlopeDeg: this.config.slopeDeg,
      radarStatus,
      isAnomaly: this.physicsState.failure !== 'none',
      anomalyMessage: this.physicsState.failure !== 'none' ? this.physicsState.failure : undefined,
    });
  }

  private handleResize = () => {
    if (!this.mount || !this.renderer || !this.cameraSystem) return;
    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight || 1;
    this.renderer.setSize(width, height);
    this.cameraSystem.resize(width / height);
  };

  // ── Disposal ────────────────────────────────────────────────────────
  public dispose() {
    window.removeEventListener('resize', this.handleResize);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    this.audioEngine.dispose();
    this.plume?.dispose();
    this.rcsJets?.dispose();
    this.regolithParticles?.dispose();
    this.debrisSystem?.dispose();

    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
    }
    if (this.bouldersMesh) {
      this.bouldersMesh.geometry.dispose();
      (this.bouldersMesh.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.mount) {
      this.mount.removeChild(this.renderer.domElement);
    }
  }
}

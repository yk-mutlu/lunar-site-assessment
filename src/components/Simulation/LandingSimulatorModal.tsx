"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useStore } from "@/store";
import {
  Rocket,
  Play,
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  RefreshCw,
  Compass,
  ArrowLeft,
} from "lucide-react";
import { SimulationEngine, TelemetryData } from "./engine/SimulationEngine";
import {
  SimulationResult,
  CameraMode,
  LANDER_PROFILES,
} from "./engine/config";
import type { CandidateSite } from "@/data/site-scoring-types";

interface LandingSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteData?: CandidateSite | null;
}

export const LandingSimulatorModal: React.FC<LandingSimulatorModalProps> = ({
  isOpen,
  onClose,
  siteData,
}) => {
  const {
    selectedTarget,
    activeLander,
    sunAzimuthDeg,
    sunElevationDeg,
    recordSiteSimulationResult,
    setIsMapRendererPaused,
  } = useStore();

  // ── Adjustable Parameters (Initialized with site data if available) ───
  const [landerMassKg, setLanderMassKg] = useState(activeLander.massKg);
  const [maxTolerableSlopeDeg, setMaxTolerableSlopeDeg] = useState(activeLander.maxSlopeDeg);
  const [targetTerrainSlopeDeg, setTargetTerrainSlopeDeg] = useState(
    siteData ? siteData.measuredSlopeDeg : Math.abs(selectedTarget.lat) > 75 ? 6.8 : 3.2
  );
  const [touchdownSpeedLimitMs, setTouchdownSpeedLimitMs] = useState(2.2);
  const [selectedProfileId, setSelectedProfileId] = useState(
    activeLander.id === "artemis_hls" ? "artemis_hls" : "clps_medium"
  );

  // Synchronize when siteData changes or modal opens
  useEffect(() => {
    if (siteData) {
      setTargetTerrainSlopeDeg(siteData.measuredSlopeDeg);
      setMaxTolerableSlopeDeg(activeLander.maxSlopeDeg);
      setLanderMassKg(activeLander.massKg);
      setSelectedProfileId(activeLander.id === "artemis_hls" ? "artemis_hls" : "clps_medium");
    }
  }, [siteData, activeLander, isOpen]);

  // Pause Map Renderer while simulation is open to optimize GPU
  useEffect(() => {
    setIsMapRendererPaused(isOpen);
    return () => setIsMapRendererPaused(false);
  }, [isOpen, setIsMapRendererPaused]);

  // ── Simulation State & Controls ─────────────────────────────────────
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("cinematic");
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  // ── Telemetry State ─────────────────────────────────────────────────
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    altitudeM: 3000,
    verticalSpeedMs: 65.0,
    horizontalSpeedMs: 2.1,
    fuelPct: 100,
    throttlePct: 0,
    phase: "BRAKING",
    gForce: 1.0,
    groundSlopeDeg: targetTerrainSlopeDeg,
    radarStatus: "LOCK",
    isAnomaly: false,
  });

  // Sparkline history buffers
  const [altitudeHistory, setAltitudeHistory] = useState<number[]>([3000]);
  const [speedHistory, setSpeedHistory] = useState<number[]>([65]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

  // ── Reset to Site Defaults ──────────────────────────────────────────
  const handleResetToSiteDefaults = () => {
    if (siteData) {
      setTargetTerrainSlopeDeg(siteData.measuredSlopeDeg);
      setMaxTolerableSlopeDeg(activeLander.maxSlopeDeg);
      setLanderMassKg(activeLander.massKg);
      setTouchdownSpeedLimitMs(2.2);
    } else {
      setTargetTerrainSlopeDeg(3.2);
      setMaxTolerableSlopeDeg(8.0);
      setLanderMassKg(1800);
      setTouchdownSpeedLimitMs(2.2);
    }
  };

  // ── Success Probability Analytical Estimate ─────────────────────────
  const successProbability = useMemo(() => {
    const slopeMargin = maxTolerableSlopeDeg - targetTerrainSlopeDeg;
    let prob = 100;

    if (slopeMargin < 0) {
      // Direct slope violation: high tip-over probability
      prob -= Math.min(92, Math.abs(slopeMargin) * 20);
    } else {
      prob -= Math.max(0, (5 - slopeMargin) * 4);
    }

    const profile = LANDER_PROFILES[selectedProfileId] || LANDER_PROFILES.clps_medium;
    const maxMass = profile.dryMassKg + profile.fuelMassKg * 1.5;
    if (landerMassKg > maxMass * 0.9) {
      prob -= 25;
    }

    if (touchdownSpeedLimitMs < 1.8) {
      prob -= 15;
    }

    return Math.max(4, Math.min(99, Math.round(prob)));
  }, [maxTolerableSlopeDeg, targetTerrainSlopeDeg, landerMassKg, touchdownSpeedLimitMs, selectedProfileId]);

  // ── Initialize Simulation Engine ────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current) return;

    const engine = new SimulationEngine(canvasContainerRef.current, "high");
    engineRef.current = engine;

    engine.onTelemetry((data) => {
      setTelemetry(data);
      setAltitudeHistory((prev) => [...prev.slice(-30), data.altitudeM]);
      setSpeedHistory((prev) => [...prev.slice(-30), data.verticalSpeedMs]);
    });

    engine.onComplete((result) => {
      setSimRunning(false);
      setSimResult(result);

      // Persist simulation result for this candidate site
      if (siteData) {
        recordSiteSimulationResult(siteData.id, result);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "h") {
        setPresentationMode((prev) => !prev);
      } else if (e.key.toLowerCase() === "c") {
        setCameraMode((prev) =>
          prev === "cinematic" ? "free_orbit" : prev === "free_orbit" ? "onboard" : "cinematic"
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      engine.dispose();
      engineRef.current = null;
    };
  }, [isOpen, siteData, recordSiteSimulationResult]);

  // Synchronize Camera mode
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCameraMode(cameraMode);
    }
  }, [cameraMode]);

  // Synchronize Time scale
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTimeScale(timeScale);
    }
  }, [timeScale]);

  // ── Action Handlers ─────────────────────────────────────────────────
  const handleStartSimulation = () => {
    if (!engineRef.current || simRunning) return;

    setSimResult(null);
    setSimRunning(true);
    setAltitudeHistory([3000]);
    setSpeedHistory([65]);

    // Unique deterministic terrain seed per site
    let siteSeed = 42;
    if (siteData) {
      for (let i = 0; i < siteData.id.length; i++) {
        siteSeed = (siteSeed * 31 + siteData.id.charCodeAt(i)) & 0x7fffffff;
      }
    }

    engineRef.current.startSimulation({
      slopeDeg: targetTerrainSlopeDeg,
      tipoverDeg: maxTolerableSlopeDeg,
      massKg: landerMassKg,
      maxLandingSpeed: touchdownSpeedLimitMs,
      landerProfile: selectedProfileId,
      sunElevationDeg: siteData ? siteData.sunAngleDeg : sunElevationDeg,
      sunAzimuthDeg: sunAzimuthDeg,
      terrainSeed: siteSeed,
      initialAltitudeM: 3000,
      initialVerticalSpeedMs: 65,
    });
  };

  const handleResetSimulation = () => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    setSimRunning(false);
    setSimResult(null);
    setAltitudeHistory([3000]);
    setSpeedHistory([65]);
  };

  const handleToggleSound = () => {
    if (engineRef.current) {
      engineRef.current.toggleAudio();
      setIsMuted(engineRef.current.isAudioMuted());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md select-none font-sans text-xs animate-fade-in">
      <div className="w-full max-w-6xl bg-[#181a20] border border-[#282a33] rounded-3xl shadow-tesla flex flex-col h-[90vh] overflow-hidden text-[#f4f4f6]">
        {/* Header Bar */}
        <div className="h-14 px-6 border-b border-[#282a33] flex items-center justify-between bg-[#14151a]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-[#22242c] text-[#9496a1] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title="Haritaya Dön"
            >
              <ArrowLeft className="w-4 h-4 text-[#d86c6c]" />
              <span className="text-xs font-semibold text-[#f4f4f6]">Haritaya Dön</span>
            </button>

            <div className="h-5 w-px bg-[#282a33]" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[rgba(216,108,108,0.15)] flex items-center justify-center">
                <Rocket className="w-4 h-4 text-[#d86c6c]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#f4f4f6] text-sm">
                    {siteData ? `${siteData.code} · ${siteData.name}` : "Ay İniş Dinamikleri & Fizik Simülatörü"}
                  </span>
                  {siteData ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#282a33] text-[#34c759] border border-[#34c759]/30">
                      Saha Puanı: {siteData.overallScore.toFixed(1)}/10
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#282a33] text-[#d86c6c] border border-[#d86c6c]/30">
                      Jüri Doğrulama Modülü
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#9496a1]">
                  {siteData
                    ? `Rakım: ${siteData.elevationM} m • Ölçülen Eğim: ${siteData.measuredSlopeDeg}° • DSN LOS: ${siteData.earthLOS ? "Açık" : "Röle"}`
                    : "Jüri Parametre Doğrulama Modülü · Tsiolkovsky & 120Hz RK4 İniş Fiziği"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                isMuted
                  ? "bg-[#22242c] text-[#5c5e69] border-[#282a33]"
                  : "bg-[rgba(216,108,108,0.15)] text-[#d86c6c] border-[#d86c6c]/40"
              }`}
              title="Web Audio Sesi Aç/Kapat"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setPresentationMode((p) => !p)}
              className="p-2 text-[#9496a1] hover:text-[#f4f4f6] rounded-full hover:bg-[#22242c] border border-[#282a33] transition-colors cursor-pointer"
              title="Sunum Modu (Kısayol: H)"
            >
              {presentationMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-[#9496a1] hover:text-[#f4f4f6] rounded-full hover:bg-[#22242c] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left: 3D Landing Simulation Viewport */}
          <div className="flex-1 relative bg-[#060709] flex flex-col overflow-hidden">
            <div ref={canvasContainerRef} className="w-full h-full" />

            {/* Overlaid Controls (Camera Mode & Speed) */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10 bg-[#181a20]/90 backdrop-blur-md border border-[#282a33] p-1.5 rounded-2xl shadow-tesla">
              {/* Camera Mode Toggle */}
              <div className="flex rounded-xl bg-[#121317] p-0.5 border border-[#282a33]">
                <button
                  onClick={() => setCameraMode("cinematic")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    cameraMode === "cinematic"
                      ? "bg-[#d86c6c] text-white shadow-sm"
                      : "text-[#9496a1] hover:text-white"
                  }`}
                >
                  Sinematik
                </button>
                <button
                  onClick={() => setCameraMode("free_orbit")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    cameraMode === "free_orbit"
                      ? "bg-[#d86c6c] text-white shadow-sm"
                      : "text-[#9496a1] hover:text-white"
                  }`}
                >
                  Serbest
                </button>
                <button
                  onClick={() => setCameraMode("onboard")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    cameraMode === "onboard"
                      ? "bg-[#d86c6c] text-white shadow-sm"
                      : "text-[#9496a1] hover:text-white"
                  }`}
                >
                  Araç İçi (HUD)
                </button>
              </div>

              {/* Speed / Slow Motion Toggles */}
              <div className="flex rounded-xl bg-[#121317] p-0.5 border border-[#282a33]">
                <button
                  onClick={() => setTimeScale(0.25)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                    timeScale === 0.25
                      ? "bg-[#34c759] text-white shadow-sm"
                      : "text-[#9496a1] hover:text-white"
                  }`}
                  title="Ağır Çekim (Slow Motion)"
                >
                  0.25x
                </button>
                <button
                  onClick={() => setTimeScale(1.0)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                    timeScale === 1.0
                      ? "bg-[#d86c6c] text-white shadow-sm"
                      : "text-[#9496a1] hover:text-white"
                  }`}
                >
                  1.0x
                </button>
                <button
                  onClick={() => setTimeScale(2.0)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                    timeScale === 2.0
                      ? "bg-[#d86c6c] text-white shadow-sm"
                      : "text-[#9496a1] hover:text-white"
                  }`}
                >
                  2.0x
                </button>
              </div>
            </div>

            {/* Flight HUD Telemetry Overlay */}
            {!presentationMode && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10 max-w-xs">
                <div className="bg-[#181a20]/95 border border-[#282a33] rounded-2xl p-3 text-xs space-y-2 shadow-tesla font-sans backdrop-blur-md">
                  {/* Mission Phase Badge */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#282a33]">
                    <span className="text-[#9496a1] uppercase tracking-wider text-[10px] font-semibold">
                      Uçuş Fazı
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider ${
                        telemetry.phase === "TOUCHDOWN"
                          ? "bg-[rgba(52,199,89,0.2)] text-[#34c759] border border-[#34c759]/40"
                          : telemetry.isAnomaly
                          ? "bg-[rgba(216,108,108,0.2)] text-[#d86c6c] border border-[#d86c6c]/40 animate-pulse"
                          : "bg-[#282a33] text-[#38bdf8] border border-[#38bdf8]/30"
                      }`}
                    >
                      {telemetry.phase}
                    </span>
                  </div>

                  {/* Altitude & Sparkline */}
                  <div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[#9496a1]">İrtifa (Radar):</span>
                      <span className="text-[#f4f4f6] font-bold font-mono text-sm tabular-nums">
                        {telemetry.altitudeM.toLocaleString()} m
                      </span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="w-full h-4 mt-1 opacity-70" viewBox="0 0 100 20">
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        points={altitudeHistory
                          .map((val, idx) => {
                            const x = (idx / Math.max(1, altitudeHistory.length - 1)) * 100;
                            const y = 20 - (val / 3000) * 18;
                            return `${x},${Math.max(2, Math.min(18, y))}`;
                          })
                          .join(" ")}
                      />
                    </svg>
                  </div>

                  {/* Vertical Speed */}
                  <div className="flex justify-between items-center">
                    <span className="text-[#9496a1]">Dikey Hız (Vz):</span>
                    <span
                      className={`font-bold font-mono tabular-nums ${
                        telemetry.verticalSpeedMs > touchdownSpeedLimitMs && telemetry.altitudeM < 100
                          ? "text-[#d86c6c] animate-pulse"
                          : "text-[#f4f4f6]"
                      }`}
                    >
                      -{telemetry.verticalSpeedMs} m/s
                    </span>
                  </div>

                  {/* Horizontal Speed */}
                  <div className="flex justify-between items-center">
                    <span className="text-[#9496a1]">Yatay Hız (Vh):</span>
                    <span className="text-[#9496a1] font-mono tabular-nums">
                      {telemetry.horizontalSpeedMs} m/s
                    </span>
                  </div>

                  {/* Throttle Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9496a1]">Motor İtkisi (Throttle):</span>
                      <span className="text-[#d86c6c] font-mono font-bold">%{telemetry.throttlePct}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#22242c] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#d86c6c] to-[#ff8844] transition-all duration-75"
                        style={{ width: `${telemetry.throttlePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Fuel Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9496a1]">Kalan Yakıt:</span>
                      <span
                        className={`font-mono font-bold ${
                          telemetry.fuelPct < 15 ? "text-[#d86c6c] animate-pulse" : "text-[#34c759]"
                        }`}
                      >
                        %{telemetry.fuelPct}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#22242c] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-100 ${
                          telemetry.fuelPct < 15 ? "bg-[#d86c6c]" : "bg-[#34c759]"
                        }`}
                        style={{ width: `${telemetry.fuelPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Radar Status */}
                  <div className="flex justify-between items-center pt-1 border-t border-[#282a33]">
                    <span className="text-[#9496a1]">TRN Radar Kilidi:</span>
                    <span
                      className={`font-mono font-bold text-[10px] ${
                        telemetry.radarStatus === "LOCK"
                          ? "text-[#34c759]"
                          : telemetry.radarStatus === "SEARCH"
                          ? "text-[#f59e0b]"
                          : "text-[#d86c6c] animate-pulse"
                      }`}
                    >
                      {telemetry.radarStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Outcome Result Banner */}
            {simResult && !presentationMode && (
              <div
                className={`absolute bottom-4 left-4 right-4 p-4 rounded-2xl border text-xs space-y-1.5 shadow-tesla animate-fade-in backdrop-blur-md z-20 ${
                  simResult.success
                    ? "bg-[rgba(52,199,89,0.18)] border-[#34c759]/50 text-[#34c759]"
                    : "bg-[rgba(216,108,108,0.2)] border-[#d86c6c]/50 text-[#d86c6c]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {simResult.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-[#34c759]" />
                        <span>İNİŞ BAŞARILI · STATİK DENGE SAĞLANDI</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-[#d86c6c] animate-pulse" />
                        <span>GÖREV BAŞARISIZ · ANOMALİ RAPORU</span>
                      </>
                    )}
                  </div>

                  <span className="font-mono text-xs text-[#f4f4f6]">
                    Temas Hızı: {simResult.touchdownVelocityMs.toFixed(2)} m/s
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-[#f4f4f6]">{simResult.cause}</p>

                {/* Additional Physics Margins */}
                <div className="pt-2 flex flex-wrap gap-4 border-t border-[#282a33] text-[11px] text-[#9496a1]">
                  <span>
                    Güvenlik Marjı:{" "}
                    <strong className="text-[#f4f4f6]">%{simResult.safetyMarginPct.toFixed(0)}</strong>
                  </span>
                  <span>
                    Maks G-Kuvveti:{" "}
                    <strong className="text-[#f4f4f6]">{simResult.maxGForce.toFixed(1)} G</strong>
                  </span>
                  <span>
                    Uçuş Süresi:{" "}
                    <strong className="text-[#f4f4f6]">{simResult.flightTimeS.toFixed(1)} sn</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Interactive Sandbox Parameter Validation Panel */}
          {!presentationMode && (
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#282a33] bg-[#14151a] flex flex-col p-5 overflow-y-auto space-y-4 font-sans text-[#f4f4f6]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#d86c6c] uppercase tracking-wider block">
                    Jüri Test Parametreleri
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1e2029] border border-[#282a33]">
                    <span className="text-[10px] text-[#9496a1]">Başarı Olasılığı:</span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        successProbability > 70
                          ? "text-[#34c759]"
                          : successProbability > 40
                          ? "text-[#f59e0b]"
                          : "text-[#d86c6c]"
                      }`}
                    >
                      %{successProbability}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-sm font-bold text-[#f4f4f6]">
                    Fiziksel İniş Doğrulama
                  </h3>
                  {siteData && (
                    <button
                      onClick={handleResetToSiteDefaults}
                      disabled={simRunning}
                      className="text-[10px] text-[#38bdf8] hover:text-white flex items-center gap-1 cursor-pointer"
                      title="Sahanın orijinal ölçüm değerlerine sıfırla"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Saha Değerlerine Sıfırla</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Vehicle Profile Selection */}
              <div className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] space-y-1.5">
                <span className="text-xs font-medium text-[#f4f4f6] block">İniş Aracı Profili:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedProfileId("clps_medium");
                      setLanderMassKg(1800);
                      setMaxTolerableSlopeDeg(8.0);
                    }}
                    disabled={simRunning}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                      selectedProfileId === "clps_medium"
                        ? "bg-[#d86c6c]/15 border-[#d86c6c] text-[#f4f4f6]"
                        : "bg-[#181a20] border-[#282a33] text-[#9496a1] hover:border-[#383a46]"
                    }`}
                  >
                    CLPS Medium
                    <span className="block text-[10px] font-normal text-[#9496a1]">Nova-C sınıfı (1.8 t)</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedProfileId("artemis_hls");
                      setLanderMassKg(15000);
                      setMaxTolerableSlopeDeg(5.0);
                    }}
                    disabled={simRunning}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                      selectedProfileId === "artemis_hls"
                        ? "bg-[#d86c6c]/15 border-[#d86c6c] text-[#f4f4f6]"
                        : "bg-[#181a20] border-[#282a33] text-[#9496a1] hover:border-[#383a46]"
                    }`}
                  >
                    Artemis HLS
                    <span className="block text-[10px] font-normal text-[#9496a1]">Ağır İnsanlı (15.0 t)</span>
                  </button>
                </div>
              </div>

              {/* Parameter 1: Ground Slope */}
              <div className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#f4f4f6]">Zemin Eğimi (Slope):</span>
                  <span className="text-[#d86c6c] font-bold font-mono">{targetTerrainSlopeDeg}°</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="25.0"
                  step="0.5"
                  value={targetTerrainSlopeDeg}
                  onChange={(e) => setTargetTerrainSlopeDeg(Number(e.target.value))}
                  disabled={simRunning}
                  className="w-full accent-[#d86c6c] h-1.5 bg-[#22242c] rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-[#9496a1] block">
                  {siteData ? `${siteData.name} için ölçülen yerel eğim.` : "Seçilen koordinattaki LOLA DEM eğim verisi."}
                </span>
              </div>

              {/* Parameter 2: Vehicle Max Tolerable Slope */}
              <div className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#f4f4f6]">Aracın Devrilme Eşik Açısı:</span>
                  <span className="text-[#f4f4f6] font-bold font-mono">{maxTolerableSlopeDeg}°</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="15.0"
                  step="0.5"
                  value={maxTolerableSlopeDeg}
                  onChange={(e) => setMaxTolerableSlopeDeg(Number(e.target.value))}
                  disabled={simRunning}
                  className="w-full accent-[#d86c6c] h-1.5 bg-[#22242c] rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-[#9496a1] block">
                  Aracın CG yüksekliği ve bacak açıklığı limiti.
                </span>
              </div>

              {/* Parameter 3: Vehicle Wet Mass */}
              <div className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#f4f4f6]">Uzay Aracı Toplam Kütlesi:</span>
                  <span className="text-[#f4f4f6] font-bold font-mono">
                    {landerMassKg.toLocaleString()} kg
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="500"
                  value={landerMassKg}
                  onChange={(e) => setLanderMassKg(Number(e.target.value))}
                  disabled={simRunning}
                  className="w-full accent-[#d86c6c] h-1.5 bg-[#22242c] rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-[#9496a1] block">
                  Kütle arttıkça TWR düşer ve yakıt tüketimi logaritmik artar.
                </span>
              </div>

              {/* Parameter 4: Touchdown Speed Limit */}
              <div className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#f4f4f6]">Maksimum İniş Hızı:</span>
                  <span className="text-[#f4f4f6] font-bold font-mono">{touchdownSpeedLimitMs} m/s</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.2"
                  value={touchdownSpeedLimitMs}
                  onChange={(e) => setTouchdownSpeedLimitMs(Number(e.target.value))}
                  disabled={simRunning}
                  className="w-full accent-[#d86c6c] h-1.5 bg-[#22242c] rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-[#9496a1] block">
                  İniş bacak amortisörlerinin kinetik enerji absorpsiyon sınırı.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleStartSimulation}
                  disabled={simRunning}
                  className={`flex-1 py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer ${
                    simRunning
                      ? "bg-[#282a33] text-[#5c5e69] cursor-not-allowed"
                      : "bg-[#d86c6c] hover:bg-[#c55a5a] text-white"
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{simRunning ? "İniş Simüle Ediliyor..." : "İniş Simülasyonunu Başlat"}</span>
                </button>

                <button
                  onClick={handleResetSimulation}
                  disabled={simRunning}
                  className="p-3 rounded-full bg-[#22242c] hover:bg-[#2c2f3a] text-[#9496a1] hover:text-[#f4f4f6] border border-[#282a33] transition-colors cursor-pointer"
                  title="Sıfırla"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// EarthLaunchView.tsx
// 3D Ay Görev & Fırlatma Simülasyonu (Google Material & CustomTkinter UI)
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/store";
import {
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  LAUNCH_SITES,
  EarthWeatherData,
  SpaceWeatherData,
  RadiationEnvironmentData,
  LunarRobotMissionCalculations,
  LAUNCH_SCENARIO_PRESETS,
  calculateRadiationEnvironment,
  computeLunarRobotMissionImpact,
} from "@/data/earth-launch-service";

interface EarthLaunchViewProps {
  onProceedToLunarDescent: (calculatedRobotData: LunarRobotMissionCalculations) => void;
  siteName?: string;
  measuredSlope?: number;
}

export const EarthLaunchView: React.FC<EarthLaunchViewProps> = ({
  onProceedToLunarDescent,
  siteName,
  measuredSlope = 4.5,
}) => {
  const { selectedLaunchSite, selectedSafeLunarSite } = useStore();

  const [weather] = useState<EarthWeatherData>({
    siteId: selectedLaunchSite.id,
    ...LAUNCH_SCENARIO_PRESETS[0].weather,
    isLive: false,
    timestamp: new Date().toISOString(),
  });

  const [spaceWeather] = useState<SpaceWeatherData>({
    ...LAUNCH_SCENARIO_PRESETS[0].spaceWeather,
    isLive: false,
    timestamp: new Date().toISOString(),
  });

  const [radiation, setRadiation] = useState<RadiationEnvironmentData>(() =>
    calculateRadiationEnvironment(spaceWeather)
  );

  const [robotCalculations, setRobotCalculations] = useState<LunarRobotMissionCalculations>(() =>
    computeLunarRobotMissionImpact(weather, spaceWeather, radiation, measuredSlope)
  );

  useEffect(() => {
    const rad = calculateRadiationEnvironment(spaceWeather);
    setRadiation(rad);
    const robotCalc = computeLunarRobotMissionImpact(weather, spaceWeather, rad, measuredSlope);
    setRobotCalculations(robotCalc);
  }, [weather, spaceWeather, measuredSlope]);

  const targetSiteName = selectedSafeLunarSite?.name || siteName || "Shackleton";
  const targetLat = selectedSafeLunarSite?.lat ?? -89.54;
  const targetLng = selectedSafeLunarSite?.lng ?? -138.0;
  const targetScore = selectedSafeLunarSite?.safetyScorePct ?? 98.4;
  const simUrl = `/simulation.html?site=${encodeURIComponent(targetSiteName)}&lat=${targetLat}&lng=${targetLng}&score=${targetScore}`;

  return (
    <div className="relative w-full h-full bg-[#0b0c10] overflow-hidden flex flex-col font-sans select-none">
      {/* 3D Simulation Frame (Three.js WebGL Engine) */}
      <iframe
        src={simUrl}
        className="w-full h-full border-0"
        title="3D Lunar Mission Simulation"
      />

      {/* Floating Bottom Navigation */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-3">
        <a
          href={simUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto bg-[#1A73E8] hover:bg-[#1557B0] text-white px-5 py-2.5 rounded-[10px] font-semibold text-xs shadow-md flex items-center gap-2 transition-all active:scale-[0.98]"
          title="Open Simulation in Fullscreen New Tab"
        >
          <span>Open Fullscreen Simulation</span>
          <ExternalLink className="w-4 h-4 text-white" />
        </a>
      </div>
    </div>
  );
};

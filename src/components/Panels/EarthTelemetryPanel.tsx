// ═══════════════════════════════════════════════════════════════════════
// EarthTelemetryPanel.tsx
// Left-Side Floating Cockpit: Earth Weather, Space Weather & Mission Data
// Clean Google Maps & Material Aesthetic in English
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/store";
import {
  LAUNCH_SITES,
  EarthWeatherData,
  SpaceWeatherData,
  RadiationEnvironmentData,
  LunarRobotMissionCalculations,
  LAUNCH_SCENARIO_PRESETS,
  evaluateLaunchCommitCriteria,
  calculateRadiationEnvironment,
  computeLunarRobotMissionImpact,
  fetchLiveLaunchWeather,
  fetchLiveSpaceWeather,
} from "@/data/earth-launch-service";
import { NASA_ROCKET_VEHICLES } from "@/data/rocket-vehicles";
import { downloadOpenRocketFile, computeRocketFlightTrajectory } from "@/data/openrocket-engine";
import {
  RotateCcw,
  ChevronDown,
  ArrowRight,
  Clock,
  Sparkles,
  MapPin,
  Map as MapIcon,
  ShieldCheck,
  Wind,
  Sun,
  Radio,
  Zap,
  Rocket,
  Download,
  FileCode,
} from "lucide-react";

interface EarthTelemetryPanelProps {
  onStartSimulation: () => void;
  onSwitchToMoon: () => void;
}

export const EarthTelemetryPanel: React.FC<EarthTelemetryPanelProps> = ({
  onStartSimulation,
  onSwitchToMoon,
}) => {
  const {
    selectedLaunchSite,
    setSelectedLaunchSite,
    viewMode,
    setViewMode,
    setIs2DMapPickerOpen,
    launchTimeMode,
    setLaunchTimeMode,
    selectedRocket,
    setSelectedRocket,
    setIsOpenRocketModalOpen,
    setLatestLaunchReport,
  } = useStore();

  const [isLiveFetching, setIsLiveFetching] = useState(false);
  const [weather, setWeather] = useState<EarthWeatherData>({
    siteId: selectedLaunchSite.id,
    ...LAUNCH_SCENARIO_PRESETS[0].weather,
    isLive: false,
    timestamp: new Date().toISOString(),
  });

  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherData>({
    ...LAUNCH_SCENARIO_PRESETS[0].spaceWeather,
    isLive: false,
    timestamp: new Date().toISOString(),
  });

  const [radiation, setRadiation] = useState<RadiationEnvironmentData>(() =>
    calculateRadiationEnvironment(spaceWeather)
  );

  const [robotCalculations, setRobotCalculations] = useState<LunarRobotMissionCalculations>(() =>
    computeLunarRobotMissionImpact(weather, spaceWeather, radiation)
  );

  useEffect(() => {
    const rad = calculateRadiationEnvironment(spaceWeather);
    setRadiation(rad);
    const robotCalc = computeLunarRobotMissionImpact(weather, spaceWeather, rad);
    setRobotCalculations(robotCalc);
  }, [weather, spaceWeather]);

  useEffect(() => {
    let isCancelled = false;
    const loadSiteData = async () => {
      setIsLiveFetching(true);
      try {
        const [liveWeather, liveSpace] = await Promise.all([
          fetchLiveLaunchWeather(selectedLaunchSite),
          fetchLiveSpaceWeather(),
        ]);
        if (!isCancelled) {
          setWeather(liveWeather);
          setSpaceWeather(liveSpace);
        }
      } finally {
        if (!isCancelled) setIsLiveFetching(false);
      }
    };

    loadSiteData();
    return () => {
      isCancelled = true;
    };
  }, [selectedLaunchSite]);

  const handleRefresh = async () => {
    setIsLiveFetching(true);
    try {
      const [liveWeather, liveSpace] = await Promise.all([
        fetchLiveLaunchWeather(selectedLaunchSite),
        fetchLiveSpaceWeather(),
      ]);
      setWeather(liveWeather);
      setSpaceWeather(liveSpace);
    } finally {
      setIsLiveFetching(false);
    }
  };

  const lccResult = evaluateLaunchCommitCriteria(weather, spaceWeather);

  if (viewMode !== "earth") return null;

  return (
    <aside aria-label="Earth Mission Control Panel" className="fixed top-[124px] left-4 bottom-4 z-30 w-[310px] md:w-[330px] flex flex-col pointer-events-none select-none font-sans text-xs">
      <div className="pointer-events-auto flex-1 flex flex-col bg-white border border-[#E8EAED] rounded-2xl shadow-[0_4px_24px_rgba(60,64,67,0.22)] overflow-hidden text-[#202124]">
        
        {/* Header Bar */}
        <div className="p-4 pb-3 border-b border-[#E8EAED] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#202124]">Earth Mission Control</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F4EA] text-[#34A853]">
              Active
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLiveFetching}
            className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
            title="Refresh Live NOAA / Meteorological Data"
          >
            <RotateCcw className={`w-4 h-4 ${isLiveFetching ? "animate-spin text-[#1A73E8]" : ""}`} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin text-xs text-[#202124]">
          
          {/* Step 1: Launch Time & Countdown */}
          <div className="bg-[#F8F9FA] rounded-xl p-3 space-y-2 border border-[#E8EAED]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#202124] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1A73E8]" />
                <span>1. Launch Window</span>
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                launchTimeMode === "today" ? "bg-[#E6F4EA] text-[#34A853]" : "bg-[#E8F0FE] text-[#1A73E8]"
              }`}>
                {launchTimeMode === "today" ? "Today (Live)" : "Optimal TLI"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={() => setLaunchTimeMode("today")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  launchTimeMode === "today"
                    ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                    : "bg-white text-[#5F6368] hover:text-[#202124] border border-[#DADCE0]"
                }`}
              >
                <span>Launch Today</span>
              </button>
              <button
                onClick={() => setLaunchTimeMode("optimal")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  launchTimeMode === "optimal"
                    ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                    : "bg-white text-[#5F6368] hover:text-[#202124] border border-[#DADCE0]"
                }`}
              >
                <span>Nov 18 (Optimal)</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 text-[#5F6368] border-t border-[#E8EAED]">
              <span>Countdown:</span>
              <span className="text-[#202124] font-mono font-semibold">
                {launchTimeMode === "today" ? "T-00:14:22" : "T-02d 18h 34m"}
              </span>
            </div>
          </div>

          {/* Launch Complex Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="text-[#5F6368] font-medium">Launch Complex</span>
              <span className="text-[#202124] font-medium">{selectedLaunchSite.name.split(" ")[0]}</span>
            </div>

            <select
              value={selectedLaunchSite.id}
              onChange={(e) => {
                const site = LAUNCH_SITES.find((s) => s.id === e.target.value);
                if (site) setSelectedLaunchSite(site);
              }}
              className="w-full bg-[#F8F9FA] hover:bg-[#F1F3F4] border border-[#DADCE0] rounded-xl px-3 py-2 text-xs text-[#202124] font-medium focus:outline-none focus:border-[#1A73E8] cursor-pointer"
            >
              {LAUNCH_SITES.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.location})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Launch Vehicle / Rocket Selection (NASA Space Apps) */}
          <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#E8EAED] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-[#202124] flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5 text-[#1A73E8]" />
                <span>2. Launch Vehicle</span>
              </span>
              <span className="text-[10px] font-semibold text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                {selectedRocket.openRocketAgreementPct}% Match
              </span>
            </div>

            {/* Quick 3-Rocket Visual Selector Cards (Saturn V, SLS, Atlas V) */}
            <div className="grid grid-cols-3 gap-1.5">
              {NASA_ROCKET_VEHICLES.slice(0, 3).map((r) => {
                const isSel = selectedRocket.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRocket(r);
                      setLatestLaunchReport(computeRocketFlightTrajectory(r));
                    }}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSel
                        ? "border-[#1A73E8] bg-white shadow-sm ring-1 ring-[#1A73E8]"
                        : "border-[#E8EAED] bg-[#F1F3F4] hover:bg-white hover:border-[#DADCE0]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-[#1A73E8]">
                        {r.id === "saturn_v" ? "Apollo" : r.id === "sls_block1" ? "Artemis" : "LRO"}
                      </span>
                      {isSel && <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]" />}
                    </div>
                    <div className="mt-1">
                      <div className="font-semibold text-xs text-[#202124] leading-tight truncate">
                        {r.name.split(" ")[0]}
                      </div>
                      <div className="text-[10px] text-[#5F6368] font-mono mt-0.5">
                        {r.totalHeightM}m
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Vehicle Key Telemetry Strip */}
            <div className="p-2 bg-white rounded-lg border border-[#E8EAED] text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#5F6368]">Full Name:</span>
                <span className="font-semibold text-[#202124] truncate max-w-[170px]">{selectedRocket.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368]">Liftoff Thrust:</span>
                <span className="font-semibold text-[#1A73E8] font-mono">
                  {(selectedRocket.liftoffThrustKn / 1000).toFixed(1)} MN (T/W {selectedRocket.thrustToWeightRatio})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368]">Payload to TLI:</span>
                <span className="font-semibold text-[#137333] font-mono">
                  {(selectedRocket.payloadToTliKg / 1000).toFixed(1)} tonnes
                </span>
              </div>
            </div>

            {/* OpenRocket Studio & 3D Analyzer Launcher Button */}
            <div className="flex gap-1.5 pt-0.5">
              <button
                onClick={() => setIsOpenRocketModalOpen(true)}
                className="flex-1 bg-white hover:bg-[#F1F3F4] text-[#1A73E8] border border-[#DADCE0] rounded-lg py-1.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="OpenRocket (.ork) Stability Analyzer & 3D Blueprint"
              >
                <FileCode className="w-3.5 h-3.5 text-[#1A73E8]" />
                <span>OpenRocket Studio (.ork)</span>
              </button>

              <button
                onClick={() => {
                  const rep = computeRocketFlightTrajectory(selectedRocket);
                  downloadOpenRocketFile(selectedRocket, rep);
                }}
                className="bg-white hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] border border-[#DADCE0] rounded-lg px-2 text-xs transition-colors cursor-pointer flex items-center"
                title="Download .ork file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Launch Commit Criteria (LCC) Evaluation */}
          <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#E8EAED] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-[#202124] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34A853]" />
                <span>Launch Commit Status</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  lccResult.overallStatus === "GO"
                    ? "bg-[#E6F4EA] text-[#34A853]"
                    : lccResult.overallStatus === "HOLD"
                    ? "bg-[#FEF7E0] text-[#FBBC05]"
                    : "bg-[#FCE8E6] text-[#EA4335]"
                }`}
              >
                {lccResult.overallStatus}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {lccResult.checks.slice(0, 3).map((chk) => (
                <div key={chk.id} className="flex justify-between items-center text-[11px]">
                  <span className="text-[#5F6368]">{chk.name}:</span>
                  <span
                    className={`font-semibold ${
                      chk.status === "GO"
                        ? "text-[#34A853]"
                        : chk.status === "MARGINAL"
                        ? "text-[#FBBC05]"
                        : "text-[#EA4335]"
                    }`}
                  >
                    {chk.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Space Weather & Radiation Environment */}
          <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#E8EAED] space-y-2">
            <span className="text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider block">
              Space Weather & Radiation
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white rounded-lg border border-[#E8EAED]">
                <div className="text-[#5F6368] text-[10px]">Solar Wind</div>
                <div className="font-semibold font-mono text-[#202124]">{spaceWeather.solarWindSpeedKms} km/s</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E8EAED]">
                <div className="text-[#5F6368] text-[10px]">Geomagnetic Kp</div>
                <div className="font-semibold font-mono text-[#1A73E8]">Kp {spaceWeather.planetaryKpIndex.toFixed(1)}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E8EAED]">
                <div className="text-[#5F6368] text-[10px]">Van Allen Dose</div>
                <div className="font-semibold font-mono text-[#202124]">{radiation.totalTraversedDoseMsv.toFixed(1)} mSv</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E8EAED]">
                <div className="text-[#5F6368] text-[10px]">Solar Flare</div>
                <div className="font-semibold font-mono text-[#202124]">{spaceWeather.solarFlareIntensity}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#E8EAED] bg-white space-y-2">
          <button
            onClick={() => setIs2DMapPickerOpen(true)}
            className="w-full bg-[#1A73E8] hover:bg-[#1565C0] text-white py-2.5 px-3 rounded-xl font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <MapIcon className="w-4 h-4" />
            <span>Select Lunar Landing Site</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onSwitchToMoon}
            className="w-full bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#202124] border border-[#DADCE0] py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View 3D Moon Orbit</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default EarthTelemetryPanel;

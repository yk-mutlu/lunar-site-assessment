// ═══════════════════════════════════════════════════════════════════════
// EphemerisHorizonBar.tsx
// Temporal Analysis Cockpit & Ephemeris Horizon Bar (Google Maps / Material)
//
// NASA Space Apps Challenge Requirements:
// 1. Date & Time Selection: Landing date and time picker + synodic slider.
// 2. Sun Position: Solar azimuth, elevation, local horizon, illumination countdown.
// 3. Earth Position & Comms: Earth azimuth, elevation, geometric LOS vs RF link budget.
// 4. Solar Power Assessment: Solar exposure, panel orientation models (Vertical, Horizontal, Tracking),
//    with clear distinction between theoretical estimates and actual measurements.
// 5. Minimalist English UI with Google Maps neutral styling.
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store";
import { computeHorizonEphemeris } from "@/data/ephemeris";
import {
  Sun,
  Globe,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Clock,
  Compass,
  Radio,
  ChevronUp,
  ChevronDown,
  Zap,
  Info,
  Sliders,
} from "lucide-react";

export const EphemerisHorizonBar: React.FC = () => {
  const {
    selectedTarget,
    missionDate,
    setMissionDate,
    lunarDayHour,
    setLunarDayHour,
    isTimelinePlaying,
    setIsTimelinePlaying,
    setSunElevationDeg,
    setSunAzimuthDeg,
  } = useStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(4); // hours per tick
  const [panelOrientation, setPanelOrientation] = useState<"vertical" | "horizontal" | "tracking">("vertical");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const ephemeris = computeHorizonEphemeris(
    selectedTarget.lat,
    selectedTarget.lng,
    selectedTarget.elevationM,
    lunarDayHour
  );

  // Sync calculated Sun position to 3D/2D lighting
  useEffect(() => {
    setSunElevationDeg(Math.max(0, ephemeris.sunElevationDeg));
    setSunAzimuthDeg(ephemeris.sunAzimuthDeg);
  }, [ephemeris.sunElevationDeg, ephemeris.sunAzimuthDeg, setSunElevationDeg, setSunAzimuthDeg]);

  // Timeline Animation Loop
  useEffect(() => {
    if (!isTimelinePlaying) return;
    const interval = setInterval(() => {
      setLunarDayHour((prev) => (prev + playSpeed) % 708);
    }, 120);
    return () => clearInterval(interval);
  }, [isTimelinePlaying, playSpeed, setLunarDayHour]);

  // Polar Horizon Dial Projections
  // Center is Zenith (90°), Outer Ring is Horizon (0°), Sub-horizon (-20°)
  const dialRadius = 45;
  const dialCenter = 50;

  const toDialCoords = (elevDeg: number, azDeg: number) => {
    const clampedElev = Math.max(-20, Math.min(90, elevDeg));
    const normalizedR = ((90 - clampedElev) / 110) * dialRadius;
    const azRad = (azDeg - 90) * (Math.PI / 180);
    const x = dialCenter + normalizedR * Math.cos(azRad);
    const y = dialCenter + normalizedR * Math.sin(azRad);
    return { x, y };
  };

  const sunDial = toDialCoords(ephemeris.sunElevationDeg, ephemeris.sunAzimuthDeg);
  const earthDial = toDialCoords(ephemeris.earthElevationDeg, ephemeris.earthAzimuthDeg);

  // Date calculation based on missionDate + synodic hour
  const baseDate = new Date(missionDate || "2026-10-24T12:00:00Z");
  const currentDate = new Date(baseDate.getTime() + lunarDayHour * 3600 * 1000);
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = currentDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  // Selected array power output
  const activeArrayWatts =
    panelOrientation === "vertical"
      ? ephemeris.panelOrientationWatts?.vertical ?? 0
      : panelOrientation === "horizontal"
      ? ephemeris.panelOrientationWatts?.horizontal ?? 0
      : ephemeris.panelOrientationWatts?.tracking ?? 0;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92vw] select-none font-sans pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_4px_20px_rgba(60,64,67,0.22)] border border-[#E8EAED] p-3 flex flex-col gap-2.5 transition-all text-[#202124]">
        
        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-3">
          
          {/* 1. Polar Horizon Mini-Radar & Ephemeris Values */}
          <div className="flex items-center gap-3">
            <div
              className="relative w-14 h-14 rounded-full bg-[#F8F9FA] border border-[#E8EAED] flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer"
              title="Polar Horizon Projection (Outer: 0° Horizon, Center: 90° Zenith, Yellow: Sun, Blue: Earth)"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Horizon Circle (0°) */}
                <circle
                  cx={dialCenter}
                  cy={dialCenter}
                  r={dialRadius * (90 / 110)}
                  fill="none"
                  stroke="#DADCE0"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                {/* Zenith Point (90°) */}
                <circle cx={dialCenter} cy={dialCenter} r="2" fill="#9AA0A6" />

                {/* Sub-horizon boundary */}
                <circle
                  cx={dialCenter}
                  cy={dialCenter}
                  r={dialRadius}
                  fill="none"
                  stroke="#EA4335"
                  strokeWidth="0.75"
                  strokeOpacity="0.4"
                />

                {/* Sun Marker */}
                <circle
                  cx={sunDial.x}
                  cy={sunDial.y}
                  r="4"
                  fill="#FBBC05"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />

                {/* Earth Marker */}
                <circle
                  cx={earthDial.x}
                  cy={earthDial.y}
                  r="4"
                  fill="#1A73E8"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                {/* Sun Status */}
                <div className="flex items-center gap-1.5">
                  <Sun className={`w-4 h-4 ${ephemeris.isSunVisible ? "text-[#FBBC05] fill-[#FBBC05]" : "text-[#9AA0A6]"}`} />
                  <span className="text-xs font-semibold text-[#202124]">
                    Sun {ephemeris.sunElevationDeg > 0 ? `+${ephemeris.sunElevationDeg}°` : `${ephemeris.sunElevationDeg}°`}
                  </span>
                </div>

                {/* Earth Status */}
                <div className="flex items-center gap-1.5">
                  <Globe className={`w-4 h-4 ${ephemeris.isEarthVisible ? "text-[#1A73E8] fill-[#1A73E8]" : "text-[#9AA0A6]"}`} />
                  <span className="text-xs font-semibold text-[#202124]">
                    Earth {ephemeris.earthElevationDeg > 0 ? `+${ephemeris.earthElevationDeg}°` : `${ephemeris.earthElevationDeg}°`}
                  </span>
                </div>
              </div>

              {/* Environmental Windows */}
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#5F6368]">
                <span>
                  {ephemeris.isSunVisible
                    ? `Sunset in ~${ephemeris.timeToSunsetHours}h`
                    : "Lunar Night (Cryogenic)"}
                </span>
                <span>•</span>
                <span className={ephemeris.isCommsViable ? "text-[#34A853] font-medium" : "text-[#EA4335] font-medium"}>
                  {ephemeris.isCommsViable
                    ? `Direct DSN LOS (+${ephemeris.rfLinkMarginDb} dB)`
                    : ephemeris.isGeometricLOS
                    ? "Low LOS (Relay Advised)"
                    : "Occluded (Relay Mandatory)"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Timeline Scrubber & Date Controls */}
          <div className="flex items-center gap-1.5">
            {/* Date Picker Button */}
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] text-xs font-medium border border-[#DADCE0] transition-colors cursor-pointer flex items-center gap-1.5"
              title="Change Mission Analysis Date"
            >
              <Calendar className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span className="hidden sm:inline">{formattedDate}</span>
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
              className="w-9 h-9 rounded-xl bg-[#1A73E8] hover:bg-[#1565C0] text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
              title={isTimelinePlaying ? "Pause Simulation" : "Play Synodic Lunar Cycle (708 Hours)"}
            >
              {isTimelinePlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Speed Multiplier */}
            <button
              onClick={() => setPlaySpeed((s) => (s === 4 ? 12 : s === 12 ? 24 : 4))}
              className="px-2 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] text-xs font-mono border border-[#DADCE0] transition-colors cursor-pointer"
              title="Simulation Playback Speed"
            >
              {playSpeed}x
            </button>

            {/* Expand / Collapse Details Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
              title={isExpanded ? "Collapse Details" : "Expand Ephemeris & Solar Power Analysis"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Date Picker Popover */}
        {isDatePickerOpen && (
          <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#DADCE0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1A73E8]" />
              <span className="font-semibold text-[#202124]">Mission UTC Date:</span>
              <input
                type="date"
                value={missionDate ? missionDate.split("T")[0] : "2026-10-24"}
                onChange={(e) => {
                  setMissionDate(`${e.target.value}T12:00:00Z`);
                }}
                className="bg-white border border-[#DADCE0] rounded-lg px-2 py-1 text-xs text-[#202124] focus:outline-none focus:border-[#1A73E8]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLunarDayHour(0)}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#DADCE0] text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Dawn (0h)</span>
              </button>
              <button
                onClick={() => setIsDatePickerOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-[#1A73E8] text-white font-medium text-[11px] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Timeline Slider: Synodic Month (708.7 Hours) */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-[11px] font-mono text-[#5F6368] whitespace-nowrap">
            {formattedDate} · {formattedTime}
          </span>
          <input
            type="range"
            min="0"
            max="708"
            value={lunarDayHour}
            onChange={(e) => setLunarDayHour(Number(e.target.value))}
            className="flex-1 accent-[#1A73E8] h-1.5 bg-[#E8EAED] rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-[#5F6368] tabular-nums whitespace-nowrap">
            T+{lunarDayHour}h / 708h
          </span>
        </div>

        {/* ── EXPANDED SCIENTIFIC ANALYSIS (NASA Space Apps Requirements C, D, E) ── */}
        {isExpanded && (
          <div className="pt-2 border-t border-[#E8EAED] space-y-3 animate-fade-in text-xs">
            
            {/* Solar Panel Orientation Selector */}
            <div className="flex items-center justify-between bg-[#F8F9FA] rounded-xl p-2 px-3 border border-[#E8EAED]">
              <div className="flex items-center gap-1.5 text-xs text-[#5F6368]">
                <Sliders className="w-3.5 h-3.5 text-[#1A73E8]" />
                <span className="font-semibold text-[#202124]">Solar Array Configuration:</span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                {(["vertical", "horizontal", "tracking"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPanelOrientation(mode)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer capitalize ${
                      panelOrientation === mode
                        ? "bg-[#1A73E8] text-white font-semibold"
                        : "bg-white text-[#5F6368] border border-[#DADCE0] hover:bg-[#F1F3F4]"
                    }`}
                  >
                    {mode === "vertical" ? "Polar Vertical" : mode === "horizontal" ? "Flat Surface" : "Sun-Tracking"}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Quantitative Scientific Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              
              {/* 1. Solar Power Output */}
              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#5F6368] text-[11px] font-medium mb-1">
                    <Zap className="w-3.5 h-3.5 text-[#FBBC05]" />
                    <span>Est. Power Output</span>
                  </div>
                  <div className="text-base font-bold text-[#202124]">
                    {activeArrayWatts} W
                  </div>
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1">
                  Theoretical (2m² 28% GaInP/GaAs array)
                </span>
              </div>

              {/* 2. DSN Communication Link */}
              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#5F6368] text-[11px] font-medium mb-1">
                    <Radio className="w-3.5 h-3.5 text-[#1A73E8]" />
                    <span>DSN Link Margin</span>
                  </div>
                  <div className="text-base font-bold text-[#202124]">
                    {(ephemeris.rfLinkMarginDb ?? 0) > 0 ? `+${ephemeris.rfLinkMarginDb} dB` : `${ephemeris.rfLinkMarginDb ?? 0} dB`}
                  </div>
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1">
                  {ephemeris.isCommsViable ? "Nominal DSN link closure" : "Relay satellite required"}
                </span>
              </div>

              {/* 3. Solar / Earth Azimuth */}
              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#5F6368] text-[11px] font-medium mb-1">
                    <Compass className="w-3.5 h-3.5 text-[#34A853]" />
                    <span>Azimuth Bearings</span>
                  </div>
                  <div className="text-base font-bold text-[#202124] font-mono">
                    {ephemeris.sunAzimuthDeg}° / {ephemeris.earthAzimuthDeg}°
                  </div>
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1">
                  Sun Azimuth / Earth Azimuth
                </span>
              </div>

              {/* 4. Sunset / Night Transition */}
              <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[#5F6368] text-[11px] font-medium mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#EA4335]" />
                    <span>Illumination Window</span>
                  </div>
                  <div className="text-base font-bold text-[#202124]">
                    {ephemeris.isSunVisible ? `${ephemeris.timeToSunsetHours}h remaining` : "Night (0 W)"}
                  </div>
                </div>
                <span className="text-[10px] text-[#5F6368] mt-1">
                  {ephemeris.isSunVisible ? "Battery discharge threshold" : "Survival heater active"}
                </span>
              </div>
            </div>

            {/* Scientific Transparency Note */}
            <div className="flex items-start gap-1.5 text-[10px] text-[#5F6368] px-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#1A73E8] mt-0.5" />
              <span>
                Calculated using lunar spherical trigonometry, Moon obliquity (1.54°), and 708.73h synodic cycle. Geometric LOS assumes spherical horizon; local topography shadows are verified via LRO LOLA LDEM_1024.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EphemerisHorizonBar;

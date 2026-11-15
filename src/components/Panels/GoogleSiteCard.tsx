// ═══════════════════════════════════════════════════════════════════════
// GoogleSiteCard.tsx
// Google Maps-Style Place Details & Landing Site Assessment Card
// Minimalist, Map-First Interface in English with Full Scientific Transparency
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useMemo, useState } from "react";
import { useStore, LANDER_PRESETS } from "@/store";
import { computeSiteAssessment } from "@/data/assessment-engine";
import { computeHorizonEphemeris } from "@/data/ephemeris";
import {
  X,
  MapPin,
  Rocket,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Compass,
  ChevronDown,
  Info,
  Sun,
  Globe,
  Radio,
  Clock,
  Pentagon,
  Trash2,
  Mountain,
  Crosshair,
  ShieldCheck,
  Zap,
  Layers,
  Thermometer,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface GoogleSiteCardProps {
  onOpenReport: () => void;
  onOpenSimulator: () => void;
}

export const GoogleSiteCard: React.FC<GoogleSiteCardProps> = ({
  onOpenReport,
  onOpenSimulator,
}) => {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    selectedTarget,
    activeLander,
    setActiveLander,
    footprintRadiusKm,
    setFootprintRadiusKm,
    polygonStats,
    clearPolygon,
    lunarDayHour,
    viewMode,
    setViewMode,
    leftDetailPanelOpen,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"landing" | "horizon" | "power" | "sources">("landing");

  const assessment = useMemo(() => {
    return computeSiteAssessment(selectedTarget, activeLander, footprintRadiusKm);
  }, [selectedTarget, activeLander, footprintRadiusKm]);

  const ephemeris = useMemo(() => {
    return computeHorizonEphemeris(
      selectedTarget.lat,
      selectedTarget.lng,
      selectedTarget.elevationM,
      lunarDayHour
    );
  }, [selectedTarget, lunarDayHour]);

  if (!rightPanelOpen || leftDetailPanelOpen) return null;

  const isReject = assessment.classification === "CRITICAL HAZARD - REJECT";

  return (
    <div className="fixed top-[68px] right-4 bottom-5 z-40 w-96 max-w-[calc(100vw-2rem)] select-none font-sans pointer-events-none flex flex-col">
      <div className="pointer-events-auto bg-white rounded-3xl shadow-[0_8px_32px_rgba(60,64,67,0.18)] border border-[#E8EAED] flex flex-col h-full overflow-hidden animate-fade-in text-[#202124]">

        {/* Header & Location Title (Google Maps Clean Style) */}
        <div className="p-4 pb-3 border-b border-[#E8EAED] bg-white relative">
          <button
            onClick={() => setRightPanelOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
            title="Close Card"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-[#1A73E8] font-bold mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Lunar Landing Site Navigator</span>
          </div>

          <h2 className="text-base font-bold text-[#202124] leading-tight pr-8">
            {selectedTarget.name}
          </h2>

          <div className="flex items-center gap-2 mt-1 text-xs text-[#5F6368]">
            <span className="font-mono font-medium text-[#202124]">
              {selectedTarget.lat >= 0 ? `${selectedTarget.lat.toFixed(2)}°N` : `${Math.abs(selectedTarget.lat).toFixed(2)}°S`},{" "}
              {selectedTarget.lng >= 0 ? `${selectedTarget.lng.toFixed(2)}°E` : `${Math.abs(selectedTarget.lng).toFixed(2)}°W`}
            </span>
            <span>•</span>
            <span>Elev: {selectedTarget.elevationM} m</span>
          </div>

          {/* Overall Rating / Suitability Badge */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#202124]">
                {assessment.overallScore}
              </span>
              <span className="text-xs text-[#5F6368]">/ 100 Score</span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${isReject
                ? "bg-[#FCE8E6] text-[#D93025]"
                : assessment.overallScore >= 85
                  ? "bg-[#E6F4EA] text-[#137333]"
                  : "bg-[#FEF7E0] text-[#B06000]"
                }`}
            >
              {assessment.classification}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons (Google Style) */}
        <div className="px-4 py-3 border-b border-[#E8EAED] flex flex-col gap-2 bg-white">
          <div className="flex gap-2">
            <button
              onClick={onOpenSimulator}
              className="flex-1 bg-[#1A73E8] hover:bg-[#1565C0] text-white rounded-2xl py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              title="Plan Mission & Launch Trajectory Recommendation"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Plan Full Mission (Step 2)</span>
            </button>
            <button
              onClick={onOpenReport}
              className="bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#202124] border border-[#E8EAED] rounded-2xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#5F6368]" />
              <span>Briefing</span>
            </button>
          </div>

          <button
            onClick={() => setViewMode("surface")}
            className="w-full bg-[#F8F9FA] hover:bg-[#F1F3F4] text-[#202124] border border-[#E8EAED] rounded-2xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>3D Surface & Regolith Boulder Inspector</span>
          </button>
        </div>

        {/* Polygon Area Banner if active */}
        {polygonStats && (
          <div className="px-4 py-2 bg-[#FEE2E2] border-b border-[#FECACA] flex items-center justify-between text-xs text-[#B91C1C] animate-fade-in">
            <span className="font-bold flex items-center gap-1.5">
              <Pentagon className="w-3.5 h-3.5" />
              Custom Polygon Area ({polygonStats.pointCount} Pts)
            </span>
            <button
              onClick={clearPolygon}
              className="p-1 hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
              title="Clear Polygon"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Compact Navigation Tabs (CustomTkinter Category Style) */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-2 pt-1 gap-1">
          <button
            onClick={() => setActiveTab("landing")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === "landing"
              ? "border-[#0F172A] text-[#0F172A] bg-white rounded-t-xl"
              : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
          >
            Assessment
          </button>
          <button
            onClick={() => setActiveTab("horizon")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === "horizon"
              ? "border-[#0F172A] text-[#0F172A] bg-white rounded-t-xl"
              : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
          >
            Ephemeris
          </button>
          <button
            onClick={() => setActiveTab("power")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === "power"
              ? "border-[#0F172A] text-[#0F172A] bg-white rounded-t-xl"
              : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
          >
            Power & Comms
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === "sources"
              ? "border-[#0F172A] text-[#0F172A] bg-white rounded-t-xl"
              : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
          >
            Data Sources
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#0F172A] scrollbar-thin">

          {/* TAB 1: LANDING ASSESSMENT & HARD CONSTRAINTS */}
          {activeTab === "landing" && (
            <div className="space-y-4">

              {/* Lander Configuration Selector */}
              <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#64748B]">Spacecraft Profile:</span>
                  <span className="text-[#C2410C] font-bold">{activeLander.category}</span>
                </div>
                <select
                  value={activeLander.id}
                  onChange={(e) => {
                    const found = LANDER_PRESETS.find((l) => l.id === e.target.value);
                    if (found) setActiveLander(found);
                  }}
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] cursor-pointer"
                >
                  {LANDER_PRESETS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} (Max Slope: {l.maxSlopeDeg}°)
                    </option>
                  ))}
                </select>
              </div>

              {/* Hard Constraints Checklist */}
              <div>
                <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
                  Go / No-Go Hard Constraints
                </div>
                <div className="space-y-2">
                  {assessment.hardConstraints.map((hc) => (
                    <div
                      key={hc.id}
                      className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${hc.status === "pass"
                        ? "bg-[#DCFCE7]/40 border-[#BBF7D0]"
                        : hc.status === "caution"
                          ? "bg-[#FEF3C7]/40 border-[#FDE68A]"
                          : "bg-[#FEE2E2]/40 border-[#FECACA]"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F172A] text-xs">{hc.label}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${hc.status === "pass"
                            ? "bg-[#15803d] text-white"
                            : hc.status === "caution"
                              ? "bg-[#B45309] text-white"
                              : "bg-[#B91C1C] text-white"
                            }`}
                        >
                          {hc.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-[#64748B]">
                        <span>Measured: <strong className="text-[#0F172A]">{hc.measured}</strong></span>
                        <span>Limit: {hc.threshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MCDA Criteria Breakdown */}
              <div>
                <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
                  MCDA Quantitative Criteria
                </div>
                <div className="space-y-2">
                  {assessment.criteria.map((cr) => (
                    <div key={cr.id} className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0F172A]">{cr.name}</span>
                        <span className="font-mono font-bold text-[#0F172A]">{cr.score}/100</span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[#0F172A] rounded-full"
                          style={{ width: `${cr.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EPHEMERIS & SUN/EARTH POSITIONING */}
          {activeTab === "horizon" && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2.5">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                  Celestial Vectors at Horizon
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-[#E2E8F0]">
                    <div className="text-[#64748B] text-xs font-medium">Sun Elevation</div>
                    <div className="text-sm font-bold text-[#B45309] font-mono">
                      {ephemeris.sunElevationDeg > 0 ? `+${ephemeris.sunElevationDeg}°` : `${ephemeris.sunElevationDeg}°`}
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-[#E2E8F0]">
                    <div className="text-[#64748B] text-xs font-medium">Sun Azimuth</div>
                    <div className="text-sm font-bold text-[#0F172A] font-mono">
                      {ephemeris.sunAzimuthDeg}°
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-[#E2E8F0]">
                    <div className="text-[#64748B] text-xs font-medium">Earth Elevation</div>
                    <div className="text-sm font-bold text-[#0F172A] font-mono">
                      {ephemeris.earthElevationDeg > 0 ? `+${ephemeris.earthElevationDeg}°` : `${ephemeris.earthElevationDeg}°`}
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-[#E2E8F0]">
                    <div className="text-[#64748B] text-xs font-medium">Earth Azimuth</div>
                    <div className="text-sm font-bold text-[#0F172A] font-mono">
                      {ephemeris.earthAzimuthDeg}°
                    </div>
                  </div>
                </div>
              </div>

              {/* Illumination & Visibility Countdown */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                  Event Windows
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B] font-medium">Time to Sunset:</span>
                  <span className="font-bold text-[#0F172A]">
                    {ephemeris.isSunVisible ? `${ephemeris.timeToSunsetHours} hours` : "Night Condition"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B] font-medium">Earth Visibility:</span>
                  <span className="font-bold text-[#0F172A]">
                    {ephemeris.isEarthVisible ? "Permanent LOS (Tidally Locked)" : "Occluded (Far Side / Rim)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: POWER & COMMS (NASA Challenge Requirements D & E) */}
          {activeTab === "power" && (
            <div className="space-y-3.5">

              {/* Solar Power Model */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs text-[#0F172A] font-bold">
                  <Zap className="w-4 h-4 text-[#B45309]" />
                  <span>Solar Energy Generation Model</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-xl border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B] block">Polar Vertical</span>
                    <span className="font-bold text-[#0F172A] text-sm">{ephemeris.panelOrientationWatts?.vertical} W</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B] block">Flat Surface</span>
                    <span className="font-bold text-[#0F172A] text-sm">{ephemeris.panelOrientationWatts?.horizontal} W</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B] block">2-Axis Tracking</span>
                    <span className="font-bold text-[#C2410C] text-sm">{ephemeris.panelOrientationWatts?.tracking} W</span>
                  </div>
                </div>
              </div>

              {/* Direct-to-Earth (DTE) RF Communication */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-[#0F172A] font-bold">
                  <Radio className="w-4 h-4 text-[#0F172A]" />
                  <span>Direct-to-Earth (DTE) Telecommunications</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-medium">Geometric Line-of-Sight:</span>
                    <span className={ephemeris.isGeometricLOS ? "text-[#15803d] font-bold" : "text-[#B91C1C] font-bold"}>
                      {ephemeris.isGeometricLOS ? "Clear Horizon" : "Occluded"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-medium">DSN Link Margin (X-band):</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      {(ephemeris.rfLinkMarginDb ?? 0) > 0 ? `+${ephemeris.rfLinkMarginDb} dB` : `${ephemeris.rfLinkMarginDb ?? 0} dB`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-medium">Relay Satellite Mandate:</span>
                    <span className="text-[#64748B]">
                      {ephemeris.isCommsViable ? "Optional / Backup" : "Mandatory (e.g. Lunar Pathfinder)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SCIENTIFIC TRANSPARENCY & DATA SOURCES */}
          {activeTab === "sources" && (
            <div className="space-y-3">
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-[#0F172A] font-bold">
                  <BookOpen className="w-4 h-4 text-[#0F172A]" />
                  <span>NASA Planetary Data System Sources</span>
                </div>
                <div className="space-y-2 text-xs text-[#64748B]">
                  <div>
                    <strong className="text-[#0F172A]">Topography & Slopes:</strong> LRO LOLA Gridded Data Records (LDEM_1024, 30m/px resolution).
                  </div>
                  <div>
                    <strong className="text-[#0F172A]">Surface Morphology:</strong> LROC Wide Angle Camera (WAC) 100m/px Global Basemap.
                  </div>
                  <div>
                    <strong className="text-[#0F172A]">Volatiles / Hydrogen:</strong> LRO LEND Epithermal Neutron Flux (suppression index in PSRs).
                  </div>
                  <div>
                    <strong className="text-[#0F172A]">Celestial Ephemeris:</strong> NASA JPL Horizons / SPICE de440s planetary ephemeris.
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1.5 text-xs text-[#64748B]">
                <div className="font-bold text-[#0F172A]">Coordinate Reference Frame</div>
                <div>Lunar Mean Earth / Polar Axis (MOON_ME) per IAU/IAG Working Group Cartographic Coordinates (2015).</div>
                <div className="font-bold text-[#0F172A] pt-1">Time Standard</div>
                <div>Coordinated Universal Time (UTC) and Barycentric Dynamical Time (TDB).</div>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B] leading-relaxed">
                <strong>Notice:</strong> This analytical assessment platform is created for the NASA Space Apps Challenge 2026. Scientific metrics are computed using validated peer-reviewed models. Direct mission deployment requires certified Terrain Relative Navigation (TRN) validation.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSiteCard;

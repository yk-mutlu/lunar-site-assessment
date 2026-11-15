// ═══════════════════════════════════════════════════════════════════════
// SiteComparisonModal.tsx
// Multi-Site Landing Matrix & Trade-Off Comparison (Google Workspace / Sheets Style)
//
// NASA Space Apps Challenge Requirement F:
// Allows side-by-side evaluation of candidate landing locations across:
// - Solar illumination duration and elevation
// - Earth visibility and Deep Space Network communication opportunities
// - Estimated solar power potential
// - Slope profile and terrain hazards
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useMemo } from "react";
import { useStore, NOTABLE_TARGETS } from "@/store";
import { computeSiteAssessment } from "@/data/assessment-engine";
import { computeHorizonEphemeris } from "@/data/ephemeris";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Globe,
  Radio,
  Mountain,
  Layers,
  ArrowRight,
  Zap,
  ShieldCheck,
} from "lucide-react";

interface SiteComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SiteComparisonModal: React.FC<SiteComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    comparisonTargets,
    addComparisonTarget,
    removeComparisonTarget,
    setSelectedTarget,
    setRightPanelOpen,
    activeLander,
    footprintRadiusKm,
    lunarDayHour,
  } = useStore();

  const comparisons = useMemo(() => {
    return comparisonTargets.map((target) => {
      const assessment = computeSiteAssessment(target, activeLander, footprintRadiusKm);
      const ephemeris = computeHorizonEphemeris(
        target.lat,
        target.lng,
        target.elevationM,
        lunarDayHour
      );
      return {
        target,
        assessment,
        ephemeris,
      };
    });
  }, [comparisonTargets, activeLander, footprintRadiusKm, lunarDayHour]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in select-none font-sans">
      <div className="w-full max-w-5xl bg-white border border-[#E8EAED] rounded-2xl shadow-[0_12px_40px_rgba(60,64,67,0.25)] flex flex-col max-h-[90vh] overflow-hidden text-[#202124]">
        
        {/* Header Bar (Google Workspace Style) */}
        <div className="h-16 px-6 border-b border-[#E8EAED] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] flex items-center justify-center text-[#1A73E8]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#202124]">
                Multi-Site Landing Comparison Matrix
              </h2>
              <p className="text-xs text-[#5F6368]">
                Side-by-side trade-off analysis across illumination, power, comms, and slope hazards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Add Target Dropdown */}
            {comparisonTargets.length < 4 && (
              <select
                onChange={(e) => {
                  const found = NOTABLE_TARGETS.find((t) => t.id === e.target.value);
                  if (found) addComparisonTarget(found);
                  e.target.value = "";
                }}
                defaultValue=""
                className="text-xs bg-[#F8F9FA] border border-[#DADCE0] hover:border-[#1A73E8] rounded-xl px-3 py-1.5 text-[#202124] focus:outline-none cursor-pointer"
              >
                <option value="" disabled>
                  + Add Site to Compare...
                </option>
                {NOTABLE_TARGETS.filter(
                  (nt) => !comparisonTargets.some((ct) => ct.id === nt.id)
                ).map((nt) => (
                  <option key={nt.id} value={nt.id}>
                    {nt.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Grid Table */}
        <div className="flex-1 overflow-auto p-6 bg-[#F8F9FA]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisons.map(({ target, assessment, ephemeris }) => {
              const isReject = assessment.classification === "CRITICAL HAZARD - REJECT";
              const isNominal = assessment.overallScore >= 85;

              return (
                <div
                  key={target.id}
                  className="rounded-2xl border border-[#E8EAED] bg-white shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-4 bg-white border-b border-[#E8EAED] relative">
                    {comparisons.length > 1 && (
                      <button
                        onClick={() => removeComparisonTarget(target.id)}
                        className="absolute top-3.5 right-3 p-1 rounded-lg text-[#5F6368] hover:text-[#EA4335] hover:bg-[#FCE8E6] transition-colors cursor-pointer"
                        title="Remove from Comparison"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-[10px] font-semibold text-[#1A73E8] uppercase tracking-wider block">
                      {target.category || "Landing Site"}
                    </span>
                    <h3 className="text-sm font-semibold text-[#202124] mt-0.5 truncate pr-6">
                      {target.name}
                    </h3>
                    <div className="text-xs text-[#5F6368] font-mono mt-0.5">
                      {target.lat >= 0 ? `${target.lat.toFixed(2)}°N` : `${Math.abs(target.lat).toFixed(2)}°S`},{" "}
                      {target.lng >= 0 ? `${target.lng.toFixed(2)}°E` : `${Math.abs(target.lng).toFixed(2)}°W`}
                    </div>
                  </div>

                  {/* Body Metrics */}
                  <div className="p-4 space-y-3.5 flex-1 text-xs text-[#202124]">
                    {/* Overall Score */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
                      <span className="text-[#5F6368]">Suitability Score:</span>
                      <span className="text-base font-bold font-mono text-[#202124]">
                        {assessment.overallScore} / 100
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#5F6368]">Classification:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          isReject
                            ? "bg-[#FCE8E6] text-[#EA4335]"
                            : isNominal
                            ? "bg-[#E6F4EA] text-[#34A853]"
                            : "bg-[#FEF7E0] text-[#FBBC05]"
                        }`}
                      >
                        {isReject ? "Reject" : isNominal ? "Class A" : "Class B"}
                      </span>
                    </div>

                    {/* Solar Illumination Uptime */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5F6368] flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-[#FBBC05]" />
                          Solar Illumination:
                        </span>
                        <span className="font-semibold text-[#202124] font-mono">
                          {assessment.solarUptimePct}%
                        </span>
                      </div>
                      <div className="w-full bg-[#E8EAED] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#FBBC05] rounded-full"
                          style={{ width: `${assessment.solarUptimePct}%` }}
                        />
                      </div>
                    </div>

                    {/* Solar Elevation Now */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#5F6368]">Current Solar Elev:</span>
                      <span className="font-semibold text-[#202124] font-mono">
                        {ephemeris.sunElevationDeg > 0 ? `+${ephemeris.sunElevationDeg}°` : `${ephemeris.sunElevationDeg}°`}
                      </span>
                    </div>

                    {/* Estimated Solar Power Output */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#5F6368] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-[#FBBC05]" />
                        Est. Power (Vertical):
                      </span>
                      <span className="font-semibold text-[#202124] font-mono">
                        {ephemeris.panelOrientationWatts?.vertical} W
                      </span>
                    </div>

                    {/* Earth Visibility & DSN Comms */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#5F6368] flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5 text-[#1A73E8]" />
                        DSN Direct LOS:
                      </span>
                      <span
                        className={`font-semibold font-mono ${
                          ephemeris.isCommsViable ? "text-[#34A853]" : "text-[#EA4335]"
                        }`}
                      >
                        {ephemeris.isCommsViable ? `+${ephemeris.rfLinkMarginDb} dB` : "Occluded"}
                      </span>
                    </div>

                    {/* Touchdown Slope */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#5F6368] flex items-center gap-1">
                        <Mountain className="w-3.5 h-3.5 text-[#5F6368]" />
                        Slope Gradient:
                      </span>
                      <span
                        className={`font-semibold font-mono ${
                          assessment.hardConstraints[0].status === "pass"
                            ? "text-[#34A853]"
                            : "text-[#EA4335]"
                        }`}
                      >
                        {assessment.criteria[0].value}
                      </span>
                    </div>

                    {/* Water Ice Proximity */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#5F6368]">Water Ice (PSR):</span>
                      <span className="font-semibold text-[#1A73E8] font-mono">
                        {assessment.waterIceProbabilityPct}%
                      </span>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="p-3 border-t border-[#E8EAED] bg-[#F8F9FA]">
                    <button
                      onClick={() => {
                        setSelectedTarget(target);
                        setRightPanelOpen(true);
                        onClose();
                      }}
                      className="w-full bg-white hover:bg-[#E8F0FE] text-[#1A73E8] hover:text-[#1565C0] border border-[#DADCE0] hover:border-[#1A73E8] py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Select This Target</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 border-t border-[#E8EAED] bg-white flex flex-col sm:flex-row items-center justify-between text-xs text-[#5F6368] gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#34A853]" />
            <span>Comparison metrics derived from NASA LRO LOLA and JPL Horizons astronomical models.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#F1F3F4] hover:bg-[#E8EAED] text-[#202124] font-medium transition-colors cursor-pointer"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteComparisonModal;

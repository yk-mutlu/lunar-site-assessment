// ═══════════════════════════════════════════════════════════════════════
// SafeSiteDetailPanel.tsx
// Left-Side Detailed Landing Site Assessment Panel
// 10 Scientific Sub-Criteria, Decimal Scores / 10, Transparent Formulations
// ═══════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { useStore, LANDER_PRESETS } from "@/store";
import type { CandidateSite, CriterionScore } from "@/data/site-scoring-types";
import { recomputeSiteForLander } from "@/data/site-detection";
import {
  X,
  MapPin,
  Rocket,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  Sun,
  Radio,
  Mountain,
  Compass,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

interface SafeSiteDetailPanelProps {
  onOpenReport?: () => void;
  onSimulateSite?: (site: CandidateSite) => void;
  onReturnToOverview?: () => void;
}

export const SafeSiteDetailPanel: React.FC<SafeSiteDetailPanelProps> = ({
  onOpenReport,
  onSimulateSite,
  onReturnToOverview,
}) => {
  const {
    leftDetailPanelOpen,
    setLeftDetailPanelOpen,
    selectedCandidateSite,
    setSelectedCandidateSite,
    activeLander,
    setActiveLander,
    detectedSites,
    setDetectedSites,
    sunElevationDeg,
    sunAzimuthDeg,
    siteSimulationResults,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"scores" | "criteria" | "environment">("scores");
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({
    slope: true, // Slope expanded by default
  });

  if (!leftDetailPanelOpen || !selectedCandidateSite) return null;

  // Reactively recompute site scores against current lander
  const site = recomputeSiteForLander(selectedCandidateSite, activeLander);

  const toggleExpand = (id: string) => {
    setExpandedCriteria((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLanderChange = (landerId: string) => {
    const newLander = LANDER_PRESETS.find((l) => l.id === landerId);
    if (!newLander) return;
    setActiveLander(newLander);

    // Update all detected sites with new lander tolerances
    if (detectedSites.length > 0) {
      const updated = detectedSites.map((s) => recomputeSiteForLander(s, newLander));
      setDetectedSites(updated);
      const cur = updated.find((s) => s.id === site.id);
      if (cur) setSelectedCandidateSite(cur);
    }
  };

  const handleSimulateClick = () => {
    // Construct rich payload for future Landing Simulation integration
    const simulationPayload = {
      id: site.id,
      name: site.name,
      code: site.code,
      coordinates: site.geoCoord,
      elevation: site.elevationM,
      measuredSlope: site.measuredSlopeDeg,
      maxSlope: site.maxSlopeDeg,
      sunAngles: {
        elevationDeg: sunElevationDeg,
        azimuthDeg: sunAzimuthDeg,
      },
      scores: site.scores,
      overallScore: site.overallScore,
      selectedLander: activeLander,
      timestamp: new Date().toISOString(),
    };

    // Emit custom event for decoupling
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("lunar-simulate-landing-request", {
          detail: simulationPayload,
        })
      );
    }

    if (onSimulateSite) {
      onSimulateSite(site);
    }
  };

  // Color mapping based on score
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-[#34c759]";
    if (score >= 7.0) return "text-[#38bdf8]";
    if (score >= 5.5) return "text-[#f59e0b]";
    return "text-[#d86c6c]";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8.5) return "bg-[#34c759]";
    if (score >= 7.0) return "bg-[#38bdf8]";
    if (score >= 5.5) return "bg-[#f59e0b]";
    return "bg-[#d86c6c]";
  };

  return (
    <div className="fixed top-[124px] left-4 bottom-6 z-40 w-[420px] max-w-[calc(100vw-2rem)] select-none font-sans pointer-events-none flex flex-col animate-fade-in">
      <div className="pointer-events-auto bg-white rounded-3xl shadow-[0_8px_32px_rgba(15,23,42,0.12)] border border-[#E2E8F0] flex flex-col h-full overflow-hidden text-[#0F172A]">
        {/* Header Bar */}
        <div className="p-4 pb-3 border-b border-[#E2E8F0] bg-white relative">
          <button
            onClick={() => {
              setLeftDetailPanelOpen(false);
              if (onReturnToOverview) onReturnToOverview();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold mb-1">
            <span className="px-2.5 py-1 rounded-xl bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] font-mono">
              {site.code}
            </span>
            <span className="text-[#64748B] text-xs uppercase tracking-wider">Assessment Report</span>
          </div>

          <h2 className="text-base font-bold text-[#0F172A] leading-tight pr-8">
            {site.name}
          </h2>

          <div className="flex items-center gap-2 mt-1 text-xs text-[#64748B]">
            <span className="font-mono font-medium text-[#0F172A]">
              {site.geoCoord.lat >= 0 ? `${site.geoCoord.lat}°N` : `${Math.abs(site.geoCoord.lat)}°S`},{" "}
              {site.geoCoord.lng >= 0 ? `${site.geoCoord.lng}°E` : `${Math.abs(site.geoCoord.lng)}°W`}
            </span>
            <span>•</span>
            <span>Elevation: {site.elevationM} m</span>
          </div>

          <p className="text-xs text-[#64748B] mt-2.5 leading-relaxed bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
            {site.reason}
          </p>

          {/* Overall Score Gauge & Badge */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E2E8F0]">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tracking-tight ${getScoreColor(site.overallScore)}`}>
                {site.overallScore.toFixed(1)}
              </span>
              <span className="text-xs text-[#64748B]">/ 10.0 Pts</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#F8FAFC] border border-[#E2E8F0]">
              <span
                className={`w-2.5 h-2.5 rounded-full ${site.overallScore >= 8.5
                  ? "bg-[#15803d]"
                  : site.overallScore >= 7.0
                    ? "bg-[#0F172A]"
                    : site.overallScore >= 5.5
                      ? "bg-[#B45309]"
                      : "bg-[#B91C1C]"
                  }`}
              />
              <span className={getScoreColor(site.overallScore)}>
                {site.suitabilityLabel}
              </span>
            </div>
          </div>

          {/* Last Simulation Result Badge & Metrics (if simulated) */}
          {siteSimulationResults[site.id] && (
            <div
              className={`mt-3 p-3 rounded-2xl border text-xs space-y-1 animate-fade-in ${siteSimulationResults[site.id].success
                ? "bg-[#DCFCE7] border-[#86EFAC] text-[#15803d]"
                : "bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]"
                }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {siteSimulationResults[site.id].success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
                  )}
                  <span>
                    Simulation: {siteSimulationResults[site.id].success ? "PASSED" : "FAILED"}
                  </span>
                </span>
                <span className="text-xs font-mono">
                  Vz: {siteSimulationResults[site.id].touchdownVelocityMs.toFixed(1)} m/s
                </span>
              </div>
              <p className="text-xs text-[#64748B] leading-tight">
                {siteSimulationResults[site.id].cause}
              </p>
            </div>
          )}
        </div>

        {/* Primary Action Button: Simulate Landing */}
        <div className="p-3 border-b border-[#E2E8F0] bg-white flex gap-2">
          <button
            onClick={handleSimulateClick}
            className="flex-1 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-2xl py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
            title="Launch Earth Liftoff & Lunar Descent Simulation"
          >
            <Rocket className="w-4 h-4 fill-current" />
            <span>Mission Simulation</span>
          </button>

          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#CBD5E1] rounded-2xl py-3 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Full Scientific Briefing Report"
            >
              <FileText className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Briefing</span>
            </button>
          )}
        </div>

        {/* Vehicle Tolerance Profile Selector */}
        <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-[#64748B] font-medium">Active Lander Tolerance:</span>
            <span className="font-bold text-[#0F172A]">{activeLander.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LANDER_PRESETS.slice(0, 2).map((l) => (
              <button
                key={l.id}
                onClick={() => handleLanderChange(l.id)}
                className={`py-2 px-3 rounded-2xl text-left border text-xs font-medium transition-all ${activeLander.id === l.id
                  ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm font-semibold"
                  : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
                  }`}
              >
                <div className="font-bold text-xs">{l.name.split(" ")[0]}</div>
                <div className={`text-xs ${activeLander.id === l.id ? "text-slate-200" : "text-[#64748B]"}`}>Limit: {l.maxSlopeDeg}° slope</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2E8F0] bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab("scores")}
            className={`flex-1 py-3 text-center transition-colors relative cursor-pointer ${activeTab === "scores"
              ? "text-[#0F172A] font-bold border-b-2 border-[#0F172A]"
              : "text-[#64748B] hover:text-[#0F172A]"
              }`}
          >
            10 Sub-Criteria
          </button>
          <button
            onClick={() => setActiveTab("criteria")}
            className={`flex-1 py-3 text-center transition-colors relative cursor-pointer ${activeTab === "criteria"
              ? "text-[#0F172A] font-bold border-b-2 border-[#0F172A]"
              : "text-[#64748B] hover:text-[#0F172A]"
              }`}
          >
            Weights & Formulas
          </button>
          <button
            onClick={() => setActiveTab("environment")}
            className={`flex-1 py-3 text-center transition-colors relative cursor-pointer ${activeTab === "environment"
              ? "text-[#0F172A] font-bold border-b-2 border-[#0F172A]"
              : "text-[#64748B] hover:text-[#0F172A]"
              }`}
          >
            GO / NO-GO
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs bg-white">
          {activeTab === "scores" && (
            <div className="space-y-3">
              {Object.values(site.scores).map((crit: CriterionScore, idx) => {
                const isExp = expandedCriteria[crit.id] || false;
                return (
                  <div
                    key={crit.id}
                    className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors"
                  >
                    <div
                      onClick={() => toggleExpand(crit.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#64748B] font-bold">#{idx + 1}</span>
                        <span className="font-bold text-xs text-[#0F172A]">{crit.name}</span>
                        {crit.isProxy && (
                          <span className="px-2 py-0.5 rounded-md text-xs bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1] font-mono">
                            proxy
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${getScoreColor(crit.score)}`}>
                          {crit.score.toFixed(1)}
                        </span>
                        <span className="text-[#64748B] text-xs">/10</span>
                        {isExp ? <ChevronUp className="w-4 h-4 text-[#64748B]" /> : <ChevronDown className="w-4 h-4 text-[#64748B]" />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full ${getScoreBg(crit.score)} transition-all duration-300`}
                        style={{ width: `${(crit.score / 10) * 100}%` }}
                      />
                    </div>

                    {/* Measurement line */}
                    <div className="text-xs text-[#64748B] mt-2 flex justify-between font-medium">
                      <span>{crit.measuredValueStr}</span>
                      <span className="font-mono">Weight: %{(crit.weight * 100).toFixed(0)}</span>
                    </div>

                    {/* Expanded details & transparent scientific formula */}
                    {isExp && (
                      <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] text-xs space-y-2 animate-fade-in">
                        <div className="bg-white p-2.5 rounded-xl border border-[#E2E8F0] font-mono text-xs text-[#0F172A]">
                          <span className="text-[#64748B] block text-xs font-sans font-semibold">Scientific Formulation / Logic:</span>
                          {crit.formulaRationale}
                        </div>
                        <p className="text-[#64748B] leading-relaxed">{crit.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "criteria" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                <span className="font-bold text-[#0F172A] flex items-center gap-2 text-xs">
                  <Scale className="w-4 h-4 text-[#C2410C]" />
                  MCDA Scientific Assessment Weights
                </span>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Scoring is weighted according to NASA Artemis Landing Site Criteria handbook. Terrain slope holds highest weighting (22%).
                </p>
              </div>

              <div className="space-y-2">
                {Object.values(site.scores).map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#0F172A] block">{c.name}</span>
                      <span className="text-xs text-[#64748B]">{c.isProxy ? "Analytical Proxy Model" : "LOLA DEM / LROC Measurement"}</span>
                    </div>
                    <span className="font-mono font-bold text-[#C2410C]">
                      %{(c.weight * 100).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "environment" && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                Mandatory Flight Safety Rules (Hard Constraints)
              </span>

              {/* Slope GO / NO-GO */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${site.goNoGo.slopePass ? "bg-[#DCFCE7] border-[#86EFAC]" : "bg-[#FEE2E2] border-[#FECACA]"
                }`}>
                {site.goNoGo.slopePass ? <ShieldCheck className="w-5 h-5 text-[#15803d] shrink-0" /> : <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0F172A]">Maximum Terrain Slope</span>
                    <span className={`text-xs font-bold font-mono ${site.goNoGo.slopePass ? "text-[#15803d]" : "text-[#B91C1C]"}`}>
                      {site.goNoGo.slopePass ? "GO (PASS)" : "NO-GO (FAIL)"}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Measured slope {site.measuredSlopeDeg}° • Vehicle limit {activeLander.maxSlopeDeg}°
                  </p>
                </div>
              </div>

              {/* Flat Area Diameter GO / NO-GO */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${site.goNoGo.flatDiameterPass ? "bg-[#DCFCE7] border-[#86EFAC]" : "bg-[#FEE2E2] border-[#FECACA]"
                }`}>
                {site.goNoGo.flatDiameterPass ? <ShieldCheck className="w-5 h-5 text-[#15803d] shrink-0" /> : <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0F172A]">Continuous Flat Corridor</span>
                    <span className={`text-xs font-bold font-mono ${site.goNoGo.flatDiameterPass ? "text-[#15803d]" : "text-[#B91C1C]"}`}>
                      {site.goNoGo.flatDiameterPass ? "GO (PASS)" : "NO-GO (FAIL)"}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Measured flat diameter {site.flatDiameterM} m • Required {activeLander.footprintDiameterM * 2.5} m
                  </p>
                </div>
              </div>

              {/* Earth Communication GO / NO-GO */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${site.goNoGo.earthLOSPass ? "bg-[#DCFCE7] border-[#86EFAC]" : "bg-[#FEE2E2] border-[#FECACA]"
                }`}>
                {site.goNoGo.earthLOSPass ? <ShieldCheck className="w-5 h-5 text-[#15803d] shrink-0" /> : <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0F172A]">Direct DSN Communication</span>
                    <span className={`text-xs font-bold font-mono ${site.goNoGo.earthLOSPass ? "text-[#15803d]" : "text-[#B91C1C]"}`}>
                      {site.goNoGo.earthLOSPass ? "GO (PASS)" : "RELAY REQUIRED"}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    {site.earthLOS ? "Unobstructed line-of-sight to Earth, no orbital relay required." : "Lunar horizon obstruction present, orbital relay constellation mandatory."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

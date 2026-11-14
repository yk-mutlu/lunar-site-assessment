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
    <div className="fixed top-20 left-4 bottom-6 z-40 w-[420px] max-w-[calc(100vw-2rem)] select-none font-sans pointer-events-none flex flex-col animate-fade-in">
      <div className="pointer-events-auto bg-[#181a20]/95 backdrop-blur-md rounded-3xl shadow-tesla border border-[#282a33] flex flex-col h-full overflow-hidden text-[#f4f4f6]">
        {/* Header Bar */}
        <div className="p-4 pb-3 border-b border-[#282a33] bg-[#14151a] relative">
          <button
            onClick={() => {
              setLeftDetailPanelOpen(false);
              if (onReturnToOverview) onReturnToOverview();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#9496a1] hover:text-[#f4f4f6] hover:bg-[#22242c] transition-colors cursor-pointer"
            title="Paneli Kapat"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold mb-1">
            <span className="px-2 py-0.5 rounded-full bg-[#d86c6c]/20 text-[#d86c6c] border border-[#d86c6c]/30 font-mono">
              {site.code}
            </span>
            <span className="text-[#9496a1] text-[11px]">AY İNİŞ SAHASI DETAY RAPORU</span>
          </div>

          <h2 className="text-xl font-bold text-[#f4f4f6] leading-tight pr-8">
            {site.name}
          </h2>

          <div className="flex items-center gap-2 mt-1 text-xs text-[#9496a1]">
            <span className="font-mono text-[#f4f4f6]">
              {site.geoCoord.lat >= 0 ? `${site.geoCoord.lat}°K` : `${Math.abs(site.geoCoord.lat)}°G`},{" "}
              {site.geoCoord.lng >= 0 ? `${site.geoCoord.lng}°D` : `${Math.abs(site.geoCoord.lng)}°B`}
            </span>
            <span>•</span>
            <span>Rakım: {site.elevationM} m</span>
          </div>

          <p className="text-[11px] text-[#9496a1] mt-2 leading-relaxed bg-[#121317] p-2.5 rounded-xl border border-[#22242c]">
            {site.reason}
          </p>

          {/* Overall Score Gauge & Badge */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#282a33]">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${getScoreColor(site.overallScore)}`}>
                {site.overallScore.toFixed(1)}
              </span>
              <span className="text-xs text-[#9496a1] font-mono">/ 10.0 Puan</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#22242c] border border-[#282a33]">
              <span
                className={`w-2 h-2 rounded-full ${
                  site.suitabilityLabel === "Mükemmel"
                    ? "bg-[#34c759]"
                    : site.suitabilityLabel === "Çok İyi"
                    ? "bg-[#38bdf8]"
                    : site.suitabilityLabel === "Orta"
                    ? "bg-[#f59e0b]"
                    : "bg-[#d86c6c]"
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
              className={`mt-3 p-2.5 rounded-2xl border text-xs space-y-1 animate-fade-in ${
                siteSimulationResults[site.id].success
                  ? "bg-[#34c759]/15 border-[#34c759]/40 text-[#34c759]"
                  : "bg-[#d86c6c]/15 border-[#d86c6c]/40 text-[#d86c6c]"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {siteSimulationResults[site.id].success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#d86c6c]" />
                  )}
                  <span>
                    Son Simülasyon: {siteSimulationResults[site.id].success ? "BAŞARILI" : "BAŞARISIZ"}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-[#f4f4f6]">
                  Vz: {siteSimulationResults[site.id].touchdownVelocityMs.toFixed(1)} m/s
                </span>
              </div>
              <p className="text-[10px] text-[#f4f4f6]/90 leading-tight">
                {siteSimulationResults[site.id].cause}
              </p>
            </div>
          )}
        </div>

        {/* Primary Action Button: Simulate Landing */}
        <div className="p-3 border-b border-[#282a33] bg-[#121317] flex gap-2">
          <button
            onClick={handleSimulateClick}
            className="flex-1 bg-[#d86c6c] hover:bg-[#c55a5a] text-white rounded-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
          >
            <Rocket className="w-4 h-4 fill-current" />
            <span>İnişi Simüle Et</span>
          </button>

          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="bg-[#22242c] hover:bg-[#2c2f3a] text-[#f4f4f6] border border-[#282a33] rounded-full py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Tam Bilimsel Brifing Raporu"
            >
              <FileText className="w-3.5 h-3.5 text-[#9496a1]" />
              <span>Rapor</span>
            </button>
          )}
        </div>

        {/* Vehicle Tolerance Profile Selector */}
        <div className="px-4 py-2.5 border-b border-[#282a33] bg-[#14151a]">
          <div className="flex items-center justify-between mb-1.5 text-[11px]">
            <span className="text-[#9496a1]">Aktif İniş Aracı Toleransı:</span>
            <span className="font-bold text-[#f4f4f6]">{activeLander.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {LANDER_PRESETS.slice(0, 2).map((l) => (
              <button
                key={l.id}
                onClick={() => handleLanderChange(l.id)}
                className={`py-1.5 px-2 rounded-xl text-left border text-[11px] font-medium transition-all ${
                  activeLander.id === l.id
                    ? "bg-[#d86c6c]/15 border-[#d86c6c] text-[#f4f4f6]"
                    : "bg-[#181a20] border-[#282a33] text-[#9496a1] hover:border-[#383a46]"
                }`}
              >
                <div className="font-semibold text-xs">{l.name.split(" ")[0]}</div>
                <div className="text-[10px] text-[#9496a1]">Eşik: {l.maxSlopeDeg}° eğim</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#282a33] bg-[#14151a] text-xs font-medium">
          <button
            onClick={() => setActiveTab("scores")}
            className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
              activeTab === "scores"
                ? "text-[#d86c6c] font-semibold border-b-2 border-[#d86c6c]"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            10 Alt Kriter
          </button>
          <button
            onClick={() => setActiveTab("criteria")}
            className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
              activeTab === "criteria"
                ? "text-[#d86c6c] font-semibold border-b-2 border-[#d86c6c]"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            Ağırlıklar & Formüller
          </button>
          <button
            onClick={() => setActiveTab("environment")}
            className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
              activeTab === "environment"
                ? "text-[#d86c6c] font-semibold border-b-2 border-[#d86c6c]"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            GO / NO-GO
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
          {activeTab === "scores" && (
            <div className="space-y-2.5">
              {Object.values(site.scores).map((crit: CriterionScore, idx) => {
                const isExp = expandedCriteria[crit.id] || false;
                return (
                  <div
                    key={crit.id}
                    className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] hover:border-[#383a46] transition-colors"
                  >
                    <div
                      onClick={() => toggleExpand(crit.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#9496a1]">#{idx + 1}</span>
                        <span className="font-semibold text-xs text-[#f4f4f6]">{crit.name}</span>
                        {crit.isProxy && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#282a33] text-[#9496a1] border border-[#383a46]">
                            proxy
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${getScoreColor(crit.score)}`}>
                          {crit.score.toFixed(1)}
                        </span>
                        <span className="text-[#9496a1] text-[10px]">/10</span>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5 text-[#9496a1]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#9496a1]" />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-[#22242c] rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full ${getScoreBg(crit.score)} transition-all duration-300`}
                        style={{ width: `${(crit.score / 10) * 100}%` }}
                      />
                    </div>

                    {/* Measurement line */}
                    <div className="text-[11px] text-[#9496a1] mt-1.5 flex justify-between">
                      <span>{crit.measuredValueStr}</span>
                      <span className="text-[10px] font-mono opacity-80">Ağırlık: %{(crit.weight * 100).toFixed(0)}</span>
                    </div>

                    {/* Expanded details & transparent scientific formula */}
                    {isExp && (
                      <div className="mt-2.5 pt-2 border-t border-[#22242c] text-[11px] space-y-1.5 animate-fade-in">
                        <div className="bg-[#181a20] p-2 rounded-xl border border-[#282a33] font-mono text-[10px] text-[#38bdf8]">
                          <span className="text-[#9496a1] block text-[9px] font-sans">Bilimsel Formül / Mantık:</span>
                          {crit.formulaRationale}
                        </div>
                        <p className="text-[#9496a1] leading-relaxed">{crit.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "criteria" && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[rgba(216,108,108,0.08)] border border-[rgba(216,108,108,0.25)] space-y-1">
                <span className="font-bold text-[#d86c6c] flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  MCDA Bilimsel Değerlendirme Ağırlıkları
                </span>
                <p className="text-[11px] text-[#9496a1] leading-relaxed">
                  Puanlama, NASA Artemis İniş Alanı Kriterleri el kitabına uygun olarak ağırlıklandırılmıştır. Zemin eğimi en yüksek ağırlığa (%22) sahiptir.
                </p>
              </div>

              <div className="space-y-2">
                {Object.values(site.scores).map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-[#121317] border border-[#282a33] flex justify-between items-center text-xs">
                    <div>
                      <span className="font-medium text-[#f4f4f6] block">{c.name}</span>
                      <span className="text-[10px] text-[#9496a1]">{c.isProxy ? "Analitik Proxy Modeli" : "LOLA DEM / LROC Ölçümü"}</span>
                    </div>
                    <span className="font-mono font-bold text-[#d86c6c]">
                      %{(c.weight * 100).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "environment" && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-[#9496a1] uppercase tracking-wider block">
                Zorunlu Güvenlik Kriterleri (Hard Constraints)
              </span>

              {/* Slope GO / NO-GO */}
              <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                site.goNoGo.slopePass ? "bg-[#34c759]/10 border-[#34c759]/30" : "bg-[#d86c6c]/10 border-[#d86c6c]/30"
              }`}>
                {site.goNoGo.slopePass ? <ShieldCheck className="w-5 h-5 text-[#34c759] shrink-0" /> : <ShieldAlert className="w-5 h-5 text-[#d86c6c] shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#f4f4f6]">Maksimum Zemin Eğimi</span>
                    <span className={`text-[10px] font-bold font-mono ${site.goNoGo.slopePass ? "text-[#34c759]" : "text-[#d86c6c]"}`}>
                      {site.goNoGo.slopePass ? "GO (ONAY)" : "NO-GO (RED)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9496a1] mt-0.5">
                    Ölçülen eğim {site.measuredSlopeDeg}° • Araç limiti {activeLander.maxSlopeDeg}°
                  </p>
                </div>
              </div>

              {/* Flat Area Diameter GO / NO-GO */}
              <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                site.goNoGo.flatDiameterPass ? "bg-[#34c759]/10 border-[#34c759]/30" : "bg-[#d86c6c]/10 border-[#d86c6c]/30"
              }`}>
                {site.goNoGo.flatDiameterPass ? <ShieldCheck className="w-5 h-5 text-[#34c759] shrink-0" /> : <ShieldAlert className="w-5 h-5 text-[#d86c6c] shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#f4f4f6]">Düz Güvenli İniş Koridoru</span>
                    <span className={`text-[10px] font-bold font-mono ${site.goNoGo.flatDiameterPass ? "text-[#34c759]" : "text-[#d86c6c]"}`}>
                      {site.goNoGo.flatDiameterPass ? "GO (ONAY)" : "NO-GO (RED)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9496a1] mt-0.5">
                    Ölçülen düz çap {site.flatDiameterM} m • Gerekli {activeLander.footprintDiameterM * 2.5} m
                  </p>
                </div>
              </div>

              {/* Earth Communication GO / NO-GO */}
              <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                site.goNoGo.earthLOSPass ? "bg-[#34c759]/10 border-[#34c759]/30" : "bg-[#d86c6c]/10 border-[#d86c6c]/30"
              }`}>
                {site.goNoGo.earthLOSPass ? <ShieldCheck className="w-5 h-5 text-[#34c759] shrink-0" /> : <ShieldAlert className="w-5 h-5 text-[#d86c6c] shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#f4f4f6]">Doğrudan DSN İletişimi</span>
                    <span className={`text-[10px] font-bold font-mono ${site.goNoGo.earthLOSPass ? "text-[#34c759]" : "text-[#d86c6c]"}`}>
                      {site.goNoGo.earthLOSPass ? "GO (ONAY)" : "RÖLE GEREKLİ"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9496a1] mt-0.5">
                    {site.earthLOS ? "Dünya doğrudan görüş hattında, röle gerekmez." : "Ay ufku engeli var, röle takımyıldızı zorunludur."}
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

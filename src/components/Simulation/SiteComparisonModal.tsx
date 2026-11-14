"use client";

import React, { useMemo } from "react";
import { useStore, NOTABLE_TARGETS } from "@/store";
import { computeSiteAssessment } from "@/data/assessment-engine";
import { computeHorizonEphemeris } from "@/data/ephemeris";
import type { LunarTarget } from "@/types";
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
  Droplets,
  Layers,
  ArrowRight,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none font-sans">
      <div className="w-full max-w-5xl bg-[#181a20] border border-[#282a33] rounded-3xl shadow-tesla flex flex-col max-h-[90vh] overflow-hidden text-[#f4f4f6]">
        {/* Header */}
        <div className="h-16 px-6 border-b border-[#282a33] flex items-center justify-between bg-[#14151a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[rgba(216,108,108,0.15)] flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#d86c6c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f4f4f6]">
                Çoklu İniş Sahası Yan Yana Karşılaştırma Matrisi
              </h2>
              <p className="text-xs text-[#9496a1]">
                NASA Artemis III ve CLPS iniş opsiyonları, aydınlatma ve DTE iletişim ticari dengeleri
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
                className="text-xs bg-[#22242c] border border-[#282a33] rounded-full px-3 py-1.5 text-[#f4f4f6] focus:outline-none cursor-pointer"
              >
                <option value="" disabled className="bg-[#181a20]">
                  + Saha Ekle...
                </option>
                {NOTABLE_TARGETS.filter(
                  (nt) => !comparisonTargets.some((ct) => ct.id === nt.id)
                ).map((nt) => (
                  <option key={nt.id} value={nt.id} className="bg-[#181a20] text-[#f4f4f6]">
                    {nt.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9496a1] hover:text-[#f4f4f6] hover:bg-[#22242c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison Grid Table */}
        <div className="flex-1 overflow-auto p-6 bg-[#181a20]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisons.map(({ target, assessment, ephemeris }) => {
              const isReject = assessment.classification === "CRITICAL HAZARD - REJECT";
              return (
                <div
                  key={target.id}
                  className="rounded-2xl border border-[#282a33] bg-[#121317] shadow-sm flex flex-col overflow-hidden hover:border-[#3a3d4a] transition-all"
                >
                  {/* Card Header */}
                  <div className="p-4 bg-[#14151a] border-b border-[#282a33] relative">
                    {comparisons.length > 1 && (
                      <button
                        onClick={() => removeComparisonTarget(target.id)}
                        className="absolute top-3 right-3 p-1 rounded-full text-[#9496a1] hover:text-[#d86c6c] transition-colors cursor-pointer"
                        title="Karşılaştırmadan Kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-[10px] font-semibold text-[#d86c6c] uppercase tracking-wider block">
                      {target.category || "İniş Sahası"}
                    </span>
                    <h3 className="text-sm font-bold text-[#f4f4f6] mt-0.5 truncate pr-6">
                      {target.name}
                    </h3>
                    <div className="text-xs text-[#9496a1] font-mono mt-1">
                      {target.lat.toFixed(2)}°, {target.lng.toFixed(2)}°
                    </div>
                  </div>

                  {/* Body Metrics */}
                  <div className="p-4 space-y-3.5 flex-1 text-xs">
                    {/* Overall Score */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#282a33]">
                      <span className="text-[#9496a1]">Genel İniş Skoru:</span>
                      <span className="text-base font-bold font-mono text-[#f4f4f6]">
                        {assessment.overallScore} / 100
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-[#9496a1]">Durum:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isReject
                            ? "bg-[rgba(216,108,108,0.15)] text-[#d86c6c]"
                            : "bg-[rgba(52,199,89,0.15)] text-[#34c759]"
                        }`}
                      >
                        {isReject ? "KABUL EDİLEMEZ" : "UYGUN"}
                      </span>
                    </div>

                    {/* Slope & Roughness */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[#9496a1]">
                        <span className="flex items-center gap-1">
                          <Mountain className="w-3 h-3 text-[#9496a1]" /> Eğim Profili:
                        </span>
                        <span className="font-mono text-[#f4f4f6] font-semibold">
                          {assessment.criteria.find((c) => c.id === "slope")?.value || "N/A"}
                        </span>
                      </div>
                      <div className="w-full bg-[#22242c] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#d86c6c] h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (assessment.criteria.find((c) => c.id === "slope")?.score || 50)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Sun Elevation & Lighting */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[#9496a1]">
                        <span className="flex items-center gap-1">
                          <Sun className="w-3 h-3 text-[#ff9f0a]" /> Güneş Ufuk Açısı:
                        </span>
                        <span className="font-mono text-[#f4f4f6] font-semibold">
                          {ephemeris.sunElevationDeg > 0 ? `+${ephemeris.sunElevationDeg}°` : `${ephemeris.sunElevationDeg}°`}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9496a1] flex justify-between">
                        <span>Yıllık Uptime: %{assessment.solarUptimePct}</span>
                        <span>Güç: %{ephemeris.solarPowerPotentialPct}</span>
                      </div>
                    </div>

                    {/* Earth LOS & Comms */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[#9496a1]">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-[#4a9eff]" /> Dünya Görüş Açısı:
                        </span>
                        <span className="font-mono text-[#f4f4f6] font-semibold">
                          {ephemeris.earthElevationDeg > 0 ? `+${ephemeris.earthElevationDeg}°` : `${ephemeris.earthElevationDeg}°`}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9496a1] flex justify-between">
                        <span>DTE Bağlantısı:</span>
                        <span className={assessment.earthLOS.directLineOfSight ? "text-[#34c759] font-medium" : "text-[#d86c6c] font-medium"}>
                          {assessment.earthLOS.directLineOfSight ? "Doğrudan LOS" : "Röle Zorunlu"}
                        </span>
                      </div>
                    </div>

                    {/* Water Ice Potential */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[#9496a1]">
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-[#4a9eff]" /> Su Buzu Olasılığı:
                        </span>
                        <span className="font-mono text-[#f4f4f6] font-semibold">
                          %{assessment.waterIceProbabilityPct}
                        </span>
                      </div>
                      <div className="w-full bg-[#22242c] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4a9eff] h-full rounded-full"
                          style={{ width: `${assessment.waterIceProbabilityPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Select button */}
                  <div className="p-3 bg-[#14151a] border-t border-[#282a33]">
                    <button
                      onClick={() => {
                        setSelectedTarget(target);
                        onClose();
                      }}
                      className="w-full py-2 rounded-full bg-[#22242c] hover:bg-[#d86c6c] hover:text-white text-[#f4f4f6] text-xs font-semibold border border-[#282a33] transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Bu Sahayı Seç</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-[#282a33] bg-[#14151a] flex items-center justify-between text-xs text-[#9496a1]">
          <span>
            Toplam {comparisons.length} aday saha karşılaştırılıyor · NASA LRO & DE440 Efemeris
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#22242c] hover:bg-[#2c2f3a] text-[#f4f4f6] border border-[#282a33] font-medium transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

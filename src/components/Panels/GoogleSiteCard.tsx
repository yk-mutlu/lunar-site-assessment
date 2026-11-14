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
  Orbit,
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

  const [activeTab, setActiveTab] = useState<"landing" | "horizon" | "base" | "criteria">("landing");

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
    <div className="fixed top-20 right-4 bottom-6 z-40 w-96 max-w-[calc(100vw-2rem)] select-none font-sans pointer-events-none flex flex-col">
      <div className="pointer-events-auto bg-[#181a20]/95 backdrop-blur-md rounded-3xl shadow-tesla border border-[#282a33] flex flex-col h-full overflow-hidden animate-fade-in text-[#f4f4f6]">
        {/* Header & Location Title */}
        <div className="p-4 pb-3 border-b border-[#282a33] bg-[#14151a] relative">
          <button
            onClick={() => setRightPanelOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#9496a1] hover:text-[#f4f4f6] hover:bg-[#22242c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-[#d86c6c] font-semibold mb-1">
            <MapPin className="w-3.5 h-3.5 fill-[#d86c6c]" />
            <span>AY İNİŞ SAHASI NAVİGATÖRÜ</span>
          </div>

          <h2 className="text-lg font-bold text-[#f4f4f6] leading-tight pr-8">
            {selectedTarget.name}
          </h2>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#9496a1]">
            <span className="font-mono tabular-nums font-medium text-[#f4f4f6]">
              {selectedTarget.lat >= 0 ? `${selectedTarget.lat}°K` : `${Math.abs(selectedTarget.lat)}°G`},{" "}
              {selectedTarget.lng >= 0 ? `${selectedTarget.lng}°D` : `${Math.abs(selectedTarget.lng)}°B`}
            </span>
            <span>•</span>
            <span>Rakım: {selectedTarget.elevationM} m</span>
          </div>

          {/* Overall Rating / Suitability Badge */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#282a33]">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-[#f4f4f6]">
                {assessment.overallScore}
              </span>
              <span className="text-xs text-[#9496a1] font-mono">/ 100 Puan</span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isReject
                  ? "bg-[rgba(216,108,108,0.15)] text-[#d86c6c] border border-[rgba(216,108,108,0.3)]"
                  : "bg-[rgba(52,199,89,0.15)] text-[#34c759] border border-[rgba(52,199,89,0.3)]"
              }`}
            >
              {isReject ? "Kritik Risk / Red" : "İnişe Uygun / Onaylı"}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="px-4 py-2.5 border-b border-[#282a33] flex flex-col gap-2 bg-[#121317]">
          <div className="flex gap-2">
            <button
              onClick={onOpenSimulator}
              className="flex-1 bg-[#d86c6c] hover:bg-[#c55a5a] text-white rounded-full py-2 px-3 text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>İnişi Simüle Et</span>
            </button>
            <button
              onClick={onOpenReport}
              className="bg-[#22242c] hover:bg-[#2c2f3a] text-[#f4f4f6] border border-[#282a33] rounded-full py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#9496a1]" />
              <span>Rapor Al</span>
            </button>
          </div>

          <button
            onClick={() => setViewMode("surface")}
            className="w-full bg-[#181a20] hover:bg-[#22242c] text-[#f4f4f6] border border-[#d86c6c]/40 rounded-full py-2 px-3 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#d86c6c]" />
            <span>Yüzeye İn & Çakıl/Kaya İncele (Sub-Meter)</span>
          </button>
        </div>

        {/* Polygon Area Banner if active */}
        {polygonStats && (
          <div className="px-4 py-3 bg-[rgba(216,108,108,0.08)] border-b border-[rgba(216,108,108,0.25)] flex flex-col gap-1.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#d86c6c] flex items-center gap-1.5">
                <Pentagon className="w-4 h-4" />
                Seçilen Poligon Alanı ({polygonStats.pointCount} Nokta)
              </span>
              <button
                onClick={clearPolygon}
                className="text-[11px] text-[#9496a1] hover:text-[#d86c6c] flex items-center gap-1 cursor-pointer"
                title="Poligonu Temizle"
              >
                <Trash2 className="w-3 h-3" />
                <span>Temizle</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#9496a1] block text-[10px]">YÜZEY ALANI</span>
                <span className="font-bold text-[#f4f4f6] font-mono">{polygonStats.areaKm2} km²</span>
              </div>
              <div>
                <span className="text-[#9496a1] block text-[10px]">ORT. EĞİM</span>
                <span className="font-bold text-[#f4f4f6] font-mono">{polygonStats.avgSlope}° (Max: {polygonStats.maxSlope}°)</span>
              </div>
              <div>
                <span className="text-[#9496a1] block text-[10px]">SU BUZU ENDEKSİ</span>
                <span className="font-bold text-[#4a9eff] font-mono">%{polygonStats.iceIndex}</span>
              </div>
              <div>
                <span className="text-[#9496a1] block text-[10px]">DÜNYA LOS BAĞLANTISI</span>
                <span className={`font-bold font-mono ${polygonStats.commsLOS ? "text-[#34c759]" : "text-[#d86c6c]"}`}>
                  {polygonStats.commsLOS ? "Doğrudan LOS" : "Röle Gerekli"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Clean Tesla-style Segmented Tabs */}
        <div className="flex border-b border-[#282a33] bg-[#14151a] text-xs font-medium">
          <button
            onClick={() => setActiveTab("landing")}
            className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
              activeTab === "landing"
                ? "text-[#d86c6c] font-semibold"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            İniş Güvenliği
            {activeTab === "landing" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d86c6c]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("horizon")}
            className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
              activeTab === "horizon"
                ? "text-[#d86c6c] font-semibold"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            Ufuk & Efemeris
            {activeTab === "horizon" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d86c6c]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("base")}
            className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
              activeTab === "base"
                ? "text-[#d86c6c] font-semibold"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            Üs & Enerji
            {activeTab === "base" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d86c6c]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("criteria")}
            className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
              activeTab === "criteria"
                ? "text-[#d86c6c] font-semibold"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
          >
            Kriterler
            {activeTab === "criteria" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d86c6c]" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Vehicle Profile Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#f4f4f6] block">
              İniş Aracı Profili
            </label>
            <select
              value={activeLander.id}
              onChange={(e) => {
                const l = LANDER_PRESETS.find((x) => x.id === e.target.value);
                if (l) setActiveLander(l);
              }}
              className="w-full bg-[#121317] border border-[#282a33] rounded-xl px-3 py-2 text-xs text-[#f4f4f6] font-medium focus:outline-none focus:border-[#d86c6c] cursor-pointer"
            >
              {LANDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Maks. {p.maxSlopeDeg}°)
                </option>
              ))}
            </select>
          </div>

          {/* Dispersion Footprint Radius Slider */}
          <div className="space-y-1 bg-[#121317] p-3 rounded-2xl border border-[#282a33]">
            <div className="flex justify-between text-xs font-medium text-[#f4f4f6]">
              <span>Analiz Alanı Çapı</span>
              <span className="text-[#d86c6c] font-bold font-mono">{footprintRadiusKm * 2} km</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={footprintRadiusKm}
              onChange={(e) => setFootprintRadiusKm(Number(e.target.value))}
              className="w-full accent-[#d86c6c] h-1.5 bg-[#22242c] rounded-lg cursor-pointer"
            />
          </div>

          {/* Tab 1: Landing Safety (Hard Constraints & Topography) */}
          {activeTab === "landing" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#f4f4f6] uppercase tracking-wider">
                  Uçuş Güvenlik Kuralları (GO / NO-GO)
                </span>
                <span className="text-[10px] font-mono text-[#9496a1]">NASA LRO LOLA</span>
              </div>

              <div className="space-y-2">
                {assessment.hardConstraints.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] flex items-start gap-2.5"
                  >
                    {c.status === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-[#34c759] mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#d86c6c] mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#f4f4f6]">{c.label}</span>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            c.status === "pass" ? "text-[#34c759]" : "text-[#d86c6c]"
                          }`}
                        >
                          {c.status === "pass" ? "GO" : "NO-GO"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9496a1] mt-0.5 font-mono">
                        Ölçülen: {c.measured} · Eşik: {c.threshold}
                      </div>
                      <div className="text-[10px] text-[#9496a1] mt-1 leading-snug">
                        {c.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Horizon & Ephemeris */}
          {activeTab === "horizon" && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#f4f4f6] uppercase tracking-wider">
                  Ufuk Çizgisi & Efemeris Durumu
                </span>
                <span className="text-[10px] font-mono text-[#9496a1]">DE440 / LOLA</span>
              </div>

              {/* Sun Position */}
              <div className="p-3.5 rounded-2xl bg-[#121317] border border-[#282a33] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-[#ff9f0a] fill-[#ff9f0a]" />
                    <span className="font-semibold text-[#f4f4f6]">Güneş Ufuk Açısı (Elevation)</span>
                  </div>
                  <span className="font-mono font-bold text-[#f4f4f6]">
                    {ephemeris.sunElevationDeg > 0 ? `+${ephemeris.sunElevationDeg}°` : `${ephemeris.sunElevationDeg}°`}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9496a1]">
                  <span>Azimut Açısı:</span>
                  <span className="font-mono text-[#f4f4f6]">{ephemeris.sunAzimuthDeg}°</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9496a1]">
                  <span>Gün Batımına Kalan Süre:</span>
                  <span className="font-mono font-bold text-[#f4f4f6]">
                    {ephemeris.isSunVisible ? `${ephemeris.timeToSunsetHours} saat` : "Karanlık (Ay Gecesi)"}
                  </span>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-[#9496a1]">
                    <span>Güneş Güç Potansiyeli</span>
                    <span className="font-bold text-[#f4f4f6]">%{ephemeris.solarPowerPotentialPct}</span>
                  </div>
                  <div className="w-full bg-[#22242c] h-1.5 rounded-full overflow-hidden border border-[#282a33]">
                    <div
                      className="bg-[#ff9f0a] h-full rounded-full"
                      style={{ width: `${ephemeris.solarPowerPotentialPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Earth Position */}
              <div className="p-3.5 rounded-2xl bg-[#121317] border border-[#282a33] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#4a9eff] fill-[#4a9eff]" />
                    <span className="font-semibold text-[#f4f4f6]">Dünya Ufuk Açısı (Elevation)</span>
                  </div>
                  <span className="font-mono font-bold text-[#f4f4f6]">
                    {ephemeris.earthElevationDeg > 0 ? `+${ephemeris.earthElevationDeg}°` : `${ephemeris.earthElevationDeg}°`}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9496a1]">
                  <span>Azimut Açısı:</span>
                  <span className="font-mono text-[#f4f4f6]">{ephemeris.earthAzimuthDeg}°</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9496a1]">
                  <span>Doğrudan DTE İletişim:</span>
                  <span className={`font-mono font-bold ${ephemeris.isEarthVisible ? "text-[#34c759]" : "text-[#d86c6c]"}`}>
                    {ephemeris.isEarthVisible ? "Aktif (+7.8 dB Marj)" : "Görüş Yok (Röle Zorunlu)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Lunar Base & Resources */}
          {activeTab === "base" && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="p-3.5 rounded-2xl bg-[#121317] border border-[#282a33] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#9496a1]">Yıllık Güneşlenme Uptime:</span>
                  <span className="font-bold text-[#f4f4f6] font-mono">%{assessment.solarUptimePct}</span>
                </div>
                <div className="w-full bg-[#22242c] h-1.5 rounded-full overflow-hidden border border-[#282a33]">
                  <div
                    className="bg-[#d86c6c] h-full rounded-full"
                    style={{ width: `${assessment.solarUptimePct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#9496a1]">
                  Güney Kutup sırtları yıllık %80-90 güneşlenme sağlayarak 14 günlük gece soğuğundan korur.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#121317] border border-[#282a33] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#9496a1]">Su Buzu / PSR Yakınlığı:</span>
                  <span className="font-bold text-[#4a9eff] font-mono">%{assessment.waterIceProbabilityPct} İndeks</span>
                </div>
                <div className="w-full bg-[#22242c] h-1.5 rounded-full overflow-hidden border border-[#282a33]">
                  <div
                    className="bg-[#4a9eff] h-full rounded-full"
                    style={{ width: `${assessment.waterIceProbabilityPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#9496a1]">
                  LRO LEND nötron spektrometresi ile kalıcı gölgeli krater tabanlarında tespit edilen hidrojen yoğunluğu.
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: MCDA Criteria Matrix */}
          {activeTab === "criteria" && (
            <div className="space-y-2 animate-fade-in text-xs">
              {assessment.criteria.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-[#121317] border border-[#282a33] flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-[#f4f4f6]">{c.name}</div>
                    <div className="text-[10px] text-[#9496a1]">{c.instrument} · {c.value}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#d86c6c] font-mono">{c.score} / 100</span>
                    <span className="block text-[9px] text-[#9496a1] uppercase">{c.confidence}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

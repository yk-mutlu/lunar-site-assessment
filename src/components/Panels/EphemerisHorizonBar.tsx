"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store";
import { computeHorizonEphemeris } from "@/data/ephemeris";
import {
  Sun,
  Globe,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Calendar,
  Clock,
  Compass,
  BatteryCharging,
  Radio,
  ChevronUp,
  ChevronDown,
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
  // Center is Zenith (90°), Outer Ring is Horizon (0°), Edge is sub-horizon (-30°)
  // r = (90 - elev) / 120 * radius
  const dialRadius = 45; // pixels
  const dialCenter = 50; // center (50, 50)

  const toDialCoords = (elevDeg: number, azDeg: number) => {
    // Clamp elevation for display (-20° to 90°)
    const clampedElev = Math.max(-20, Math.min(90, elevDeg));
    const normalizedR = ((90 - clampedElev) / 110) * dialRadius;
    const azRad = (azDeg - 90) * (Math.PI / 180);
    const x = dialCenter + normalizedR * Math.cos(azRad);
    const y = dialCenter + normalizedR * Math.sin(azRad);
    return { x, y };
  };

  const sunDial = toDialCoords(ephemeris.sunElevationDeg, ephemeris.sunAzimuthDeg);
  const earthDial = toDialCoords(ephemeris.earthElevationDeg, ephemeris.earthAzimuthDeg);

  // Calculate formatted earth date based on lunar day hour
  const baseDate = new Date(missionDate);
  const currentDate = new Date(baseDate.getTime() + lunarDayHour * 3600 * 1000);
  const formattedDate = currentDate.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = currentDate.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92vw] select-none font-sans pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-google-lg border border-google-border p-3 flex flex-col gap-2.5 transition-all">
        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* 1. Polar Horizon Mini-Radar */}
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-full bg-google-bg border border-google-border flex-shrink-0 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Horizon Circle (0°) */}
                <circle
                  cx={dialCenter}
                  cy={dialCenter}
                  r={dialRadius * (90 / 110)}
                  fill="none"
                  stroke="#dadce0"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                {/* Zenith Point (90°) */}
                <circle cx={dialCenter} cy={dialCenter} r="2" fill="#9aa0a6" />

                {/* Sub-horizon shading */}
                <circle
                  cx={dialCenter}
                  cy={dialCenter}
                  r={dialRadius}
                  fill="none"
                  stroke="#ea4335"
                  strokeWidth="0.75"
                  strokeOpacity="0.4"
                />

                {/* Sun Marker */}
                <circle
                  cx={sunDial.x}
                  cy={sunDial.y}
                  r="4"
                  fill="#fbbc04"
                  stroke="#ffffff"
                  strokeWidth="1"
                />

                {/* Earth Marker */}
                <circle
                  cx={earthDial.x}
                  cy={earthDial.y}
                  r="4"
                  fill="#1a73e8"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                {/* Sun Status */}
                <div className="flex items-center gap-1.5">
                  <Sun className={`w-4 h-4 ${ephemeris.isSunVisible ? "text-google-yellow fill-google-yellow" : "text-google-muted"}`} />
                  <span className="text-xs font-semibold text-google-text">
                    Güneş {ephemeris.sunElevationDeg > 0 ? `+${ephemeris.sunElevationDeg}°` : `${ephemeris.sunElevationDeg}°`}
                  </span>
                </div>
                {/* Earth Status */}
                <div className="flex items-center gap-1.5">
                  <Globe className={`w-4 h-4 ${ephemeris.isEarthVisible ? "text-google-blue fill-google-blue" : "text-google-muted"}`} />
                  <span className="text-xs font-semibold text-google-text">
                    Dünya {ephemeris.earthElevationDeg > 0 ? `+${ephemeris.earthElevationDeg}°` : `${ephemeris.earthElevationDeg}°`}
                  </span>
                </div>
              </div>

              {/* Windows countdown */}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-google-muted">
                <span>
                  {ephemeris.isSunVisible
                    ? `Gün Batımı: ~${ephemeris.timeToSunsetHours} saat`
                    : "Ay Gecesi (Karanlık)"}
                </span>
                <span>•</span>
                <span className={ephemeris.isEarthVisible ? "text-green-600 font-medium" : "text-google-red font-medium"}>
                  {ephemeris.isEarthVisible ? "Doğrudan LOS Açık" : "Dünya İletişimi Yok"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Timeline Scrubber & Playback */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
              className="w-10 h-10 rounded-full bg-google-red hover:bg-google-redHover text-white flex items-center justify-center shadow-google transition-transform active:scale-95 cursor-pointer flex-shrink-0"
              title={isTimelinePlaying ? "Durdur" : "Ay Gününü Oynat (708 Saat)"}
            >
              {isTimelinePlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => setPlaySpeed((s) => (s === 4 ? 12 : s === 12 ? 24 : 4))}
              className="px-2 py-1 rounded-full bg-google-bg hover:bg-google-border text-google-muted hover:text-google-text text-[11px] font-mono border border-google-border transition-colors cursor-pointer"
              title="Oynatma Hızı"
            >
              {playSpeed}x Hız
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-google-muted hover:text-google-text hover:bg-google-bg transition-colors cursor-pointer"
              title={isExpanded ? "Daralt" : "Efemeris Detaylarını Göster"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-[11px] font-mono text-google-muted whitespace-nowrap">
            {formattedDate} {formattedTime}
          </span>
          <input
            type="range"
            min="0"
            max="708"
            value={lunarDayHour}
            onChange={(e) => setLunarDayHour(Number(e.target.value))}
            className="flex-1 accent-google-red h-1.5 bg-google-bg rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-google-muted tabular-nums whitespace-nowrap">
            {lunarDayHour} / 708 sa
          </span>
        </div>

        {/* Expanded Ephemeris Panel */}
        {isExpanded && (
          <div className="pt-2 border-t border-google-borderSubtle grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs animate-fade-in">
            <div className="p-2.5 rounded-2xl bg-google-bg border border-google-border flex flex-col">
              <div className="flex items-center gap-1.5 text-google-muted text-[11px] font-medium mb-1">
                <Sun className="w-3.5 h-3.5 text-google-yellow" />
                <span>Güneş Güç Potansiyeli</span>
              </div>
              <div className="text-base font-bold text-google-text">
                %{ephemeris.solarPowerPotentialPct}
              </div>
              <span className="text-[10px] text-google-muted">Dikey Dizi Verimi</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-google-bg border border-google-border flex flex-col">
              <div className="flex items-center gap-1.5 text-google-muted text-[11px] font-medium mb-1">
                <Radio className="w-3.5 h-3.5 text-google-blue" />
                <span>Dünya Görüş Açısı</span>
              </div>
              <div className="text-base font-bold text-google-text">
                {ephemeris.earthElevationDeg}°
              </div>
              <span className="text-[10px] text-google-muted">
                {ephemeris.earthElevationDeg > 3 ? "Yüksek RF Marjı" : "Düşük/Engelli Marj"}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-google-bg border border-google-border flex flex-col">
              <div className="flex items-center gap-1.5 text-google-muted text-[11px] font-medium mb-1">
                <Clock className="w-3.5 h-3.5 text-google-red" />
                <span>Batıma Kalan Süre</span>
              </div>
              <div className="text-base font-bold text-google-text">
                {ephemeris.timeToSunsetHours} saat
              </div>
              <span className="text-[10px] text-google-muted">Batarya Kesilme Sınırı</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-google-bg border border-google-border flex flex-col">
              <div className="flex items-center gap-1.5 text-google-muted text-[11px] font-medium mb-1">
                <Compass className="w-3.5 h-3.5 text-google-green" />
                <span>Güneş / Dünya Azimutu</span>
              </div>
              <div className="text-base font-bold text-google-text">
                {ephemeris.sunAzimuthDeg}° / {ephemeris.earthAzimuthDeg}°
              </div>
              <span className="text-[10px] text-google-muted">Pusula Ufuk İstikameti</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

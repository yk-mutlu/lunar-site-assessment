// ═══════════════════════════════════════════════════════════════════════
// TwoDimLunarMapPickerModal.tsx
// Interactive 2D Lunar Map Landing Site Picker (Google Maps Style in English)
// Features Safe Landing Zones, Safety Ranks, Artemis III Candidate Sites,
// Overlay Layers (Slope/Elevation), and Free Click-to-Target
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  PRESET_SAFE_LUNAR_SITES,
  SafeLunarSiteOption,
} from "@/data/lunar-safe-sites";
import {
  X,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Rocket,
  Compass,
} from "lucide-react";

interface TwoDimLunarMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSite: SafeLunarSiteOption;
  onSelectSite: (site: SafeLunarSiteOption) => void;
}

type LayerType = "imagery" | "slope" | "elevation" | "water_ice";
type CategoryFilter = "ALL" | "TOP_SAFE" | "ARTEMIS" | "APOLLO";

export const TwoDimLunarMapPickerModal: React.FC<TwoDimLunarMapPickerModalProps> = ({
  isOpen,
  onClose,
  selectedSite,
  onSelectSite,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.82);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const [activeLayer, setActiveLayer] = useState<LayerType>("imagery");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [currentSelected, setCurrentSelected] = useState<SafeLunarSiteOption>(selectedSite);
  const [hoverCoord, setHoverCoord] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (selectedSite) {
      setCurrentSelected(selectedSite);
    }
  }, [selectedSite, isOpen]);

  if (!isOpen) return null;

  const layerTextureMap: Record<LayerType, string> = {
    imagery: "/textures/moon_surface.jpg",
    slope: "/textures/layer_slope.jpg",
    elevation: "/textures/layer_elevation.jpg",
    water_ice: "/textures/layer_water_ice.jpg",
  };

  const toMapCoords = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
  };

  const toLatLng = (clientX: number, clientY: number) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const mapW = rect.width * scale;
    const mapH = rect.height * scale;

    const relX = (clientX - (rect.left + pan.x)) / mapW;
    const relY = (clientY - (rect.top + pan.y)) / mapH;

    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;

    const lng = Number((relX * 360 - 180).toFixed(2));
    const lat = Number((90 - relY * 180).toFixed(2));
    return { lat, lng };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coord = toLatLng(e.clientX, e.clientY);
    setHoverCoord(coord);

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
    setScale((prev) => Math.max(0.6, Math.min(18, prev * zoomFactor)));
  };

  const handleMapClick = (e: React.MouseEvent) => {
    const coord = toLatLng(e.clientX, e.clientY);
    if (!coord) return;

    const nearbyPreset = PRESET_SAFE_LUNAR_SITES.find((site) => {
      const dLat = Math.abs(site.lat - coord.lat);
      const dLng = Math.abs(site.lng - coord.lng);
      return dLat < 6 && dLng < 6;
    });

    if (nearbyPreset) {
      setCurrentSelected(nearbyPreset);
    } else {
      const isPolar = Math.abs(coord.lat) >= 75;
      const customSlope = Number((1.5 + Math.random() * 3.5).toFixed(1));
      const customScore = Number(Math.max(65, 96 - customSlope * 4).toFixed(1));

      const customSite: SafeLunarSiteOption = {
        id: `custom_click_${Date.now()}`,
        name: `Custom Site (${coord.lat >= 0 ? `${coord.lat}°N` : `${Math.abs(coord.lat)}°S`}, ${coord.lng >= 0 ? `${coord.lng}°E` : `${Math.abs(coord.lng)}°W`})`,
        shortName: `Custom Target`,
        code: "C-USR",
        lat: coord.lat,
        lng: coord.lng,
        elevationM: Math.round(-1500 + Math.random() * 3500),
        slopeDeg: customSlope,
        safetyScorePct: customScore,
        illuminationPct: isPolar ? 82.0 : 50.0,
        safetyRank: 99,
        safetyLabel: "Custom Target",
        category: "Custom",
        boulderRisk: customSlope > 3.0 ? "Moderate" : "Low",
        description: `User-selected coordinate at ${coord.lat.toFixed(2)}° Lat, ${coord.lng.toFixed(2)}° Lng.`,
        isCustom: true,
      };
      setCurrentSelected(customSite);
    }
  };

  const filteredSites = PRESET_SAFE_LUNAR_SITES.filter((site) => {
    if (categoryFilter === "ALL") return true;
    if (categoryFilter === "TOP_SAFE") return site.safetyScorePct >= 90;
    if (categoryFilter === "ARTEMIS") return site.category === "Artemis III";
    if (categoryFilter === "APOLLO") return site.category === "Apollo";
    return true;
  });

  const handleConfirmSelection = () => {
    onSelectSite(currentSelected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm select-none font-sans animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[850px] bg-white border border-[#E8EAED] rounded-2xl shadow-[0_12px_40px_rgba(60,64,67,0.3)] flex flex-col overflow-hidden text-[#202124]">
        
        {/* Header Bar (Google Material Clean Style) */}
        <div className="px-5 py-3 border-b border-[#E8EAED] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] flex items-center justify-center text-[#1A73E8] flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#202124]">
                  Select Lunar Landing Location
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F4EA] text-[#34A853]">
                  NASA 2D Global Map
                </span>
              </div>
              <p className="text-xs text-[#5F6368]">
                Click anywhere on the lunar surface to set custom coordinates or select candidate sites
              </p>
            </div>
          </div>

          {/* Layer and Close Controls */}
          <div className="flex items-center gap-2">
            <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-xl p-1 flex items-center gap-1 text-xs">
              <span className="text-[#5F6368] text-[11px] px-2 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#1A73E8]" /> Layer:
              </span>
              {(["imagery", "slope", "elevation", "water_ice"] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setActiveLayer(layer)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer capitalize ${
                    activeLayer === layer
                      ? "bg-[#1A73E8] text-white font-semibold"
                      : "text-[#5F6368] hover:text-[#202124]"
                  }`}
                >
                  {layer === "imagery" ? "Visual" : layer === "slope" ? "Slope" : layer === "elevation" ? "DEM" : "Ice"}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="px-5 py-2 bg-[#F8F9FA] border-b border-[#E8EAED] flex items-center justify-between text-xs overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-[#5F6368] text-[11px] font-medium mr-1">Filter Sites:</span>
            {(["ALL", "TOP_SAFE", "ARTEMIS", "APOLLO"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                    : "bg-white text-[#5F6368] hover:text-[#202124] border border-[#DADCE0]"
                }`}
              >
                {cat === "ALL" ? `All Candidates (${PRESET_SAFE_LUNAR_SITES.length})` : cat === "TOP_SAFE" ? "Prime Safe (>90%)" : cat === "ARTEMIS" ? "Artemis III" : "Apollo"}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[#5F6368] font-mono hidden sm:block">
            {hoverCoord ? (
              <span>
                Cursor: {Math.abs(hoverCoord.lat).toFixed(2)}°{hoverCoord.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(hoverCoord.lng).toFixed(2)}°{hoverCoord.lng >= 0 ? "E" : "W"}
              </span>
            ) : (
              <span>Move mouse over map to view coordinates</span>
            )}
          </div>
        </div>

        {/* Main 2D Map Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleMapClick}
          className="relative flex-1 overflow-hidden select-none bg-[#090A0D] cursor-crosshair"
        >
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}
          >
            <div className="relative w-[94%] max-w-4xl aspect-[2/1] rounded-2xl overflow-hidden shadow-2xl border border-[#232634] bg-[#12141A]">
              <img
                src={layerTextureMap[activeLayer]}
                alt="Lunar Surface"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Cartographic Coordinate Graticule Grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {[-60, -30, 0, 30, 60].map((lat) => {
                  const y = ((90 - lat) / 180) * 100;
                  return (
                    <line
                      key={`lat-${lat}`}
                      x1="0"
                      y1={`${y}%`}
                      x2="100%"
                      y2={`${y}%`}
                      stroke="rgba(255,255,255,0.15)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}
                {[-120, -60, 0, 60, 120].map((lng) => {
                  const x = ((lng + 180) / 360) * 100;
                  return (
                    <line
                      key={`lng-${lng}`}
                      x1={`${x}%`}
                      y1="0"
                      x2={`${x}%`}
                      y2="100%"
                      stroke="rgba(255,255,255,0.15)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}
              </svg>

              {/* Site Pins on 2D Map */}
              {filteredSites.map((site) => {
                const { x, y } = toMapCoords(site.lat, site.lng);
                const isSelected = currentSelected.id === site.id;
                const isTopSafe = site.safetyScorePct >= 90;

                return (
                  <div
                    key={site.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSelected(site);
                    }}
                    className="absolute group z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <div
                      className={`absolute -inset-3 rounded-full transition-all duration-300 pointer-events-none ${
                        isSelected
                          ? "bg-[#34A853]/40 ring-4 ring-[#34A853] animate-pulse"
                          : isTopSafe
                          ? "bg-[#34A853]/25 group-hover:bg-[#34A853]/40 ring-1 ring-[#34A853]"
                          : "bg-[#FBBC05]/20 ring-1 ring-[#FBBC05]"
                      }`}
                    />

                    <div
                      className={`relative w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform hover:scale-125 ${
                        isSelected
                          ? "bg-[#34A853] text-white ring-2 ring-white scale-125"
                          : isTopSafe
                          ? "bg-white text-[#34A853] border-2 border-[#34A853]"
                          : "bg-white text-[#FBBC05] border-2 border-[#FBBC05]"
                      }`}
                    >
                      <span>{site.safetyRank}</span>
                    </div>

                    <div
                      className={`absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 rounded-lg text-[10px] font-sans font-semibold whitespace-nowrap shadow-lg border pointer-events-none transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#34A853] text-white border-white z-30 scale-105"
                          : "bg-white text-[#202124] border-[#E8EAED]"
                      }`}
                    >
                      <span>{site.shortName}</span>
                      <span className={`font-mono text-[9px] ${isSelected ? "text-white" : "text-[#34A853]"}`}>
                        {site.safetyScorePct}%
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Custom Selected Pin */}
              {currentSelected.isCustom && (
                <div
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${toMapCoords(currentSelected.lat, currentSelected.lng).x}%`,
                    top: `${toMapCoords(currentSelected.lat, currentSelected.lng).y}%`,
                  }}
                >
                  <div className="absolute -inset-4 rounded-full bg-[#1A73E8]/30 ring-4 ring-[#1A73E8] animate-ping" />
                  <div className="w-7 h-7 rounded-full bg-[#1A73E8] text-white flex items-center justify-center shadow-xl ring-2 ring-white">
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2.5 py-0.5 rounded-lg bg-[#1A73E8] text-white text-[11px] font-bold whitespace-nowrap shadow-xl border border-white">
                    📍 {currentSelected.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Floating Zoom Controls (Bottom Right) */}
          <div className="absolute bottom-5 right-5 z-30 flex flex-col gap-1.5">
            <button
              onClick={() => setScale((s) => Math.min(18, s * 1.35))}
              className="w-9 h-9 rounded-xl bg-white shadow-md border border-[#E8EAED] flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale((s) => Math.max(0.6, s / 1.35))}
              className="w-9 h-9 rounded-xl bg-white shadow-md border border-[#E8EAED] flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setScale(0.82);
                setPan({ x: 0, y: 0 });
              }}
              className="w-9 h-9 rounded-xl bg-white shadow-md border border-[#E8EAED] flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
              title="Fit Full Moon to Screen"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Bar: Selected Site Summary & Confirm Action */}
        <div className="p-3.5 md:px-6 md:py-3.5 bg-white border-t border-[#E8EAED] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              currentSelected.safetyScorePct >= 90
                ? "bg-[#E6F4EA] text-[#34A853]"
                : "bg-[#E8F0FE] text-[#1A73E8]"
            }`}>
              <MapPin className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-semibold text-[#202124]">
                  {currentSelected.name}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  currentSelected.safetyScorePct >= 90
                    ? "bg-[#E6F4EA] text-[#34A853]"
                    : "bg-[#FEF7E0] text-[#FBBC05]"
                }`}>
                  {currentSelected.safetyLabel}
                </span>
              </div>
              <p className="text-xs text-[#5F6368] line-clamp-1 max-w-xl">
                {currentSelected.description}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Confirm Action */}
          <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
            <div>
              <span className="text-[11px] text-[#5F6368] block">Coordinates</span>
              <span className="font-semibold text-[#202124] font-mono">
                {Math.abs(currentSelected.lat).toFixed(2)}°{currentSelected.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(currentSelected.lng).toFixed(2)}°{currentSelected.lng >= 0 ? "E" : "W"}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[#5F6368] block">Safety Score</span>
              <span className="font-semibold text-[#34A853] text-sm">
                {currentSelected.safetyScorePct}%
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[#5F6368] block">Surface Slope</span>
              <span className={`font-semibold ${currentSelected.slopeDeg <= 3.0 ? "text-[#34A853]" : "text-[#FBBC05]"}`}>
                {currentSelected.slopeDeg}°
              </span>
            </div>

            <div className="h-7 w-px bg-[#E8EAED] hidden sm:block" />

            <button
              onClick={handleConfirmSelection}
              className="bg-[#1A73E8] hover:bg-[#1565C0] text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Rocket className="w-4 h-4 text-white" />
              <span>Confirm & Start Launch Sim</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TwoDimLunarMapPickerModal;

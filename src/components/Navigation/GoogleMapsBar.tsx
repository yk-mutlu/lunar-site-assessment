"use client";

import React, { useState } from "react";
import { useStore, NOTABLE_TARGETS } from "@/store";
import {
  Search,
  MapPin,
  X,
  Rocket,
  Sparkles,
  FileText,
  Pentagon,
  Trash2,
  Layers,
  Globe2,
  Map as MapIcon,
  Crosshair,
} from "lucide-react";

interface GoogleMapsBarProps {
  onOpenReport: () => void;
  onOpenAdvisor: () => void;
  onOpenSimulator: () => void;
}

export const GoogleMapsBar: React.FC<GoogleMapsBarProps> = ({
  onOpenReport,
  onOpenAdvisor,
  onOpenSimulator,
}) => {
  const {
    selectedTarget,
    setSelectedTarget,
    setRightPanelOpen,
    viewMode,
    setViewMode,
    isPolygonMode,
    setIsPolygonMode,
    polygonPoints,
    clearPolygon,
    setIsComparisonModalOpen,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filteredTargets = NOTABLE_TARGETS.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Top Left: Sleek Tesla-style Floating Search Bar & Pills */}
      <div className="fixed top-4 left-4 z-40 flex flex-col gap-2.5 max-w-md w-full select-none pointer-events-none">
        {/* Search Pill Card */}
        <div className="pointer-events-auto bg-[#181a20]/95 backdrop-blur-md rounded-full shadow-tesla border border-[#282a33] flex items-center px-4 h-12 w-full transition-shadow hover:border-[#3a3d4a]">
          {/* Soft Pastel Red Pin Logo */}
          <div className="w-8 h-8 rounded-full bg-[rgba(216,108,108,0.15)] flex items-center justify-center mr-2 flex-shrink-0">
            <MapPin className="w-4 h-4 text-[#d86c6c] fill-[#d86c6c]" />
          </div>

          {/* Input field */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Ay kraterleri, Artemis adayları veya koordinat..."
            className="flex-1 bg-transparent text-sm text-[#f4f4f6] placeholder-[#9496a1] focus:outline-none font-sans"
          />

          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setDropdownOpen(false);
              }}
              className="p-1.5 text-[#9496a1] hover:text-[#f4f4f6] rounded-full hover:bg-[#22242c] transition-colors mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

          {/* Search Action Icon */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-2 text-[#9496a1] hover:text-[#f4f4f6] rounded-full hover:bg-[#22242c] transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results Dropdown */}
        {dropdownOpen && (
          <div className="pointer-events-auto bg-[#181a20]/95 backdrop-blur-md rounded-2xl shadow-tesla border border-[#282a33] p-2 max-h-72 overflow-y-auto animate-fade-in font-sans">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-[#9496a1] uppercase tracking-wider">
              Aday İniş Sahaları & Görevler
            </div>
            {filteredTargets.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTarget(t);
                  setSearchQuery("");
                  setDropdownOpen(false);
                  setRightPanelOpen(true);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedTarget.id === t.id
                    ? "bg-[rgba(216,108,108,0.15)] text-[#d86c6c] font-medium"
                    : "hover:bg-[#22242c] text-[#f4f4f6]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className={`w-4 h-4 ${selectedTarget.id === t.id ? "text-[#d86c6c]" : "text-[#9496a1]"}`} />
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-[#9496a1] truncate max-w-[240px]">
                      {t.description}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#9496a1]">
                  {t.lat.toFixed(1)}°, {t.lng.toFixed(1)}°
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Filter Pill Chips */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {NOTABLE_TARGETS.slice(0, 5).map((t) => {
            const isSelected = selectedTarget.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTarget(t);
                  setRightPanelOpen(true);
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-google flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#d86c6c] text-white border border-[#d86c6c] font-semibold shadow-md"
                    : "bg-[#181a20]/90 text-[#f4f4f6] border border-[#282a33] hover:bg-[#22242c] hover:border-[#3a3d4a]"
                }`}
              >
                <MapPin className={`w-3 h-3 ${isSelected ? "text-white fill-white" : "text-[#d86c6c] fill-[#d86c6c]"}`} />
                <span>{t.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Right: Sleek Floating Action Pills */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2 select-none">
        {/* 3D Orbit / Surface / 2D Switcher Pill */}
        <div className="bg-[#181a20]/90 backdrop-blur-md rounded-full shadow-google border border-[#282a33] p-1 flex items-center gap-1">
          <button
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewMode === "3d"
                ? "bg-[#d86c6c] text-white font-semibold shadow-sm"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
            title="3D Yörünge Küresi"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Yörünge</span>
          </button>
          <button
            onClick={() => setViewMode("surface")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewMode === "surface"
                ? "bg-[#d86c6c] text-white font-semibold shadow-sm"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
            title="3D Yüzey & Çakıl Taşı İnceleme (Sub-Meter)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Yüzey & Çakıl</span>
          </button>
          <button
            onClick={() => setViewMode("2d")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewMode === "2d"
                ? "bg-[#d86c6c] text-white font-semibold shadow-sm"
                : "text-[#9496a1] hover:text-[#f4f4f6]"
            }`}
            title="2D Harita"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>2D</span>
          </button>
        </div>

        {/* Polygon Lasso Selection Tool */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPolygonMode(!isPolygonMode)}
            className={`rounded-full px-3.5 h-11 flex items-center gap-2 shadow-google border text-xs font-medium transition-colors cursor-pointer ${
              isPolygonMode
                ? "bg-[#d86c6c] text-white border-[#d86c6c] shadow-md"
                : "bg-[#181a20]/90 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] border-[#282a33]"
            }`}
            title="Serbest poligon iniş sahası çizimi"
          >
            <Pentagon className="w-4 h-4" />
            <span>{isPolygonMode ? `Poligon (${polygonPoints.length})` : "Poligon Seç"}</span>
          </button>
          {polygonPoints.length > 0 && (
            <button
              onClick={clearPolygon}
              className="bg-[#181a20]/90 hover:bg-red-950/40 text-[#d86c6c] rounded-full w-10 h-10 flex items-center justify-center shadow-google border border-[#282a33] transition-colors cursor-pointer"
              title="Poligonu Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Site Comparison Button */}
        <button
          onClick={() => setIsComparisonModalOpen(true)}
          className="bg-[#181a20]/90 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] rounded-full px-3.5 h-11 flex items-center gap-1.5 shadow-google border border-[#282a33] text-xs font-medium transition-colors cursor-pointer"
          title="Sahaları Yan Yana Karşılaştır"
        >
          <Layers className="w-4 h-4 text-[#4a9eff]" />
          <span className="hidden md:inline">Karşılaştır</span>
        </button>

        {/* Soft Pastel Red Primary Action: İniş Simülatörü */}
        <button
          onClick={onOpenSimulator}
          className="bg-[#d86c6c] hover:bg-[#c55a5a] text-white rounded-full px-4 h-11 flex items-center gap-2 shadow-md text-xs font-medium transition-transform active:scale-95 cursor-pointer"
        >
          <Rocket className="w-4 h-4" />
          <span className="font-semibold">İniş Simülasyonu</span>
        </button>

        {/* AI Danışman Pill */}
        <button
          onClick={onOpenAdvisor}
          className="bg-[#181a20]/90 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] rounded-full px-3.5 h-11 flex items-center gap-1.5 shadow-google border border-[#282a33] text-xs font-medium transition-colors cursor-pointer"
          title="Bilimsel Yapay Zeka Danışmanı"
        >
          <Sparkles className="w-4 h-4 text-[#ff9f0a]" />
          <span className="hidden md:inline">AI Danışman</span>
        </button>

        {/* Uçuş Raporu Pill */}
        <button
          onClick={onOpenReport}
          className="bg-[#181a20]/90 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] rounded-full px-3.5 h-11 flex items-center gap-1.5 shadow-google border border-[#282a33] text-xs font-medium transition-colors cursor-pointer"
          title="Uçuş Brifingi ve Rapor PDF"
        >
          <FileText className="w-4 h-4 text-[#9496a1]" />
          <span className="hidden sm:inline">Rapor</span>
        </button>
      </div>
    </>
  );
};

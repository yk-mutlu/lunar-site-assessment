// ═══════════════════════════════════════════════════════════════════════
// GoogleMapsBar.tsx
// Top Floating Navigation & Search Bar (Google Maps / Material Design)
// Minimalist, Map-First Interface in English with Custom Coordinate Input
// Palette: Surface #FFFFFF, Borders #E8EAED, Accent #1A73E8, Text #202124
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";
import { useStore, NOTABLE_TARGETS } from "@/store";
import type { LunarTarget } from "@/types";
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
  Globe,
  Globe2,
  Map as MapIcon,
  Crosshair,
  Navigation,
  Compass,
  ArrowRight,
} from "lucide-react";

interface GoogleMapsBarProps {
  onOpenReport: () => void;
  onOpenAdvisor: () => void;
  onOpenSimulator: () => void;
  onOpenRos2?: () => void;
}

export const GoogleMapsBar: React.FC<GoogleMapsBarProps> = ({
  onOpenReport,
  onOpenAdvisor,
  onOpenSimulator,
  onOpenRos2,
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
    setIs2DMapPickerOpen,
    setIsOpenRocketModalOpen,
    setIsMissionSetupModalOpen,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);
  const [customLat, setCustomLat] = useState("-85.27");
  const [customLng, setCustomLng] = useState("4.00");
  const [customName, setCustomName] = useState("Custom Landing Target");

  const filteredTargets = NOTABLE_TARGETS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApplyCustomCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);
    if (isNaN(latNum) || isNaN(lngNum)) return;

    const clampedLat = Math.max(-90, Math.min(90, latNum));
    const clampedLng = Math.max(-180, Math.min(180, lngNum));

    const customTarget: LunarTarget = {
      id: `custom_${Date.now()}`,
      name: customName || `Target (${clampedLat.toFixed(2)}°, ${clampedLng.toFixed(2)}°)`,
      lat: clampedLat,
      lng: clampedLng,
      elevationM: Math.round(1200 + Math.random() * 800),
      description: `User-defined landing coordinates at ${clampedLat.toFixed(2)}° Lat, ${clampedLng.toFixed(2)}° Lng.`,
      isCandidate: true,
      category: "Artemis III",
    };

    setSelectedTarget(customTarget);
    setRightPanelOpen(true);
    setIsCoordModalOpen(false);
  };

  return (
    <>
      {/* ── TOP LEFT: SEARCH BAR & QUICK PILLS ── */}
      <div className="fixed top-3.5 left-4 z-40 flex flex-col gap-2 max-w-sm sm:max-w-md w-full select-none pointer-events-none font-sans">

        {/* Main Search Bar: Clean Google Maps Surface */}
        <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_2px_8px_rgba(60,64,67,0.22)] border border-[#E8EAED] flex items-center px-3.5 h-11 w-full transition-shadow hover:shadow-[0_4px_12px_rgba(60,64,67,0.28)]">
          {/* Blue Pin Icon */}
          <div className="w-7 h-7 rounded-xl bg-[#E8F0FE] flex items-center justify-center mr-2.5 flex-shrink-0 text-[#1A73E8] shadow-none">
            <MapPin className="w-4 h-4 text-[#1A73E8]" />
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search lunar craters, landing sites..."
            className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-[#202124] placeholder-[#5F6368] focus:outline-none"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDropdownOpen(false);
              }}
              className="p-1 text-[#5F6368] hover:text-[#202124] rounded-lg hover:bg-[#F1F3F4] transition-colors mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-1.5 text-[#5F6368] hover:text-[#202124] rounded-xl hover:bg-[#F1F3F4] transition-colors cursor-pointer"
            title="Search Site Database"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results Dropdown */}
        {dropdownOpen && (
          <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_8px_28px_rgba(60,64,67,0.28)] border border-[#E8EAED] p-2 max-h-72 overflow-y-auto animate-fade-in text-[#202124]">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider border-b border-[#E8EAED] mb-1">
              Candidate Lunar Landing Sites
            </div>
            {filteredTargets.map((t) => {
              const isSelected = selectedTarget.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTarget(t);
                    setSearchQuery("");
                    setDropdownOpen(false);
                    setRightPanelOpen(true);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-xs ${isSelected
                    ? "bg-[#E8F0FE] text-[#1A73E8] font-semibold"
                    : "hover:bg-[#F8F9FA] text-[#202124]"
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-[#1A73E8]" : "text-[#5F6368]"}`} />
                    <div>
                      <div className="text-xs font-semibold">{t.name}</div>
                      <div className={`text-[11px] truncate max-w-[200px] ${isSelected ? "text-[#1A73E8]/80" : "text-[#5F6368]"}`}>
                        {t.description}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono whitespace-nowrap pl-2 ${isSelected ? "text-[#1A73E8]" : "text-[#5F6368]"}`}>
                    {t.lat.toFixed(1)}°, {t.lng.toFixed(1)}°
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Filter Chips (Google Maps Pill Style) */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* ROS 2 Bridge Status Chip */}
          <button
            onClick={onOpenRos2}
            className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] hover:bg-[#D2E3FC] shadow-[0_1px_3px_rgba(60,64,67,0.12)] cursor-pointer"
            title="ROS 2 Node & Sensor Bridge Status (ws://localhost:9090)"
          >
            <span className="w-2 h-2 rounded-full bg-[#1A73E8] animate-pulse" />
            <span>ROS 2: Sim Mode</span>
          </button>

          {/* 3D Crater Section (Petavius 4K Sketchfab) Pill */}
          <button
            onClick={() => setViewMode(viewMode === "surface" ? "3d" : "surface")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_1px_3px_rgba(60,64,67,0.12)] ${
              viewMode === "surface"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "bg-white text-[#1A73E8] border border-[#DADCE0] hover:bg-[#F8F9FA]"
            }`}
            title="Inspect 3D Moon Crater Section (Petavius 4K Sketchfab & LiDAR Mesh)"
          >
            <Layers className={`w-3 h-3 ${viewMode === "surface" ? "text-white" : "text-[#1A73E8]"}`} />
            <span>3D Crater Section (4K)</span>
          </button>

          {/* Custom Coordinates Pill */}
          <button
            onClick={() => setIsCoordModalOpen(true)}
            className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 bg-white text-[#1A73E8] border border-[#DADCE0] hover:bg-[#F8F9FA] shadow-[0_1px_3px_rgba(60,64,67,0.12)] cursor-pointer"
            title="Enter Custom Coordinates (Lat, Lng)"
          >
            <Compass className="w-3 h-3 text-[#1A73E8]" />
            <span>Custom Coords</span>
          </button>

          {NOTABLE_TARGETS.slice(0, 4).map((t) => {
            const isSelected = selectedTarget.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTarget(t);
                  setRightPanelOpen(true);
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_1px_3px_rgba(60,64,67,0.12)] ${isSelected
                  ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                  : "bg-white text-[#202124] border border-[#DADCE0] hover:bg-[#F8F9FA]"
                  }`}
              >
                <MapPin className={`w-3 h-3 ${isSelected ? "text-white" : "text-[#1A73E8]"}`} />
                <span>{t.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TOP RIGHT: NAVIGATION & CONTROLS ── */}
      <div className="fixed top-3.5 right-4 z-40 flex items-center gap-2 select-none font-sans">

        {/* Navigation Mode Segmented Pills (Google Style) */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(60,64,67,0.22)] border border-[#E8EAED] p-1 flex items-center gap-1 max-w-[calc(100vw-360px)] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "3d"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="Step 1: Lunar Landing Site & Sun/Earth Ephemeris Assessment"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>1. Moon Site</span>
          </button>

          <button
            onClick={() => setViewMode("surface")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "surface"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="3D Moon Section & 4K Crater Terrain (Sketchfab / LiDAR Mesh)"
          >
            <Layers className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>3D Crater (4K)</span>
          </button>

          <button
            onClick={() => setIsMissionSetupModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1A73E8]"
            title="Step 2: Autonomous Launch Timing & Vehicle Setup"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>2. Plan Mission</span>
          </button>

          <button
            onClick={() => setViewMode("launch_sim")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "launch_sim"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="Step 3: 3D Earth Launch Simulation"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3. Liftoff</span>
          </button>

          <button
            onClick={() => setViewMode("orbit_preview")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "orbit_preview"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="Step 4: Trans-Lunar Orbit & Trajectory"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">4. Transit</span>
          </button>

          <button
            onClick={() => setViewMode("descent_sim")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "descent_sim"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="Step 5: 3D Lunar Powered Descent Simulation"
          >
            <Rocket className="w-3.5 h-3.5 text-[#FBBC05]" />
            <span className="hidden sm:inline">5. Landing</span>
          </button>

          <button
            onClick={() => setViewMode("surface_traverse")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "surface_traverse"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="Step 6: Surface Operations & Rover Traverse Route"
          >
            <Compass className="w-3.5 h-3.5 text-[#34A853]" />
            <span className="hidden sm:inline">6. Rover Traverse</span>
          </button>

          <button
            onClick={() => setViewMode("lunar_return")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === "lunar_return"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="Step 7: Lunar Liftoff & Return to Earth"
          >
            <Globe className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span className="hidden sm:inline">7. Earth Return</span>
          </button>

          <div className="h-4 w-px bg-[#E8EAED]" />

          <button
            onClick={() => setViewMode("earth")}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              viewMode === "earth"
                ? "bg-[#1A73E8] text-white font-semibold shadow-sm"
                : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4]"
            }`}
            title="Earth Mission Control & Space Weather Monitor"
          >
            <span>Earth Station</span>
          </button>
        </div>

        {/* 2D Lunar Map Picker Button */}
        <button
          onClick={() => setIs2DMapPickerOpen(true)}
          className="bg-white hover:bg-[#F8F9FA] text-[#202124] rounded-2xl px-3.5 h-10 flex items-center gap-2 border border-[#E8EAED] shadow-[0_2px_8px_rgba(60,64,67,0.18)] text-xs font-medium transition-all cursor-pointer"
          title="Open Global 2D Lunar Map & Safe Zones"
        >
          <MapIcon className="w-4 h-4 text-[#1A73E8]" />
          <span className="hidden md:inline">2D Map</span>
          <span className="w-2 h-2 rounded-full bg-[#34A853]" title="Safe Sites Active" />
        </button>

        {/* OpenRocket Studio Button */}
        <button
          onClick={() => setIsOpenRocketModalOpen(true)}
          className="bg-white hover:bg-[#F8F9FA] text-[#1A73E8] rounded-2xl px-3.5 h-10 flex items-center gap-1.5 border border-[#E8EAED] shadow-[0_2px_8px_rgba(60,64,67,0.18)] text-xs font-semibold transition-all cursor-pointer"
          title="Open OpenRocket Studio & NASA Vehicles"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FBBC05]" />
          <span className="hidden lg:inline">OpenRocket</span>
        </button>

        {/* Polygon Area Tool (Moon views only) */}
        {viewMode !== "earth" && viewMode !== "orbit_preview" && viewMode !== "launch_sim" && viewMode !== "descent_sim" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPolygonMode(!isPolygonMode)}
              className={`rounded-2xl px-3.5 h-10 flex items-center gap-2 border text-xs font-medium transition-colors cursor-pointer shadow-[0_2px_8px_rgba(60,64,67,0.18)] ${isPolygonMode
                ? "bg-[#1A73E8] text-white border-[#1A73E8]"
                : "bg-white text-[#202124] border-[#E8EAED] hover:bg-[#F8F9FA]"
                }`}
              title="Lasso / Polygon Area Hazard Selection"
            >
              <Pentagon className="w-4 h-4" />
              <span className="hidden sm:inline">{isPolygonMode ? `Polygon (${polygonPoints.length})` : "Polygon"}</span>
            </button>
            {polygonPoints.length > 0 && (
              <button
                onClick={clearPolygon}
                className="bg-white hover:bg-[#FEEFC3] text-[#EA4335] rounded-2xl w-10 h-10 flex items-center justify-center border border-[#E8EAED] transition-colors cursor-pointer shadow-[0_2px_8px_rgba(60,64,67,0.18)]"
                title="Clear Polygon"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Multi-Site Comparison Modal Button */}
        {viewMode !== "earth" && viewMode !== "orbit_preview" && viewMode !== "launch_sim" && viewMode !== "descent_sim" && (
          <button
            onClick={() => setIsComparisonModalOpen(true)}
            className="bg-white hover:bg-[#F8F9FA] text-[#202124] rounded-2xl px-3.5 h-10 flex items-center gap-1.5 border border-[#E8EAED] text-xs font-medium transition-colors cursor-pointer shadow-[0_2px_8px_rgba(60,64,67,0.18)]"
            title="Side-by-Side Landing Site Comparison"
          >
            <Layers className="w-4 h-4 text-[#1A73E8]" />
            <span className="hidden lg:inline">Compare</span>
          </button>
        )}

        {/* Mission Simulator Launch Button */}
        <button
          onClick={onOpenSimulator}
          className="bg-[#1A73E8] hover:bg-[#1565C0] text-white rounded-2xl px-4 h-10 flex items-center gap-2 shadow-[0_2px_8px_rgba(26,115,232,0.35)] text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
          title="Interactive Mission Flight Simulation"
        >
          <Rocket className="w-4 h-4" />
          <span className="hidden md:inline">Mission Sim</span>
        </button>

        {/* AI Science Advisor Button */}
        <button
          onClick={onOpenAdvisor}
          className="bg-white hover:bg-[#F8F9FA] text-[#202124] rounded-2xl px-3.5 h-10 flex items-center gap-2 border border-[#E8EAED] text-xs font-medium transition-colors cursor-pointer shadow-[0_2px_8px_rgba(60,64,67,0.18)]"
          title="NASA Scientific AI Advisor"
        >
          <Sparkles className="w-4 h-4 text-[#FBBC05]" />
          <span className="hidden lg:inline">AI Advisor</span>
        </button>

        {/* Scientific Briefing Report Button */}
        <button
          onClick={onOpenReport}
          className="bg-white hover:bg-[#F8F9FA] text-[#202124] rounded-2xl px-3.5 h-10 flex items-center gap-1.5 border border-[#E8EAED] text-xs font-medium transition-colors cursor-pointer shadow-[0_2px_8px_rgba(60,64,67,0.18)]"
          title="Export Flight Assessment Briefing"
        >
          <FileText className="w-4 h-4 text-[#5F6368]" />
          <span className="hidden sm:inline">Briefing</span>
        </button>
      </div>

      {/* ── CUSTOM COORDINATES MODAL ── */}
      {isCoordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none font-sans pointer-events-auto animate-fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 max-w-sm w-full shadow-[0_16px_48px_rgba(15,23,42,0.22)] space-y-4 text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-white">
                  <Compass className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Custom Lunar Coordinates</h3>
                  <p className="text-xs text-[#64748B]">Enter latitude and longitude coordinates</p>
                </div>
              </div>
              <button
                onClick={() => setIsCoordModalOpen(false)}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyCustomCoordinates} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                  Site Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Malapert South Ridge"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F172A] rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                    Latitude (-90° to +90°)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="-90"
                    max="90"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    required
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F172A] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#0F172A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                    Longitude (-180° to +180°)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="-180"
                    max="180"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    required
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F172A] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#0F172A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-3 text-xs text-[#C2410C] flex items-center gap-2.5 font-medium">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Polar South sites (-80° to -90°) feature high illumination & water-ice deposits.</span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCoordModalOpen(false)}
                  className="flex-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] py-2.5 px-4 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0F172A] hover:bg-[#1E293B] text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Set Coords</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleMapsBar;

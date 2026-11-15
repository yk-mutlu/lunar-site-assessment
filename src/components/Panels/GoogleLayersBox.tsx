// ═══════════════════════════════════════════════════════════════════════
// GoogleLayersBox.tsx
// Google Maps-Style Floating Layer Selector Panel
// Minimalist, Clean White Surface in English with NASA PDS Verified Datasets
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useState } from "react";
import { useStore } from "@/store";
import type { LayerMode } from "@/types";
import { Layers, X, Check, ShieldCheck } from "lucide-react";

interface LayerOption {
  id: LayerMode;
  name: string;
  source: string;
  badge: string;
  previewColor: string;
  description: string;
}

const LAYERS: LayerOption[] = [
  {
    id: "imagery",
    name: "Surface Imagery",
    source: "NASA LRO WAC",
    badge: "100 m/px",
    previewColor: "#555A64",
    description: "Global morphologic lunar surface photographic mosaic.",
  },
  {
    id: "elevation",
    name: "Elevation (DEM)",
    source: "NASA LOLA",
    badge: "30 m/px",
    previewColor: "#34A853",
    description: "Laser altimeter gridded spectral topography and elevation.",
  },
  {
    id: "slope",
    name: "Slope Hazard",
    source: "LOLA Derived",
    badge: "Slope Angles",
    previewColor: "#EA4335",
    description: "Static tip-over slope threshold and terrain gradients.",
  },
  {
    id: "water_ice",
    name: "Water Ice / PSR",
    source: "NASA LEND",
    badge: "Cold Traps",
    previewColor: "#1A73E8",
    description: "Epithermal neutron suppression and cryogenic volatile traps.",
  },
];

export const GoogleLayersBox: React.FC = () => {
  const { activeLayer, setActiveLayer, layerOpacity, setLayerOpacity } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-4 z-40 select-none font-sans">
      {!isOpen ? (
        /* Floating Google Maps Layers Pill */
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white hover:bg-[#F8F9FA] text-[#202124] rounded-2xl p-2.5 shadow-[0_2px_8px_rgba(60,64,67,0.22)] border border-[#E8EAED] flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
          title="Switch Map Layers"
        >
          <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] flex items-center justify-center flex-shrink-0 text-[#1A73E8]">
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-left pr-2">
            <div className="text-xs font-semibold text-[#202124]">Layers</div>
            <div className="text-[11px] text-[#5F6368] truncate max-w-[100px]">
              {LAYERS.find((l) => l.id === activeLayer)?.name}
            </div>
          </div>
        </button>
      ) : (
        /* Expanded Floating Google Maps Layers Panel */
        <div className="bg-white rounded-2xl shadow-[0_8px_28px_rgba(60,64,67,0.28)] border border-[#E8EAED] p-4 w-80 animate-fade-in space-y-3.5 text-[#202124]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1A73E8]" />
              <span className="text-sm font-semibold text-[#202124]">Map Layers & Overlays</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Clean Thumbnail Grid Cards */}
          <div className="grid grid-cols-2 gap-2">
            {LAYERS.map((layer) => {
              const isSelected = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20 cursor-pointer ${
                    isSelected
                      ? "border-[#1A73E8] bg-[#E8F0FE] font-medium"
                      : "border-[#E8EAED] hover:border-[#DADCE0] bg-[#F8F9FA] hover:bg-[#F1F3F4]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: layer.previewColor }}
                    />
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-[#1A73E8] text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#202124]">{layer.name}</div>
                    <div className="text-[10px] text-[#5F6368]">{layer.source}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Opacity Slider */}
          <div className="pt-2 border-t border-[#E8EAED] space-y-1">
            <div className="flex justify-between text-xs text-[#5F6368]">
              <span>Layer Opacity</span>
              <span className="font-semibold text-[#202124]">{Math.round(layerOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={layerOpacity}
              onChange={(e) => setLayerOpacity(Number(e.target.value))}
              className="w-full accent-[#1A73E8] h-1.5 bg-[#E8EAED] rounded-lg cursor-pointer"
            />
          </div>

          {/* PDS Verification Badge */}
          <div className="flex items-center gap-1.5 text-[10px] text-[#5F6368] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34A853]" />
            <span>NASA Planetary Data System (PDS) Calibrated</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleLayersBox;

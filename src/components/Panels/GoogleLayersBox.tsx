"use client";

import React, { useState } from "react";
import { useStore } from "@/store";
import type { LayerMode } from "@/types";
import { Layers, X, Check, Sliders, ShieldCheck } from "lucide-react";

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
    name: "Yüzey Fotoğrafı",
    source: "NASA LRO WAC",
    badge: "100 m/px",
    previewColor: "#555a64",
    description: "Gerçek morfolojik Ay yüzeyi fotoğraf mozaiği.",
  },
  {
    id: "elevation",
    name: "Yükseklik (DEM)",
    source: "NASA LOLA",
    badge: "30 m/px",
    previewColor: "#2ecc40",
    description: "Lazer altimetre verileriyle spektral rakım haritası.",
  },
  {
    id: "slope",
    name: "Eğim Tehlikesi",
    source: "LOLA Türevi",
    badge: "Eğim Açısı",
    previewColor: "#d86c6c",
    description: "İniş aracı için statik devrilme ve eğim haritası.",
  },
  {
    id: "water_ice",
    name: "Su Buzu / PSR",
    source: "NASA LEND",
    badge: "Kutup Kraterleri",
    previewColor: "#4a9eff",
    description: "Kalıcı gölgeli bölgelerdeki hidrojen konsantrasyonu.",
  },
];

export const GoogleLayersBox: React.FC = () => {
  const { activeLayer, setActiveLayer, layerOpacity, setLayerOpacity } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-4 z-40 select-none font-sans">
      {!isOpen ? (
        /* The Sleek Floating Layers Button */
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#181a20]/95 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] rounded-2xl p-2.5 shadow-tesla border border-[#282a33] flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[rgba(216,108,108,0.15)] flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-[#d86c6c]" />
          </div>
          <div className="text-left pr-2">
            <div className="text-xs font-semibold text-[#f4f4f6]">Katmanlar</div>
            <div className="text-[11px] text-[#9496a1] truncate max-w-[90px]">
              {LAYERS.find((l) => l.id === activeLayer)?.name}
            </div>
          </div>
        </button>
      ) : (
        /* Expanded Floating Tesla Layers Panel */
        <div className="bg-[#181a20]/95 backdrop-blur-md rounded-2xl shadow-tesla border border-[#282a33] p-4 w-80 animate-fade-in space-y-3.5 text-[#f4f4f6]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#282a33]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#d86c6c]" />
              <span className="text-sm font-semibold text-[#f4f4f6]">Harita Katmanları</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-[#9496a1] hover:text-[#f4f4f6] hover:bg-[#22242c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 4 Clean Thumbnail Grid Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {LAYERS.map((layer) => {
              const isSelected = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20 cursor-pointer ${
                    isSelected
                      ? "border-[#d86c6c] bg-[rgba(216,108,108,0.12)] font-medium"
                      : "border-[#282a33] hover:border-[#3a3d4a] bg-[#121317] hover:bg-[#1a1c23]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: layer.previewColor }}
                    />
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-[#d86c6c] text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#f4f4f6]">{layer.name}</div>
                    <div className="text-[10px] text-[#9496a1]">{layer.source}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Opacity Slider */}
          <div className="pt-2 border-t border-[#282a33] space-y-1">
            <div className="flex justify-between text-xs text-[#9496a1]">
              <span>Katman Opaklığı</span>
              <span className="font-semibold text-[#f4f4f6]">{Math.round(layerOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={layerOpacity}
              onChange={(e) => setLayerOpacity(Number(e.target.value))}
              className="w-full accent-[#d86c6c] h-1.5 bg-[#22242c] rounded-lg cursor-pointer"
            />
          </div>

          {/* PDS Verification Badge */}
          <div className="flex items-center gap-1.5 text-[10px] text-[#9496a1] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34c759]" />
            <span>NASA Planetary Data System (PDS) Onaylı</span>
          </div>
        </div>
      )}
    </div>
  );
};

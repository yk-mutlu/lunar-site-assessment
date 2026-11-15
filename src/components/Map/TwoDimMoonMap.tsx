"use client";

import React, { useRef, useState, useEffect } from "react";
import { useStore, NOTABLE_TARGETS } from "@/store";
import { computePolygonStats } from "@/data/polygon-analytics";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Crosshair,
  Pentagon,
  Check,
  Trash2,
  MapPin,
  Layers,
  ShieldCheck,
  Rocket,
} from "lucide-react";
import { PRESET_SAFE_LUNAR_SITES } from "@/data/lunar-safe-sites";

export const TwoDimMoonMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Default scale at 0.85 to frame the entire Moon surface cleanly without cutting off margins
  const [scale, setScale] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [hoverCoord, setHoverCoord] = useState<{ lat: number; lng: number } | null>(null);

  const {
    activeLayer,
    layerOpacity,
    selectedTarget,
    setSelectedTarget,
    isPolygonMode,
    polygonPoints,
    addPolygonPoint,
    clearPolygon,
    setPolygonStats,
    activeLander,
    setViewMode,
  } = useStore();

  const layerTextureMap: Record<string, string> = {
    imagery: "/textures/moon_surface.jpg",
    elevation: "/textures/layer_elevation.jpg",
    slope: "/textures/layer_slope.jpg",
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
    if (isPolygonMode) {
      const coord = toLatLng(e.clientX, e.clientY);
      if (coord) {
        addPolygonPoint(coord);
        const newPts = [...polygonPoints, coord];
        if (newPts.length >= 3) {
          const stats = computePolygonStats(newPts, activeLander);
          setPolygonStats(stats);
        }
      }
    } else {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coord = toLatLng(e.clientX, e.clientY);
    setHoverCoord(coord);

    if (isPanning && !isPolygonMode) {
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
    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8;
    setScale((prev) => Math.max(1, Math.min(24, prev * zoomFactor)));
  };

  const polygonSvgPoints = polygonPoints
    .map((pt) => {
      const { x, y } = toMapCoords(pt.lat, pt.lng);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none bg-[#0d0e12] ${
        isPolygonMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {/* 2D Map Canvas Layer with Zoom and Pan */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out origin-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        <div className="relative w-full max-w-5xl aspect-[2/1] rounded-2xl overflow-hidden shadow-tesla border border-[#282a33] bg-[#12141a]">
          {/* Base Moon Texture */}
          <img
            src="/textures/moon_surface.jpg"
            alt="Moon Surface"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Active Scientific Layer Overlay */}
          {activeLayer !== "imagery" && (
            <img
              src={layerTextureMap[activeLayer]}
              alt={activeLayer}
              style={{ opacity: layerOpacity }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen transition-opacity"
            />
          )}

          {/* Cartographic Coordinate Graticule (Lat/Lng Grid) */}
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
                  stroke="rgba(255,255,255,0.14)"
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
                  stroke="rgba(255,255,255,0.14)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Polygon Area Drawing Layer */}
            {polygonPoints.length > 0 && (
              <g>
                {polygonPoints.length >= 3 && (
                  <polygon
                    points={polygonSvgPoints}
                    fill="rgba(216, 108, 108, 0.22)"
                    stroke="#d86c6c"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}
                {polygonPoints.length < 3 && (
                  <polyline
                    points={polygonSvgPoints}
                    fill="none"
                    stroke="#d86c6c"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}
              </g>
            )}
          </svg>

          {/* Polygon Vertex Dots */}
          {polygonPoints.map((pt, idx) => {
            const { x, y } = toMapCoords(pt.lat, pt.lng);
            return (
              <div
                key={idx}
                className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full bg-[#d86c6c] border-2 border-white shadow-md pointer-events-none z-20 flex items-center justify-center"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <span className="text-[8px] font-bold text-white leading-none">
                  {idx + 1}
                </span>
              </div>
            );
          })}

          {/* Notable Target Markers */}
          {NOTABLE_TARGETS.map((target) => {
            const { x, y } = toMapCoords(target.lat, target.lng);
            const isSelected = selectedTarget.id === target.id;
            return (
              <div
                key={target.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTarget(target);
                }}
                className="absolute group z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-125 ${
                    isSelected
                      ? "bg-[#d86c6c] text-white shadow-md scale-110"
                      : "bg-[#181a20]/95 text-[#f4f4f6] border border-[#282a33] shadow-sm hover:bg-[rgba(216,108,108,0.2)] hover:text-[#d86c6c]"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 fill-current" />
                </div>
                {/* Label tooltip */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded-md text-[10px] font-sans font-medium whitespace-nowrap shadow-tesla pointer-events-none transition-opacity ${
                    isSelected
                      ? "opacity-100 bg-[#d86c6c] text-white"
                      : "opacity-0 group-hover:opacity-100 bg-[#181a20] text-[#f4f4f6] border border-[#282a33]"
                  }`}
                >
                  {target.name}
                </div>
              </div>
            );
          })}

          {/* ── SAFE LANDING SITES (PROMINENT GREEN HALO & SAFETY BADGE) ── */}
          {PRESET_SAFE_LUNAR_SITES.map((site) => {
            const { x, y } = toMapCoords(site.lat, site.lng);
            const isSelected = selectedTarget.id === site.id;
            return (
              <div
                key={`safe-${site.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const targetObj = {
                    id: site.id,
                    name: site.name,
                    lat: site.lat,
                    lng: site.lng,
                    elevationM: site.elevationM,
                    description: site.description,
                    isCandidate: true,
                    category: (site.category === "Custom" ? "Artemis III" : site.category) as "Artemis III" | "CLPS" | "Apollo",
                  };
                  setSelectedTarget(targetObj);
                }}
                className="absolute group z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {/* Glowing Safe Radius Ring */}
                <div className="absolute -inset-3 rounded-full bg-[#34c759]/20 border border-[#34c759]/50 animate-pulse pointer-events-none" />

                {/* Rank Badge */}
                <div className="w-6 h-6 rounded-full bg-[#101217] border-2 border-[#34c759] text-[#4ade80] flex items-center justify-center font-bold text-[10px] shadow-lg group-hover:scale-125 transition-transform">
                  <span>{site.safetyRank}</span>
                </div>

                {/* Badge Label */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded-lg bg-[#101217]/95 border border-[#34c759]/60 text-white text-[10px] font-sans font-bold whitespace-nowrap shadow-lg flex items-center gap-1 group-hover:border-[#34c759] transition-all pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                  <span>{site.shortName}</span>
                  <span className="text-[#34c759] font-mono">%{site.safetyScorePct}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating 2D Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        <button
          onClick={() => setScale((s) => Math.min(24, s * 1.3))}
          className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-[#E8EAED] flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-[#5F6368]" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(1, s / 1.3))}
          className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-[#E8EAED] flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-[#5F6368]" />
        </button>
        <button
          onClick={() => {
            setScale(0.85);
            setPan({ x: 0, y: 0 });
          }}
          className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-[#E8EAED] flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          title="Reset Map View (100%)"
        >
          <RotateCcw className="w-4 h-4 text-[#5F6368]" />
        </button>
      </div>

      {/* Top Center Controls: Surface Descent Button, Transfer Preview & Coordinates Indicator (Unobstructed by bottom Ephemeris Bar) */}
      <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 select-none pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Transfer Preview Button */}
          <button
            onClick={() => setViewMode("orbit_preview")}
            className="bg-[#1A73E8] hover:bg-[#1557B0] text-white px-4 py-1.5 rounded-full shadow-md flex items-center gap-2 text-xs font-medium transition-all active:scale-95 cursor-pointer"
            title="View Earth-Moon Transfer Trajectory and Descent Arc"
          >
            <Rocket className="w-3.5 h-3.5 fill-current" />
            <span>Preview Launch & Trajectory</span>
          </button>

          <button
            onClick={() => setViewMode("surface")}
            className="bg-white hover:bg-[#F8F9FA] text-[#202124] px-4 py-1.5 rounded-full shadow-md border border-[#E8EAED] flex items-center gap-2 text-xs font-medium transition-all active:scale-95 cursor-pointer"
            title="Inspect Sub-Meter Surface Topology at Current Target"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#1A73E8]" />
            <span>Descend to Surface (Sub-Meter)</span>
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-[#E8EAED] flex items-center gap-3 text-xs font-mono text-[#5F6368]">
          <Crosshair className="w-3.5 h-3.5 text-[#137333]" />
          <span className="text-[#202124] font-medium">
            {hoverCoord
              ? `${hoverCoord.lat >= 0 ? `${hoverCoord.lat}°N` : `${Math.abs(hoverCoord.lat)}°S`}, ${
                  hoverCoord.lng >= 0 ? `${hoverCoord.lng}°E` : `${Math.abs(hoverCoord.lng)}°W`
                }`
              : "Move cursor across lunar surface"}
          </span>
          <span className="text-[#E8EAED]">|</span>
          <span className="text-[#137333] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#137333]" />
            Safe Sites Active
          </span>
          <span className="text-[#E8EAED]">|</span>
          <span>Scale: {scale.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
};

export default TwoDimMoonMap;

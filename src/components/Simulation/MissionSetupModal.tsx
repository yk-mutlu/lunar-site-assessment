// ═══════════════════════════════════════════════════════════════════════
// MissionSetupModal.tsx
// End-to-End Mission Planning & Launch Window Recommendation Modal
// Bridges Lunar Site Evaluation (Step 1) to Earth Liftoff & Return (Steps 2-7)
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store";
import { NASA_ROCKET_VEHICLES, RocketVehicle } from "@/data/rocket-vehicles";
import {
  computeRocketFlightTrajectory,
  downloadOpenRocketFile,
} from "@/data/openrocket-engine";
import {
  X,
  Rocket,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MapPin,
  Sun,
  Radio,
  Zap,
  Layers,
  Compass,
  FileCode,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export const MissionSetupModal: React.FC = () => {
  const {
    isMissionSetupModalOpen,
    setIsMissionSetupModalOpen,
    selectedTarget,
    selectedSafeLunarSite,
    selectedRocket,
    setSelectedRocket,
    missionRecommendation,
    recomputeMissionRecommendation,
    setViewMode,
    setIsOpenRocketModalOpen,
    setLatestLaunchReport,
  } = useStore();

  const [customLaunchDate, setCustomLaunchDate] = useState("");
  const [useRecommendedDate, setUseRecommendedDate] = useState(true);

  useEffect(() => {
    if (isMissionSetupModalOpen) {
      recomputeMissionRecommendation();
    }
  }, [isMissionSetupModalOpen, recomputeMissionRecommendation]);

  useEffect(() => {
    if (missionRecommendation) {
      setCustomLaunchDate(missionRecommendation.recommendedLaunchDate);
    }
  }, [missionRecommendation]);

  if (!isMissionSetupModalOpen) return null;

  const activeTarget = selectedSafeLunarSite || selectedTarget;
  const rec = missionRecommendation;

  const handleStartMission = () => {
    // Generate fresh trajectory report for the launch simulation
    const report = computeRocketFlightTrajectory(selectedRocket);
    setLatestLaunchReport(report);

    setIsMissionSetupModalOpen(false);
    // Proceed directly to Stage 1: Earth Liftoff
    setViewMode("launch_sim");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm select-none font-sans animate-fade-in text-[#202124]">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white border border-[#E8EAED] rounded-2xl shadow-[0_12px_40px_rgba(60,64,67,0.28)] flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#E8EAED] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] flex items-center justify-center text-[#1A73E8] flex-shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#202124]">
                  NASA Mission Planning & Trajectory Recommendations
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F4EA] text-[#137333]">
                  Science & Engineering Aligned
                </span>
              </div>
              <p className="text-xs text-[#5F6368]">
                Step 2 of 7: Autonomous lighting window calculations, recommended launch timing, and delta-V budget.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMissionSetupModalOpen(false)}
            className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* 1. Target Site Summary Card */}
          <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E8EAED] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider block">
                Selected Landing Target
              </span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1A73E8]" />
                <span className="text-base font-bold text-[#202124]">
                  {activeTarget.name}
                </span>
                <span className="text-xs font-mono text-[#5F6368]">
                  ({activeTarget.lat.toFixed(2)}°, {activeTarget.lng.toFixed(2)}°)
                </span>
              </div>
              <p className="text-xs text-[#5F6368] max-w-xl">
                {activeTarget.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="bg-white p-2.5 rounded-lg border border-[#E8EAED]">
                <span className="text-[10px] text-[#5F6368] block">Daylight Uptime</span>
                <span className="font-bold text-[#137333] text-sm">
                  {rec.solarIlluminationWindowDays} Days
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#E8EAED]">
                <span className="text-[10px] text-[#5F6368] block">Direct Comms</span>
                <span className="font-bold text-[#1A73E8] text-sm">
                  {rec.surfaceStrategy.communicationLinkType.includes("Direct") ? "Active LOS" : "Relay Req."}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Scientific Launch Date & Lighting Window Recommendation */}
          <div className="p-4 bg-[#E8F0FE]/40 rounded-xl border border-[#1A73E8]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1A73E8]" />
                <span className="font-bold text-sm text-[#1A73E8]">
                  Autonomous Launch Window Recommendation
                </span>
              </div>
              <span className="text-[10px] font-semibold bg-[#E8F0FE] text-[#1A73E8] px-2.5 py-0.5 rounded-full border border-[#1A73E8]/30">
                100.8 hr TLI Transfer
              </span>
            </div>

            <p className="text-xs text-[#5F6368] leading-relaxed">
              To maximize solar power availability and mission lifetime, the lunar lander must touch down at local sunrise. Based on the 29.5-day synodic cycle at <span className="font-semibold text-[#202124]">{activeTarget.name}</span>, the optimal lunar touchdown window is <span className="font-semibold text-[#137333]">{rec.landingDate}</span>. Subtracting the 4.2-day orbital coast yields the recommended Earth launch window:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-xl border border-[#E8EAED] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#5F6368] block uppercase font-semibold">Recommended Earth Launch</span>
                  <span className="text-sm font-bold text-[#1A73E8] font-mono">
                    {rec.recommendedLaunchDate.replace("T", " ")} UTC
                  </span>
                </div>
                <Calendar className="w-5 h-5 text-[#1A73E8]" />
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#E8EAED] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#5F6368] block uppercase font-semibold">Target Lunar Touchdown</span>
                  <span className="text-sm font-bold text-[#137333] font-mono">
                    {rec.landingDate.replace("T", " ")} UTC
                  </span>
                </div>
                <Clock className="w-5 h-5 text-[#137333]" />
              </div>
            </div>
          </div>

          {/* 3. Launch Vehicle Selection & OpenRocket Match */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#202124]">
                  Select Launch Vehicle (NASA Space Apps Fleet)
                </h3>
                <p className="text-[11px] text-[#5F6368]">
                  Verified with 1976 US Standard Atmosphere RK4 equations and OpenRocket (&gt;= 96% match).
                </p>
              </div>

              <button
                onClick={() => setIsOpenRocketModalOpen(true)}
                className="text-xs font-semibold text-[#1A73E8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>OpenRocket Studio</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {NASA_ROCKET_VEHICLES.map((rocket) => {
                const isSelected = selectedRocket.id === rocket.id;
                return (
                  <div
                    key={rocket.id}
                    onClick={() => setSelectedRocket(rocket)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-[#1A73E8] bg-[#E8F0FE]/20 shadow-sm"
                        : "border-[#E8EAED] hover:border-[#DADCE0] bg-white"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#202124]">{rocket.name.split(" (")[0]}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#1A73E8]" />}
                      </div>
                      <p className="text-[10px] text-[#5F6368] line-clamp-2">
                        {rocket.program} • {rocket.historicalContext}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E8EAED] text-[10px] grid grid-cols-2 gap-1 text-[#5F6368]">
                      <div>
                        <span>Thrust:</span>
                        <strong className="text-[#202124] block">{(rocket.liftoffThrustKn / 1000).toFixed(1)} MN</strong>
                      </div>
                      <div>
                        <span>TLI Payload:</span>
                        <strong className="text-[#137333] block">{(rocket.payloadToTliKg / 1000).toFixed(1)} tons</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Complete Mission Delta-V Budget Breakdown */}
          <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E8EAED] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#202124] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#1A73E8]" />
                <span>Mission Delta-V (&Delta;V) Budget Allocation</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#1A73E8]">
                Total: {rec.deltaVBudget.totalMissionDeltaVMs.toLocaleString()} m/s
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[10px]">
              <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                <span className="text-[#5F6368] block">LEO Liftoff</span>
                <strong className="text-[#202124] font-mono">{rec.deltaVBudget.earthLiftoffToLeo} m/s</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                <span className="text-[#5F6368] block">TLI Burn</span>
                <strong className="text-[#202124] font-mono">{rec.deltaVBudget.translunarInjectionTli} m/s</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                <span className="text-[#5F6368] block">Orbit (LOI)</span>
                <strong className="text-[#202124] font-mono">{rec.deltaVBudget.lunarOrbitInsertionLoi} m/s</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                <span className="text-[#5F6368] block">Descent</span>
                <strong className="text-[#202124] font-mono">{rec.deltaVBudget.poweredDescentToSurface} m/s</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                <span className="text-[#5F6368] block">Lunar Ascent</span>
                <strong className="text-[#202124] font-mono">{rec.deltaVBudget.lunarAscentToOrbit} m/s</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                <span className="text-[#5F6368] block">TEI Return</span>
                <strong className="text-[#202124] font-mono">{rec.deltaVBudget.transEarthInjectionTei} m/s</strong>
              </div>
            </div>
          </div>

          {/* 5. Surface Operations & Science Strategy */}
          <div className="p-3.5 bg-white rounded-xl border border-[#E8EAED] flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[#5F6368]">
                Planned Surface Traverse & Science Objective
              </span>
              <p className="text-xs text-[#202124] font-medium">
                {rec.surfaceStrategy.primaryObjective}
              </p>
            </div>
            <div className="text-right pl-4">
              <span className="text-[10px] text-[#5F6368] block">Target Yield</span>
              <span className="font-bold text-[#137333] text-sm">
                ~{rec.surfaceStrategy.estimatedWaterIceYieldKg} kg H₂O
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#E8EAED] bg-white flex items-center justify-between">
          <button
            onClick={() => setIsMissionSetupModalOpen(false)}
            className="text-xs font-semibold text-[#5F6368] hover:text-[#202124] px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Cancel & Return to Moon
          </button>

          <button
            onClick={handleStartMission}
            className="bg-[#1A73E8] hover:bg-[#1565C0] text-white px-6 py-2.5 rounded-xl font-semibold text-xs shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Authorize Mission & Begin Stage 1 Liftoff</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default MissionSetupModal;

// ═══════════════════════════════════════════════════════════════════════
// RocketFlightReportModal.tsx
// Comprehensive Post-Launch Telemetry & OpenRocket Scientific Flight Report
// Minimalist, Clean White / Navy / Dark Orange CustomTkinter UI
// ═══════════════════════════════════════════════════════════════════════

"use client";

import React from "react";
import { useStore } from "@/store";
import {
  X,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Download,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { downloadOpenRocketFile } from "@/data/openrocket-engine";

export const RocketFlightReportModal: React.FC = () => {
  const {
    isFlightReportModalOpen,
    setIsFlightReportModalOpen,
    latestLaunchReport,
    selectedRocket,
    setIsOpenRocketModalOpen,
  } = useStore();

  if (!isFlightReportModalOpen || !latestLaunchReport || !selectedRocket) {
    return null;
  }

  const report = latestLaunchReport;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans select-none">
      <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_12px_40px_rgba(15,23,42,0.18)] overflow-hidden text-[#0F172A]">

        {/* Header */}
        <div className="p-4 px-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#C2410C]">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">
                  NASA Flight Telemetry & OpenRocket Report
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803d]">
                  Stage 1 Validated
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Vehicle: <strong className="text-[#0F172A]">{report.rocketName}</strong> ({report.designation}) • {report.program}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsFlightReportModalOpen(false)}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">

          {/* Top Banner: Apogee & Orbital Insertion */}
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#15803d]" />
                <span>Orbital Insertion Verdict</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-[#DCFCE7] text-[#15803d]">
                {report.flightSuitabilityVerdict}
              </span>
            </div>
            <p className="text-[#64748B] leading-relaxed">{report.suitabilityExplanation}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Apogee Altitude</span>
                <span className="font-mono text-sm font-bold text-[#0F172A]">
                  {report.apogeeAltitudeKm} km
                </span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Max Velocity</span>
                <span className="font-mono text-sm font-bold text-[#C2410C]">
                  {report.maxVelocityMs.toLocaleString()} m/s
                </span>
                <span className="text-xs text-[#64748B] block mt-0.5">Mach {report.maxVelocityMach}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Max Acceleration</span>
                <span className="font-mono text-sm font-bold text-[#15803d]">
                  {report.maxAccelerationG} G
                </span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Max-Q Pressure</span>
                <span className="font-mono text-sm font-bold text-[#B45309]">
                  {report.maxDynamicPressureKpa} kPa
                </span>
                <span className="text-xs text-[#64748B] block mt-0.5">at {report.maxQAltitudeKm} km</span>
              </div>
            </div>
          </div>

          {/* Staging Timeline */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] space-y-2.5">
            <h4 className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#C2410C]" />
              <span>Flight Events & Staging Milestones</span>
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Liftoff & Ignition:</span>
                <span className="font-mono font-bold text-[#0F172A]">T+00:00 (Pad Clear)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Max-Q (Maximum Dynamic Pressure):</span>
                <span className="font-mono font-bold text-[#B45309]">
                  T+{report.maxQTimeSeconds}s ({report.maxDynamicPressureKpa} kPa)
                </span>
              </div>
              {report.boosterSeparationTimeS && (
                <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                  <span className="text-[#64748B]">Solid Rocket Booster (SRB) Separation:</span>
                  <span className="font-mono font-bold text-[#0F172A]">
                    T+{report.boosterSeparationTimeS}s (Jettisoned)
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Main Engine Cut-Off (MECO - Stage 1):</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  T+{report.stage1BurnoutTimeS}s
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Second Stage Burnout & Orbital Insertion:</span>
                <span className="font-mono font-bold text-[#15803d]">
                  T+{report.totalFlightTimeS}s (LEO Injection)
                </span>
              </div>
            </div>
          </div>

          {/* Energy & Losses Budget */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] space-y-2.5">
            <h4 className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#15803d]" />
              <span>Delta-V Energy Budget & Atmospheric Losses</span>
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Theoretical Ideal ΔV</span>
                <span className="font-mono text-xs font-bold text-[#0F172A]">
                  {report.idealDeltaVMs.toLocaleString()} m/s
                </span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Gravity Losses</span>
                <span className="font-mono text-xs font-bold text-[#B91C1C]">
                  -{report.gravityLossDeltaVMs.toLocaleString()} m/s
                </span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-medium block">Aerodynamic Drag Losses</span>
                <span className="font-mono text-xs font-bold text-[#B45309]">
                  -{report.dragLossDeltaVMs.toLocaleString()} m/s
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#DCFCE7] border border-[#86EFAC] rounded-2xl flex items-center justify-between text-xs text-[#15803d]">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>OpenRocket Benchmark Agreement:</span>
              </span>
              <span className="font-mono font-bold text-sm">{report.openRocketAgreementPct}% Match (&ge; 96% NASA Standard)</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <button
            onClick={() => {
              setIsFlightReportModalOpen(false);
              setIsOpenRocketModalOpen(true);
            }}
            className="text-xs text-[#C2410C] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open in OpenRocket 3D Studio →</span>
          </button>

          <button
            onClick={() => downloadOpenRocketFile(selectedRocket, report)}
            className="bg-[#C2410C] hover:bg-[#9A3412] text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export OpenRocket (.ork.xml)</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default RocketFlightReportModal;

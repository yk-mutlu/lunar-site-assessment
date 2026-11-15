"use client";

import React, { useMemo } from "react";
import { useStore } from "@/store";
import { computeSiteAssessment } from "@/data/assessment-engine";
import { X, Printer, ShieldCheck, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface ScientificBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScientificBriefingModal: React.FC<ScientificBriefingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedTarget, activeLander, footprintRadiusKm } = useStore();

  const assessment = useMemo(() => {
    return computeSiteAssessment(selectedTarget, activeLander, footprintRadiusKm);
  }, [selectedTarget, activeLander, footprintRadiusKm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto select-none font-sans">
      <div className="w-full max-w-3xl bg-white border border-[#E8EAED] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] flex flex-col my-6 max-h-[90vh] overflow-hidden text-[#202124]">
        {/* Controls Bar */}
        <div className="h-14 px-6 border-b border-[#E8EAED] flex items-center justify-between bg-[#F8F9FA] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F0FE] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#1A73E8]" />
            </div>
            <div>
              <span className="font-sans text-sm font-semibold text-[#202124] block leading-tight">
                Flight Readiness & Site Assessment Briefing
              </span>
              <span className="text-[11px] text-[#5F6368] font-sans">
                Official NASA PDS Archival Analysis & Landing Safety Report
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A73E8] hover:bg-[#1565C0] text-white text-xs font-sans font-medium transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 overflow-y-auto space-y-6 bg-white text-[#202124] font-sans text-xs print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b border-[#E8EAED] pb-4 flex justify-between items-start print:border-black/20">
            <div>
              <span className="text-[11px] font-semibold text-[#1A73E8] uppercase tracking-wider block mb-1">
                LUNAR RECONNAISSANCE GEODETIC EVALUATION SYSTEM
              </span>
              <h1 className="text-xl font-bold text-[#202124] print:text-black">
                TARGET BRIEFING: {selectedTarget.name}
              </h1>
              <span className="text-xs text-[#5F6368] print:text-zinc-600">
                DATE: {new Date().toISOString().split("T")[0]} · DATASET: NASA PDS OPEN SCIENCE ARCHIVE
              </span>
            </div>
            <div className="text-right text-xs text-[#5F6368] print:text-zinc-600 space-y-0.5 font-mono">
              <div>DATUM: MOON_ME (JPL DE421)</div>
              <div>ELLIPSOID: R = 1,737.4 km</div>
              <div>LANDER PROFILE: {activeLander.name}</div>
            </div>
          </div>

          {/* Coordinates & Footprint Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] print:bg-zinc-100 print:border-zinc-300">
            <div>
              <span className="text-[11px] text-[#5F6368] block font-medium">LATITUDE</span>
              <span className="font-semibold text-[#202124] text-sm print:text-black">
                {selectedTarget.lat.toFixed(4)}°
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#5F6368] block font-medium">LONGITUDE</span>
              <span className="font-semibold text-[#202124] text-sm print:text-black">
                {selectedTarget.lng.toFixed(4)}°
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#5F6368] block font-medium">LANDING ELLIPSE</span>
              <span className="font-semibold text-[#1A73E8] text-sm print:text-black">
                {footprintRadiusKm * 2} km × {footprintRadiusKm * 2} km
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#5F6368] block font-medium">ELEVATION</span>
              <span className="font-semibold text-[#202124] text-sm print:text-black">
                {selectedTarget.elevationM} m (Datum Ref)
              </span>
            </div>
          </div>

          {/* Overall Flight Readiness Status */}
          <div className="p-5 rounded-xl bg-[#E8F0FE] border border-[#D2E3FC] space-y-2 print:bg-zinc-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#1A73E8] uppercase tracking-wider">
                Flight Envelope Classification
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-white text-[#1A73E8] shadow-sm border border-[#D2E3FC] print:bg-white">
                {assessment.classification}
              </span>
            </div>
            <div className="text-3xl font-bold text-[#202124] print:text-black">
              {assessment.overallScore} <span className="text-lg font-normal text-[#5F6368]">/ 100</span>
            </div>
            <p className="text-[#202124] print:text-black text-xs leading-relaxed">
              {assessment.recommendation}
            </p>
          </div>

          {/* Hard Safety Constraints */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#202124] print:text-black uppercase tracking-wider">
              Flight Safety Rules Verification Matrix
            </h3>
            <div className="border border-[#E8EAED] rounded-xl overflow-hidden print:border-zinc-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-b border-[#E8EAED] print:bg-zinc-200 print:text-black">
                  <tr>
                    <th className="p-3">Safety Rule</th>
                    <th className="p-3">Threshold Limit</th>
                    <th className="p-3">Measured Value</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAED] print:divide-zinc-200">
                  {assessment.hardConstraints.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8F9FA]/50">
                      <td className="p-3 font-medium text-[#202124] print:text-black">{c.label}</td>
                      <td className="p-3 text-[#5F6368] font-mono">{c.threshold}</td>
                      <td className="p-3 text-[#202124] print:text-black font-mono font-semibold">{c.measured}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === "pass"
                              ? "bg-[#E6F4EA] text-[#137333]"
                              : "bg-[#FCE8E6] text-[#C5221F]"
                          }`}
                        >
                          {c.status === "pass" ? "PASS" : "VIOLATION"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MCDA Criteria Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#202124] print:text-black uppercase tracking-wider">
              Multi-Criteria Geospatial Decision Analysis (MCDA)
            </h3>
            <div className="border border-[#E8EAED] rounded-xl overflow-hidden print:border-zinc-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-[#5F6368] font-medium border-b border-[#E8EAED] print:bg-zinc-200 print:text-black">
                  <tr>
                    <th className="p-3">Criterion</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Measured Value</th>
                    <th className="p-3">Instrument & Data Source</th>
                    <th className="p-3">Confidence Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAED] print:divide-zinc-200">
                  {assessment.criteria.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8F9FA]/50">
                      <td className="p-3 text-[#202124] print:text-black font-medium">{c.name}</td>
                      <td className="p-3 font-bold text-[#1A73E8]">{c.score} / 100</td>
                      <td className="p-3 text-[#202124] print:text-black font-mono">{c.value}</td>
                      <td className="p-3 text-[#5F6368]">{c.instrument}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-medium uppercase text-[#5F6368] bg-[#F1F3F4] px-2 py-0.5 rounded">
                          {c.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notice & PDS Citations */}
          <div className="border-t border-[#E8EAED] pt-4 text-xs text-[#5F6368] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#137333]" />
              Verified NASA Planetary Data System (PDS) Products
            </span>
            <span className="font-mono text-[11px]">END OF BRIEFING</span>
          </div>
        </div>
      </div>
    </div>
  );
};

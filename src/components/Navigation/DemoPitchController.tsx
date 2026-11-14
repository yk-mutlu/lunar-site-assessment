// ═══════════════════════════════════════════════════════════════════════
// DemoPitchController.tsx
// Automated NASA Space Apps Pitch Flow
// 1. Overview -> 2. Best Site Fly-To -> 3. Nominal Simulation ->
// 4. Return -> 5. Risky Site Fly-To -> 6. Tipover Failure Demo
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useRef } from "react";
import { useStore } from "@/store";
import { Play, Square, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import type { CandidateSite } from "@/data/site-scoring-types";

interface DemoPitchControllerProps {
  onStartSimulation: (site: CandidateSite) => void;
  onCloseSimulation: () => void;
}

export const DemoPitchController: React.FC<DemoPitchControllerProps> = ({
  onStartSimulation,
  onCloseSimulation,
}) => {
  const {
    isDemoFlowActive,
    setIsDemoFlowActive,
    detectedSites,
    setSelectedCandidateSite,
    setLeftDetailPanelOpen,
    setViewMode,
  } = useStore();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [stepLabel, setStepLabel] = useState<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stopDemo = () => {
    clearTimer();
    setIsDemoFlowActive(false);
    setCurrentStep(0);
    setStepLabel("");
  };

  // Keyboard shortcut ESC cancels demo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDemoFlowActive) {
        stopDemo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDemoFlowActive]);

  const runDemoStep = (step: number) => {
    if (!detectedSites || detectedSites.length === 0) {
      stopDemo();
      return;
    }

    setCurrentStep(step);

    // Best site (Rank 1)
    const bestSite = detectedSites[0];
    // Risky site (highest slope or rank >= 5)
    const riskySite = [...detectedSites].sort((a, b) => b.measuredSlopeDeg - a.measuredSlopeDeg)[0];

    switch (step) {
      case 1: {
        // Step 1: Ensure surface mode and fly to Best Site
        setViewMode("surface");
        setStepLabel(`1/4 · En Güvenli Saha Seçimi: ${bestSite.name} (Puan: ${bestSite.overallScore.toFixed(1)}/10)`);
        setSelectedCandidateSite(bestSite);
        setLeftDetailPanelOpen(true);

        timeoutRef.current = setTimeout(() => {
          runDemoStep(2);
        }, 3000);
        break;
      }

      case 2: {
        // Step 2: Trigger nominal simulation on best site
        setStepLabel(`2/4 · Nominal İniş Simülasyonu: Düşük Eğim (${bestSite.measuredSlopeDeg}°)`);
        onStartSimulation(bestSite);

        timeoutRef.current = setTimeout(() => {
          onCloseSimulation();
          runDemoStep(3);
        }, 8500);
        break;
      }

      case 3: {
        // Step 3: Return and fly to Risky Site
        setStepLabel(`3/4 · Kritik Eğimli Sahaya Geçiş: ${riskySite.name} (Eğim: ${riskySite.measuredSlopeDeg}°)`);
        setSelectedCandidateSite(riskySite);
        setLeftDetailPanelOpen(true);

        timeoutRef.current = setTimeout(() => {
          runDemoStep(4);
        }, 3000);
        break;
      }

      case 4: {
        // Step 4: Simulate risky site -> Tipover demonstration
        setStepLabel(`4/4 · Dinamik Devrilme & Hata Analizi Doğrulaması`);
        onStartSimulation(riskySite);

        timeoutRef.current = setTimeout(() => {
          onCloseSimulation();
          stopDemo();
        }, 9000);
        break;
      }

      default:
        stopDemo();
        break;
    }
  };

  const handleStartDemo = () => {
    setIsDemoFlowActive(true);
    runDemoStep(1);
  };

  return (
    <>
      {/* Floating Demo Trigger Button (Bottom Left next to layers) */}
      {!isDemoFlowActive && (
        <div className="fixed bottom-6 left-28 z-30 pointer-events-auto">
          <button
            onClick={handleStartDemo}
            className="bg-[#181a20]/95 backdrop-blur-md hover:bg-[#22242c] text-[#f4f4f6] border border-[#d86c6c]/60 rounded-full px-4 h-11 flex items-center gap-2 shadow-tesla text-xs font-bold transition-all active:scale-95 cursor-pointer group"
          >
            <div className="w-5 h-5 rounded-full bg-[#d86c6c]/20 flex items-center justify-center text-[#d86c6c] group-hover:bg-[#d86c6c] group-hover:text-white transition-colors">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
            <span>Demo Akışı (Jüri Sunumu)</span>
          </button>
        </div>
      )}

      {/* Active Demo Pitch Floating Banner */}
      {isDemoFlowActive && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-[#181a20]/95 backdrop-blur-md border border-[#d86c6c] rounded-2xl shadow-tesla px-5 py-3 flex items-center gap-4 text-xs font-sans animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d86c6c] animate-ping" />
            <span className="font-mono text-[#d86c6c] font-bold uppercase tracking-wider text-[11px]">
              CANLI JÜRİ DEMO AKIŞI
            </span>
          </div>

          <div className="h-4 w-px bg-[#282a33]" />

          <span className="text-[#f4f4f6] font-semibold text-xs">
            {stepLabel}
          </span>

          <button
            onClick={stopDemo}
            className="ml-2 px-3 py-1 rounded-full bg-[#22242c] hover:bg-[#2c2f3a] text-[#9496a1] hover:text-[#f4f4f6] text-[11px] font-medium border border-[#282a33] flex items-center gap-1.5 cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current text-[#d86c6c]" />
            <span>Durdur (ESC)</span>
          </button>
        </div>
      )}
    </>
  );
};

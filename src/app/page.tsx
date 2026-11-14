"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/store";
import { GoogleMapsBar } from "@/components/Navigation/GoogleMapsBar";
import { GoogleLayersBox } from "@/components/Panels/GoogleLayersBox";
import { GoogleSiteCard } from "@/components/Panels/GoogleSiteCard";
import { SafeSiteDetailPanel } from "@/components/Panels/SafeSiteDetailPanel";
import { CinematicDescentTransition } from "@/components/Navigation/CinematicDescentTransition";
import { DemoPitchController } from "@/components/Navigation/DemoPitchController";
import { ScientificAdvisorModal } from "@/components/AI/ScientificAdvisorModal";
import { ScientificBriefingModal } from "@/components/Reports/ScientificBriefingModal";
import { LandingSimulatorModal } from "@/components/Simulation/LandingSimulatorModal";
import { SiteComparisonModal } from "@/components/Simulation/SiteComparisonModal";
import { TwoDimMoonMap } from "@/components/Map/TwoDimMoonMap";

// Dynamic import for Three.js 3D Lunar Workstation to disable SSR
const ThreeMoonWorkstation = dynamic(
  () =>
    import("@/components/Map/ThreeMoonWorkstation").then(
      (mod) => mod.ThreeMoonWorkstation
    ),
  { ssr: false }
);

const LunarSurfaceInspector = dynamic(
  () =>
    import("@/components/Map/LunarSurfaceInspector").then(
      (mod) => mod.LunarSurfaceInspector
    ),
  { ssr: false }
);

export default function Home() {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    viewMode,
    isComparisonModalOpen,
    setIsComparisonModalOpen,
    simulationSiteData,
    setSimulationSiteData,
    isCinematicTransitioning,
    setIsCinematicTransitioning,
  } = useStore();

  const [advisorModalOpen, setAdvisorModalOpen] = useState(false);
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);
  const [simulatorModalOpen, setSimulatorModalOpen] = useState(false);

  // Trigger cinematic descent transition -> open simulator
  const handleTriggerSimulation = (site: any) => {
    setSimulationSiteData(site);
    setIsCinematicTransitioning(true);
  };

  const handleTransitionComplete = () => {
    setIsCinematicTransitioning(false);
    setSimulatorModalOpen(true);
  };

  // Listen for decoupled "Simulate Landing" events
  useEffect(() => {
    const handleSimRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleTriggerSimulation(customEvent.detail);
    };
    window.addEventListener("lunar-simulate-landing-request", handleSimRequest);
    return () => window.removeEventListener("lunar-simulate-landing-request", handleSimRequest);
  }, []);

  // Global Keyboard shortcuts (A = Assessment Inspector, ESC = close dialogs)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "a" || e.key === "A") {
        setRightPanelOpen(!rightPanelOpen);
      } else if (e.key === "Escape") {
        setAdvisorModalOpen(false);
        setBriefingModalOpen(false);
        setSimulatorModalOpen(false);
        setIsComparisonModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rightPanelOpen, setRightPanelOpen, setIsComparisonModalOpen]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0d0e12] text-[#f4f4f6] select-none">
      {/* 1. Interactive Lunar Canvas (3D Orbit, 3D Surface Micro-Hazard, or 2D Map) */}
      <div className="absolute inset-0 z-0">
        {viewMode === "3d" ? (
          <ThreeMoonWorkstation />
        ) : viewMode === "surface" ? (
          <LunarSurfaceInspector />
        ) : (
          <TwoDimMoonMap />
        )}
      </div>

      {/* 2. Google Maps-style Floating Search Bar & Action Pills (Top) */}
      <GoogleMapsBar
        onOpenAdvisor={() => setAdvisorModalOpen(true)}
        onOpenReport={() => setBriefingModalOpen(true)}
        onOpenSimulator={() => setSimulatorModalOpen(true)}
      />

      {/* 3. Google Maps-style Floating Layers Button (Bottom Left) */}
      <GoogleLayersBox />

      {/* 4. Google Maps-style Place Details / Site Assessment Card (Right Side) */}
      <GoogleSiteCard
        onOpenReport={() => setBriefingModalOpen(true)}
        onOpenSimulator={() => setSimulatorModalOpen(true)}
      />

      {/* 4b. Left-Side Autonomous Safe Site Detail Panel */}
      <SafeSiteDetailPanel
        onOpenReport={() => setBriefingModalOpen(true)}
        onSimulateSite={(site) => {
          handleTriggerSimulation(site);
        }}
      />

      {/* 4c. Pitch Demo Flow Controller */}
      <DemoPitchController
        onStartSimulation={(site) => {
          handleTriggerSimulation(site);
        }}
        onCloseSimulation={() => {
          setSimulatorModalOpen(false);
        }}
      />

      {/* 4d. Cinematic Descent Transition Overlay */}
      <CinematicDescentTransition
        active={isCinematicTransitioning}
        siteName={simulationSiteData?.name}
        siteCode={simulationSiteData?.code}
        onTransitionComplete={handleTransitionComplete}
      />

      {/* 5. Modals */}
      <LandingSimulatorModal
        isOpen={simulatorModalOpen}
        onClose={() => setSimulatorModalOpen(false)}
        siteData={simulationSiteData}
      />

      <SiteComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
      />

      <ScientificAdvisorModal
        isOpen={advisorModalOpen}
        onClose={() => setAdvisorModalOpen(false)}
      />

      <ScientificBriefingModal
        isOpen={briefingModalOpen}
        onClose={() => setBriefingModalOpen(false)}
      />
    </main>
  );
}

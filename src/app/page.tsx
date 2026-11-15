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
import { TwoDimLunarMapPickerModal } from "@/components/Map/TwoDimLunarMapPickerModal";
import { EarthTelemetryPanel } from "@/components/Panels/EarthTelemetryPanel";
import { EphemerisHorizonBar } from "@/components/Panels/EphemerisHorizonBar";
import { OpenRocketAnalyzerModal } from "@/components/Simulation/OpenRocketAnalyzerModal";
import { RocketFlightReportModal } from "@/components/Reports/RocketFlightReportModal";
import { MissionSetupModal } from "@/components/Simulation/MissionSetupModal";

// Dynamic import for Three.js 3D Workstations to disable SSR
const ThreeEarthWorkstation = dynamic(
  () => import("@/components/Map/ThreeEarthWorkstation"),
  { ssr: false }
);

const ThreeMoonWorkstation = dynamic(
  () => import("@/components/Map/ThreeMoonWorkstation"),
  { ssr: false }
);

const LunarSurfaceInspector = dynamic(
  () => import("@/components/Map/LunarSurfaceInspector"),
  { ssr: false }
);

const ThreeOrbitMissionPreview = dynamic(
  () => import("@/components/Map/ThreeOrbitMissionPreview"),
  { ssr: false }
);

const Stage1EarthLaunchView = dynamic(
  () => import("@/components/Simulation/Stage1EarthLaunchView"),
  { ssr: false }
);

const Stage3LunarDescentView = dynamic(
  () => import("@/components/Simulation/Stage3LunarDescentView"),
  { ssr: false }
);

const Stage4SurfaceTraverseView = dynamic(
  () => import("@/components/Simulation/Stage4SurfaceTraverseView"),
  { ssr: false }
);

const Stage5LunarReturnView = dynamic(
  () => import("@/components/Simulation/Stage5LunarReturnView"),
  { ssr: false }
);

const Ros2ConnectionModal = dynamic(
  () => import("@/components/Navigation/Ros2ConnectionModal"),
  { ssr: false }
);

export default function Home() {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    viewMode,
    setViewMode,
    isComparisonModalOpen,
    setIsComparisonModalOpen,
    simulationSiteData,
    setSimulationSiteData,
    isCinematicTransitioning,
    setIsCinematicTransitioning,
    is2DMapPickerOpen,
    setIs2DMapPickerOpen,
    selectedSafeLunarSite,
    setSelectedSafeLunarSite,
    setIsMissionSetupModalOpen,
  } = useStore();

  const [advisorModalOpen, setAdvisorModalOpen] = useState(false);
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);
  const [simulatorModalOpen, setSimulatorModalOpen] = useState(false);
  const [ros2ModalOpen, setRos2ModalOpen] = useState(true);

  const isSimulationActive =
    viewMode === "launch_sim" ||
    viewMode === "orbit_preview" ||
    viewMode === "descent_sim" ||
    viewMode === "surface_traverse" ||
    viewMode === "lunar_return";

  const isMoonGlobeMode = (viewMode === "3d" || viewMode === "2d") && !isSimulationActive;

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
      {/* 1. Interactive Celestial Canvas (3D Moon, 2D Map, Launch Sim, Orbit Preview, Descent Sim, Surface Traverse, Lunar Return, or Earth) */}
      <div className="absolute inset-0 z-0">
        {viewMode === "earth" ? (
          <ThreeEarthWorkstation />
        ) : viewMode === "launch_sim" ? (
          <Stage1EarthLaunchView />
        ) : viewMode === "orbit_preview" ? (
          <ThreeOrbitMissionPreview
            onStartDescentSimulation={() => {
              setViewMode("descent_sim");
            }}
          />
        ) : viewMode === "descent_sim" ? (
          <Stage3LunarDescentView />
        ) : viewMode === "surface_traverse" ? (
          <Stage4SurfaceTraverseView />
        ) : viewMode === "lunar_return" ? (
          <Stage5LunarReturnView />
        ) : viewMode === "3d" ? (
          <ThreeMoonWorkstation />
        ) : viewMode === "surface" ? (
          <LunarSurfaceInspector />
        ) : (
          <TwoDimMoonMap />
        )}
      </div>

      {/* 1b. Left-Side Earth Weather, Space Weather & Radiation Telemetry Panel */}
      {viewMode === "earth" && (
        <EarthTelemetryPanel
          onStartSimulation={() => setIsMissionSetupModalOpen(true)}
          onSwitchToMoon={() => setViewMode("3d")}
        />
      )}

      {/* 2. Google Maps-style Floating Search Bar & Action Pills (Top) */}
      {!isSimulationActive && (
        <GoogleMapsBar
          onOpenAdvisor={() => setAdvisorModalOpen(true)}
          onOpenReport={() => setBriefingModalOpen(true)}
          onOpenSimulator={() => setIsMissionSetupModalOpen(true)}
          onOpenRos2={() => setRos2ModalOpen(true)}
        />
      )}

      {/* 3. Google Maps-style Floating Layers Button (Bottom Left - Moon only) */}
      {isMoonGlobeMode && <GoogleLayersBox />}

      {/* 3b. NASA Challenge Ephemeris & Temporal Analysis Cockpit Bar (Bottom Center - Moon only) */}
      {isMoonGlobeMode && <EphemerisHorizonBar />}

      {/* 4. Google Maps-style Place Details / Site Assessment Card (Right Side - Moon only) */}
      {isMoonGlobeMode && (
        <GoogleSiteCard
          onOpenReport={() => setBriefingModalOpen(true)}
          onOpenSimulator={() => setIsMissionSetupModalOpen(true)}
        />
      )}

      {/* 4b. Left-Side Autonomous Safe Site Detail Panel (Moon only) */}
      {isMoonGlobeMode && (
        <SafeSiteDetailPanel
          onOpenReport={() => setBriefingModalOpen(true)}
          onSimulateSite={(site) => {
            handleTriggerSimulation(site);
          }}
        />
      )}

      {/* 4c. Pitch Demo Flow Controller */}
      {isMoonGlobeMode && (
        <DemoPitchController
          onStartSimulation={(site) => {
            handleTriggerSimulation(site);
          }}
          onCloseSimulation={() => {
            setSimulatorModalOpen(false);
          }}
        />
      )}

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

      {/* 6. Step 2: Global 2D Lunar Map Landing Site Picker */}
      <TwoDimLunarMapPickerModal
        isOpen={is2DMapPickerOpen}
        onClose={() => setIs2DMapPickerOpen(false)}
        selectedSite={selectedSafeLunarSite}
        onSelectSite={(site) => {
          setSelectedSafeLunarSite(site);
          setIs2DMapPickerOpen(false);
          // Open Mission Planning Setup & Launch Date Recommendations
          setIsMissionSetupModalOpen(true);
        }}
      />

      {/* 7. OpenRocket Studio & Barrowman Aerodynamic Stability Modal */}
      <OpenRocketAnalyzerModal />

      {/* 8. Comprehensive Post-Launch Telemetry Flight Report Modal */}
      <RocketFlightReportModal />

      {/* 9. End-to-End Mission Planning & Launch Window Recommendation Modal */}
      <MissionSetupModal />

      {/* 10. ROS 2 Startup Bridge & Simulation Mode Modal */}
      <Ros2ConnectionModal
        isOpen={ros2ModalOpen}
        onClose={() => setRos2ModalOpen(false)}
        onContinueSimulation={() => setRos2ModalOpen(false)}
      />
    </main>
  );
}

import { create } from "zustand";
import type {
  LayerMode,
  ViewMode,
  LunarTarget,
  LanderConfig,
  AssessmentOutput,
  PolygonPoint,
  PolygonStats,
  LunarRock,
} from "@/types";
import type { CandidateSite } from "@/data/site-scoring-types";
import type { SimulationResult } from "@/components/Simulation/engine/config";
import { LAUNCH_SITES, LaunchSite } from "@/data/earth-launch-service";
import { PRESET_SAFE_LUNAR_SITES, SafeLunarSiteOption } from "@/data/lunar-safe-sites";
import { NASA_ROCKET_VEHICLES, RocketVehicle } from "@/data/rocket-vehicles";
import type { RocketFlightReport, ParsedOpenRocketData } from "@/data/openrocket-engine";
import {
  computeMissionPlanRecommendation,
  MissionRecommendation,
} from "@/data/mission-recommendation-engine";

export const NOTABLE_TARGETS: LunarTarget[] = [
  // --- Artemis III Candidate Sites (South Pole) ---
  {
    id: "shackleton",
    name: "Shackleton Crater Rim",
    lat: -89.54,
    lng: -138.0,
    elevationM: 1420,
    description: "Peak Artemis III exploration candidate; 86% annual solar illumination with direct proximity to cold-trap PSRs.",
    isCandidate: true,
    category: "Artemis III",
  },
  {
    id: "malapert",
    name: "Malapert Massif",
    lat: -85.27,
    lng: 4.0,
    elevationM: 5100,
    description: "Towering southern plateau offering near-continuous direct line-of-sight to Earth and persistent illumination.",
    isCandidate: true,
    category: "Artemis III",
  },
  {
    id: "connecting_ridge",
    name: "Connecting Ridge",
    lat: -85.33,
    lng: 31.0,
    elevationM: 890,
    description: "Candidate ridge between Shackleton and de Gerlache; stable traverse corridors for pressurized rovers.",
    isCandidate: true,
    category: "Artemis III",
  },
  {
    id: "faustini",
    name: "Faustini Rim A",
    lat: -87.12,
    lng: 77.0,
    elevationM: 2200,
    description: "Crater ridge with prolonged grazing sunlight and access to deep permanently shadowed volatile deposits.",
    isCandidate: true,
    category: "Artemis III",
  },
  {
    id: "haworth",
    name: "Haworth Crater Plateau",
    lat: -87.41,
    lng: -5.1,
    elevationM: 1650,
    description: "Elevated plateau overlooking one of the coldest water ice cold traps in the lunar south polar region.",
    isCandidate: true,
    category: "Artemis III",
  },
  {
    id: "nobile_rim",
    name: "Nobile Crater Rim (VIPER Site)",
    lat: -85.22,
    lng: 37.8,
    elevationM: 3100,
    description: "Primary landing site for NASA VIPER mission; favorable slopes with multiple reachable micro-cold traps.",
    isCandidate: true,
    category: "Artemis III",
  },
  {
    id: "peak_eternal_light",
    name: "Peak of Light (Malapert Mountain)",
    lat: -89.8,
    lng: -160.0,
    elevationM: 2050,
    description: "Ultra-high latitude massif with over 90% peak solar access and direct Earth line-of-sight.",
    isCandidate: true,
    category: "Artemis III",
  },

  // --- Commercial Lunar Payload Services (CLPS) ---
  {
    id: "im1_odysseus",
    name: "IM-1 Odysseus (Malapert A)",
    lat: -80.13,
    lng: -1.44,
    elevationM: 2400,
    description: "Historic Intuitive Machines Nova-C touchdown site; rugged polar terrain with southern horizon constraints.",
    isCandidate: false,
    category: "CLPS",
  },
  {
    id: "griffin_viper",
    name: "Astrobotic Griffin Landing Site",
    lat: -85.4,
    lng: 33.2,
    elevationM: 2950,
    description: "Planned heavy CLPS lander site on the elevated plains adjacent to Nobile Crater.",
    isCandidate: false,
    category: "CLPS",
  },

  // --- Historic Apollo & International Missions ---
  {
    id: "apollo_11",
    name: "Tranquility Base (Apollo 11)",
    lat: 0.67,
    lng: 23.47,
    elevationM: -2100,
    description: "Equatorial mare plain; basaltic regolith, 14-day continuous day followed by 14-day continuous night.",
    isCandidate: false,
    category: "Apollo",
  },
  {
    id: "apollo_17",
    name: "Taurus-Littrow (Apollo 17)",
    lat: 20.19,
    lng: 30.77,
    elevationM: -2500,
    description: "Deep lunar valley surrounded by high massif walls; showcases complex terrain horizon shadowing.",
    isCandidate: false,
    category: "Apollo",
  },
  {
    id: "chandrayaan_3",
    name: "Shiv Shakti Point (Chandrayaan-3)",
    lat: -69.37,
    lng: 32.35,
    elevationM: -1800,
    description: "ISRO Vikram lander historic south-polar landing plain; demonstrates high-latitude solar elevation physics.",
    isCandidate: false,
    category: "International",
  },
  {
    id: "change_6",
    name: "South Pole-Aitken (Chang'e-6)",
    lat: -41.64,
    lng: -153.99,
    elevationM: -5200,
    description: "Lunar far side basin sample return site; total Earth occlusion requiring Queqiao-2 relay constellation.",
    isCandidate: false,
    category: "International",
  },
];

export const LANDER_PRESETS: LanderConfig[] = [
  {
    id: "clps_medium",
    name: "CLPS Commercial Lander (Medium)",
    category: "Medium Commercial",
    massKg: 1800,
    maxSlopeDeg: 8.0,
    minClearanceRadiusM: 100,
    footprintDiameterM: 4.5,
    thermalMinK: 80,
    thermalMaxK: 350,
  },
  {
    id: "artemis_hls",
    name: "Artemis Human Landing System (HLS)",
    category: "Heavy Artemis-Class",
    massKg: 15000,
    maxSlopeDeg: 5.0,
    minClearanceRadiusM: 250,
    footprintDiameterM: 9.0,
    thermalMinK: 60,
    thermalMaxK: 370,
  },
  {
    id: "robotic_scout",
    name: "Micro Scout Rover / Probe",
    category: "Light Robotic",
    massKg: 120,
    maxSlopeDeg: 12.0,
    minClearanceRadiusM: 30,
    footprintDiameterM: 1.8,
    thermalMinK: 100,
    thermalMaxK: 330,
  },
];

interface AppState {
  // Navigation & View Mode (3D Globe vs 2D Map)
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  // Selected Target
  selectedTarget: LunarTarget;
  setSelectedTarget: (t: LunarTarget) => void;

  // Layer state
  activeLayer: LayerMode;
  setActiveLayer: (l: LayerMode) => void;
  layerOpacity: number;
  setLayerOpacity: (v: number) => void;

  // Lighting & Sun Simulation
  sunAzimuthDeg: number;
  setSunAzimuthDeg: (deg: number) => void;
  sunElevationDeg: number;
  setSunElevationDeg: (deg: number) => void;
  enableLighting: boolean;
  setEnableLighting: (v: boolean) => void;

  // Ephemeris & Temporal Timeline (NASA Space Apps Challenge)
  missionDate: string;
  setMissionDate: (d: string) => void;
  lunarDayHour: number; // 0 to 708 hours (1 synodic month)
  setLunarDayHour: (h: number | ((prev: number) => number)) => void;
  isTimelinePlaying: boolean;
  setIsTimelinePlaying: (v: boolean) => void;

  // Polygon Area Selection (Photoshop / GIS Lasso tool)
  isPolygonMode: boolean;
  setIsPolygonMode: (v: boolean) => void;
  polygonPoints: PolygonPoint[];
  setPolygonPoints: (pts: PolygonPoint[]) => void;
  addPolygonPoint: (pt: PolygonPoint) => void;
  clearPolygon: () => void;
  polygonStats: PolygonStats | null;
  setPolygonStats: (stats: PolygonStats | null) => void;

  // Multi-Site Comparison
  comparisonTargets: LunarTarget[];
  addComparisonTarget: (t: LunarTarget) => void;
  removeComparisonTarget: (id: string) => void;
  isComparisonModalOpen: boolean;
  setIsComparisonModalOpen: (v: boolean) => void;

  // Panels
  leftPanelOpen: boolean;
  setLeftPanelOpen: (v: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;

  // Active Lander Configuration
  activeLander: LanderConfig;
  setActiveLander: (l: LanderConfig) => void;

  // Footprint Radius
  footprintRadiusKm: number;
  setFootprintRadiusKm: (r: number) => void;

  // Rock & Pebble Micro-Hazard Inspection State
  selectedRock: LunarRock | null;
  setSelectedRock: (r: LunarRock | null) => void;
  rockFilter: "all" | "pebble" | "hazard";
  setRockFilter: (f: "all" | "pebble" | "hazard") => void;
  surfaceLidarActive: boolean;
  setSurfaceLidarActive: (v: boolean) => void;

  // Autonomous Safe Site Detection & Waypoints
  detectedSites: CandidateSite[];
  setDetectedSites: (sites: CandidateSite[]) => void;
  selectedCandidateSite: CandidateSite | null;
  setSelectedCandidateSite: (site: CandidateSite | null) => void;
  isDetectingSites: boolean;
  setIsDetectingSites: (v: boolean) => void;
  leftDetailPanelOpen: boolean;
  setLeftDetailPanelOpen: (v: boolean) => void;
  flyToSite: CandidateSite | null;
  setFlyToSite: (site: CandidateSite | null) => void;

  // Cinematic Transition & Simulation Integration
  simulationSiteData: CandidateSite | null;
  setSimulationSiteData: (site: CandidateSite | null) => void;
  siteSimulationResults: Record<string, SimulationResult>;
  recordSiteSimulationResult: (siteId: string, result: SimulationResult) => void;
  isCinematicTransitioning: boolean;
  setIsCinematicTransitioning: (v: boolean) => void;
  isDemoFlowActive: boolean;
  setIsDemoFlowActive: (v: boolean) => void;
  isMapRendererPaused: boolean;
  setIsMapRendererPaused: (v: boolean) => void;

  // Earth Launch & Environmental Site
  selectedLaunchSite: LaunchSite;
  setSelectedLaunchSite: (site: LaunchSite) => void;

  // 2D Lunar Map Landing Site Picker & Sequence Pipeline
  is2DMapPickerOpen: boolean;
  setIs2DMapPickerOpen: (open: boolean) => void;
  selectedSafeLunarSite: SafeLunarSiteOption;
  setSelectedSafeLunarSite: (site: SafeLunarSiteOption) => void;
  launchTimeMode: "today" | "optimal";
  setLaunchTimeMode: (mode: "today" | "optimal") => void;

  // Launch Vehicle / Rocket Selection (NASA Space Apps Challenge 2026)
  selectedRocket: RocketVehicle;
  setSelectedRocket: (rocket: RocketVehicle) => void;
  customOpenRocket: ParsedOpenRocketData | null;
  setCustomOpenRocket: (data: ParsedOpenRocketData | null) => void;
  isOpenRocketModalOpen: boolean;
  setIsOpenRocketModalOpen: (open: boolean) => void;
  isFlightReportModalOpen: boolean;
  setIsFlightReportModalOpen: (open: boolean) => void;
  latestLaunchReport: RocketFlightReport | null;
  setLatestLaunchReport: (report: RocketFlightReport | null) => void;

  // End-to-End Lunar Mission Recommendation & Setup
  missionRecommendation: MissionRecommendation;
  setMissionRecommendation: (rec: MissionRecommendation) => void;
  isMissionSetupModalOpen: boolean;
  setIsMissionSetupModalOpen: (open: boolean) => void;
  recomputeMissionRecommendation: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Default entry view is Moon 3D Site Navigator (NASA Space Apps Challenge core focus)
  viewMode: "3d",
  setViewMode: (m) => set({ viewMode: m }),

  selectedLaunchSite: LAUNCH_SITES[0],
  setSelectedLaunchSite: (site) => set({ selectedLaunchSite: site }),

  // Default Rocket: NASA SLS Block 1 (Artemis Program)
  selectedRocket: NASA_ROCKET_VEHICLES[1],
  setSelectedRocket: (rocket) => set({ selectedRocket: rocket }),
  customOpenRocket: null,
  setCustomOpenRocket: (data) => set({ customOpenRocket: data }),
  isOpenRocketModalOpen: false,
  setIsOpenRocketModalOpen: (open) => set({ isOpenRocketModalOpen: open }),
  isFlightReportModalOpen: false,
  setIsFlightReportModalOpen: (open) => set({ isFlightReportModalOpen: open }),
  latestLaunchReport: null,
  setLatestLaunchReport: (report) => set({ latestLaunchReport: report }),

  // Mission Planning Recommendation
  missionRecommendation: computeMissionPlanRecommendation(
    PRESET_SAFE_LUNAR_SITES[0],
    "2026-09-15T12:00",
    180
  ),
  setMissionRecommendation: (rec) => set({ missionRecommendation: rec }),
  isMissionSetupModalOpen: false,
  setIsMissionSetupModalOpen: (open) => set({ isMissionSetupModalOpen: open }),
  recomputeMissionRecommendation: () => {
    const { selectedTarget, selectedSafeLunarSite, missionDate, lunarDayHour } = get();
    const activeTarget = selectedSafeLunarSite || selectedTarget;
    const rec = computeMissionPlanRecommendation(activeTarget, missionDate, lunarDayHour);
    set({ missionRecommendation: rec, selectedRocket: rec.recommendedRocket });
  },

  is2DMapPickerOpen: false,
  setIs2DMapPickerOpen: (open) => set({ is2DMapPickerOpen: open }),
  selectedSafeLunarSite: PRESET_SAFE_LUNAR_SITES[0],
  setSelectedSafeLunarSite: (site) => set({ selectedSafeLunarSite: site }),
  launchTimeMode: "today",
  setLaunchTimeMode: (mode) => set({ launchTimeMode: mode }),

  selectedTarget: NOTABLE_TARGETS[0],
  setSelectedTarget: (t) =>
    set({
      selectedTarget: t,
      // If we pick a target, clear the custom polygon stats unless user is in polygon mode
      polygonPoints: [],
      polygonStats: null,
    }),

  activeLayer: "imagery",
  setActiveLayer: (l) => set({ activeLayer: l }),
  layerOpacity: 1.0,
  setLayerOpacity: (v) => set({ layerOpacity: v }),

  sunAzimuthDeg: 45,
  setSunAzimuthDeg: (deg) => set({ sunAzimuthDeg: deg }),
  sunElevationDeg: 12,
  setSunElevationDeg: (deg) => set({ sunElevationDeg: deg }),
  enableLighting: true,
  setEnableLighting: (v) => set({ enableLighting: v }),

  // 2026 Artemis III launch window date baseline
  missionDate: "2026-09-15T12:00",
  setMissionDate: (d) => set({ missionDate: d }),
  lunarDayHour: 320, // Waxing gibbous, high surface contrast and visible craters
  setLunarDayHour: (h) =>
    set((state) => ({
      lunarDayHour: typeof h === "function" ? h(state.lunarDayHour) : h,
    })),
  isTimelinePlaying: false,
  setIsTimelinePlaying: (v) => set({ isTimelinePlaying: v }),

  // Polygon Mode
  isPolygonMode: false,
  setIsPolygonMode: (v) => set({ isPolygonMode: v }),
  polygonPoints: [],
  setPolygonPoints: (pts) => set({ polygonPoints: pts }),
  addPolygonPoint: (pt) =>
    set((state) => ({ polygonPoints: [...state.polygonPoints, pt] })),
  clearPolygon: () => set({ polygonPoints: [], polygonStats: null }),
  polygonStats: null,
  setPolygonStats: (stats) => set({ polygonStats: stats }),

  // Comparison
  comparisonTargets: [NOTABLE_TARGETS[0], NOTABLE_TARGETS[1]],
  addComparisonTarget: (t) =>
    set((state) => {
      if (state.comparisonTargets.some((x) => x.id === t.id)) return state;
      return { comparisonTargets: [...state.comparisonTargets, t] };
    }),
  removeComparisonTarget: (id) =>
    set((state) => ({
      comparisonTargets: state.comparisonTargets.filter((x) => x.id !== id),
    })),
  isComparisonModalOpen: false,
  setIsComparisonModalOpen: (v) => set({ isComparisonModalOpen: v }),

  leftPanelOpen: true,
  setLeftPanelOpen: (v) => set({ leftPanelOpen: v }),
  rightPanelOpen: true,
  setRightPanelOpen: (v) => set({ rightPanelOpen: v }),

  activeLander: LANDER_PRESETS[0],
  setActiveLander: (l) => set({ activeLander: l }),

  footprintRadiusKm: 2.0,
  setFootprintRadiusKm: (r) => set({ footprintRadiusKm: r }),

  // Rock & Hazard state
  selectedRock: null,
  setSelectedRock: (r) => set({ selectedRock: r }),
  rockFilter: "all",
  setRockFilter: (f) => set({ rockFilter: f }),
  surfaceLidarActive: true,
  setSurfaceLidarActive: (v) => set({ surfaceLidarActive: v }),

  // Autonomous Safe Site Detection & Waypoints
  detectedSites: [],
  setDetectedSites: (sites) => set({ detectedSites: sites }),
  selectedCandidateSite: null,
  setSelectedCandidateSite: (site) => set({ selectedCandidateSite: site }),
  isDetectingSites: false,
  setIsDetectingSites: (v) => set({ isDetectingSites: v }),
  leftDetailPanelOpen: false,
  setLeftDetailPanelOpen: (v) => set({ leftDetailPanelOpen: v }),
  flyToSite: null,
  setFlyToSite: (site) => set({ flyToSite: site }),

  // Cinematic Transition & Simulation Integration
  simulationSiteData: null,
  setSimulationSiteData: (site) => set({ simulationSiteData: site }),
  siteSimulationResults: {},
  recordSiteSimulationResult: (siteId, result) =>
    set((state) => ({
      siteSimulationResults: {
        ...state.siteSimulationResults,
        [siteId]: result,
      },
    })),
  isCinematicTransitioning: false,
  setIsCinematicTransitioning: (v) => set({ isCinematicTransitioning: v }),
  isDemoFlowActive: false,
  setIsDemoFlowActive: (v) => set({ isDemoFlowActive: v }),
  isMapRendererPaused: false,
  setIsMapRendererPaused: (v) => set({ isMapRendererPaused: v }),
}));

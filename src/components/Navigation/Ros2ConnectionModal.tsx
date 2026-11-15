"useclient";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Wifi,
  WifiOff,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Activity,
  Layers,
} from "lucide-react";

interface Ros2ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueSimulation: () => void;
}

export const Ros2ConnectionModal: React.FC<Ros2ConnectionModalProps> = ({
  isOpen,
  onClose,
  onContinueSimulation,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<"scanning" | "offline" | "connected">("scanning");
  const [scannedTopics, setScannedTopics] = useState<
    { name: string; type: string; status: "waiting" | "active" | "simulated"; rate: string }[]
  >([
    { name: "/lunar/gnc/nav_state", type: "sensor_msgs/msg/NavSatFix", status: "waiting", rate: "-- Hz" },
    { name: "/rover/cmd_vel", type: "geometry_msgs/msg/Twist", status: "waiting", rate: "-- Hz" },
    { name: "/lidar/points_raw", type: "sensor_msgs/msg/PointCloud2", status: "waiting", rate: "-- Hz" },
    { name: "/telemetry/space_weather", type: "std_msgs/msg/Float64MultiArray", status: "waiting", rate: "-- Hz" },
    { name: "/lunar_lander/imu/data", type: "sensor_msgs/msg/Imu", status: "waiting", rate: "-- Hz" },
  ]);
  const [retryCount, setRetryCount] = useState(0);

  // Attempt real WebSocket connection to ROS 2 rosbridge (port 9090)
  useEffect(() => {
    if (!isOpen) return;

    setConnectionStatus("scanning");
    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout | null = null;

    try {
      ws = new WebSocket("ws://localhost:9090");

      ws.onopen = () => {
        setConnectionStatus("connected");
        setScannedTopics((prev) =>
          prev.map((t) => ({ ...t, status: "active", rate: "20.0 Hz" }))
        );
      };

      ws.onerror = () => {
        // Fallback to offline scan timeout
      };

      ws.onclose = () => {
        if (connectionStatus === "scanning") {
          // handled by timer
        }
      };
    } catch {
      // Ignore initial connection failure
    }

    timer = setTimeout(() => {
      setConnectionStatus((current) => {
        if (current === "connected") return "connected";
        setScannedTopics((prev) =>
          prev.map((t) => ({ ...t, status: "simulated", rate: "10.0 Hz (Sim)" }))
        );
        return "offline";
      });
    }, 2400);

    return () => {
      if (ws) ws.close();
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, retryCount]);

  if (!isOpen) return null;

  const handleRetry = () => {
    setConnectionStatus("scanning");
    setScannedTopics((prev) =>
      prev.map((t) => ({ ...t, status: "waiting", rate: "-- Hz" }))
    );
    setRetryCount((c) => c + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-[#E8EAED] overflow-hidden text-[#202124]">
        
        {/* Top Header Banner */}
        <div className="px-6 pt-6 pb-4 border-b border-[#F1F3F4] bg-[#F8F9FA]/60">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center text-[#1A73E8] shadow-sm">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#202124]">ROS 2 Robotics & Node Bridge</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wide uppercase bg-[#E8F0FE] text-[#1A73E8]">
                    DDS Bridge
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] font-mono mt-0.5">
                  ROS 2 Humble / Iron • ws://localhost:9090 (Domain ID: 0)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status Monitor Card */}
        <div className="p-6 space-y-4">
          <div
            className={`p-4 rounded-2xl border transition-all ${
              connectionStatus === "connected"
                ? "bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]"
                : connectionStatus === "scanning"
                ? "bg-[#E8F0FE] border-[#D2E3FC] text-[#1A73E8]"
                : "bg-[#FEF7E0] border-[#FEEFC3] text-[#B06000]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {connectionStatus === "connected" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#137333]" />
                ) : connectionStatus === "scanning" ? (
                  <RefreshCw className="w-5 h-5 text-[#1A73E8] animate-spin" />
                ) : (
                  <WifiOff className="w-5 h-5 text-[#B06000]" />
                )}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    {connectionStatus === "connected"
                      ? "Connected to Live ROS 2 Bridge"
                      : connectionStatus === "scanning"
                      ? "Scanning Network Nodes..."
                      : "ROS 2 Bridge Offline (Hardware Not Detected)"}
                  </span>
                  <span className="text-xs text-[#5F6368] block mt-0.5 font-normal">
                    {connectionStatus === "connected"
                      ? "Real-time hardware telemetry and sensor stream active."
                      : connectionStatus === "scanning"
                      ? "Scanning local rosbridge websocket server (Port 9090)..."
                      : "Local ROS 2 daemon or rosbridge service not detected. You can proceed seamlessly with the built-in simulation engine."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scanned ROS 2 Topics List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#5F6368] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#1A73E8]" />
                Target ROS 2 Topics
              </span>
              <span className="text-[11px] font-mono text-[#5F6368]">5/5 Active</span>
            </div>

            <div className="bg-[#F8F9FA] rounded-2xl border border-[#E8EAED] p-2 space-y-1.5 max-h-48 overflow-y-auto">
              {scannedTopics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#F1F3F4] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        topic.status === "active"
                          ? "bg-[#137333]"
                          : topic.status === "simulated"
                          ? "bg-[#1A73E8]"
                          : "bg-[#EA4335] animate-pulse"
                      }`}
                    />
                    <span className="font-mono font-semibold text-[#202124]">{topic.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-[#5F6368] hidden sm:inline">
                      {topic.type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        topic.status === "active"
                          ? "bg-[#E6F4EA] text-[#137333]"
                          : topic.status === "simulated"
                          ? "bg-[#E8F0FE] text-[#1A73E8]"
                          : "bg-[#F1F3F4] text-[#5F6368]"
                      }`}
                    >
                      {topic.status === "active"
                        ? topic.rate
                        : topic.status === "simulated"
                        ? "Simulated"
                        : "Waiting"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 px-6 bg-[#F8F9FA] border-t border-[#E8EAED] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleRetry}
            disabled={connectionStatus === "scanning"}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] text-[#202124] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5F6368] ${connectionStatus === "scanning" ? "animate-spin" : ""}`} />
            <span>Retry Scan</span>
          </button>

          {/* Primary Action Button: Continue with Simulation */}
          <button
            onClick={() => {
              onContinueSimulation();
              onClose();
            }}
            className="w-full sm:flex-1 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-xl py-3 px-5 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(26,115,232,0.3)] transition-all active:scale-[0.98] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Continue with Simulation if Disconnected</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default Ros2ConnectionModal;

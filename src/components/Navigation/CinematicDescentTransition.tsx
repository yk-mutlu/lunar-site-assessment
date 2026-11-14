// ═══════════════════════════════════════════════════════════════════════
// CinematicDescentTransition.tsx
// Seamless Atmospheric Entry & Descent Sequence Overlay
// Light streaks, screen glow, vignette, loading state
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from "react";
import { Rocket, ShieldCheck } from "lucide-react";

interface CinematicDescentTransitionProps {
  active: boolean;
  siteName?: string;
  siteCode?: string;
  onTransitionComplete: () => void;
}

export const CinematicDescentTransition: React.FC<CinematicDescentTransitionProps> = ({
  active,
  siteName,
  siteCode,
  onTransitionComplete,
}) => {
  const [phase, setPhase] = useState<"idle" | "entry" | "hold" | "reveal">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      setProgress(0);
      return;
    }

    setPhase("entry");
    const startTime = performance.now();
    const duration = 1800; // 1.8 seconds total transition

    let animId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(1.0, elapsed / duration);
      setProgress(p);

      if (p < 0.6) {
        setPhase("entry");
      } else if (p < 0.9) {
        setPhase("hold");
      } else {
        setPhase("reveal");
      }

      if (p < 1.0) {
        animId = requestAnimationFrame(animate);
      } else {
        onTransitionComplete();
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [active, onTransitionComplete]);

  if (!active && phase === "idle") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${
        phase === "reveal" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Background Dim & Flash */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-500"
        style={{
          opacity: Math.min(0.96, progress * 1.5),
        }}
      />

      {/* Atmospheric Entry Warp / Light Streaks Effect */}
      <div className="absolute inset-0 overflow-hidden opacity-60">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.25)_0%,rgba(216,108,108,0.18)_45%,transparent_75%)] scale-150 animate-pulse"
          style={{
            transform: `scale(${1 + progress * 0.8})`,
            filter: "blur(20px)",
          }}
        />

        {/* Speed streaks */}
        <svg className="w-full h-full opacity-40 animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="50" y1="50" x2="10" y2="10" stroke="#38bdf8" strokeWidth="0.3" strokeDasharray="5, 10" />
          <line x1="50" y1="50" x2="90" y2="15" stroke="#d86c6c" strokeWidth="0.3" strokeDasharray="8, 12" />
          <line x1="50" y1="50" x2="20" y2="85" stroke="#f4f4f6" strokeWidth="0.2" strokeDasharray="4, 15" />
          <line x1="50" y1="50" x2="85" y2="80" stroke="#38bdf8" strokeWidth="0.4" strokeDasharray="6, 8" />
        </svg>
      </div>

      {/* Central Sequence Card */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 space-y-4 animate-fade-in font-sans">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-[rgba(216,108,108,0.2)] border border-[#d86c6c]/60 flex items-center justify-center shadow-tesla animate-bounce">
            <Rocket className="w-8 h-8 text-[#d86c6c]" />
          </div>
          <div className="absolute inset-0 rounded-full border border-[#38bdf8] animate-ping opacity-75" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-[#d86c6c]/20 text-[#d86c6c] border border-[#d86c6c]/40 text-xs font-mono font-bold">
              {siteCode || "LS-01"}
            </span>
            <span className="text-xs uppercase font-mono tracking-widest text-[#38bdf8] font-bold">
              İniş Dizisi Başlatılıyor
            </span>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">
            {siteName || "Seçilen Ay Sahası"}
          </h3>

          <p className="text-xs text-[#9496a1] max-w-sm">
            DEM yükseklik verileri ve yerel topoğrafik eğim simülasyon motoruna yükleniyor...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-[#22242c] rounded-full overflow-hidden border border-[#282a33]">
          <div
            className="h-full bg-gradient-to-r from-[#38bdf8] to-[#d86c6c] transition-all duration-75"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

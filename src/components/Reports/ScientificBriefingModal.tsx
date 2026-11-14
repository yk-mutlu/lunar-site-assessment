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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto select-none font-sans">
      <div className="w-full max-w-3xl bg-[#181a20] border border-[#282a33] rounded-3xl shadow-tesla flex flex-col my-6 max-h-[90vh] overflow-hidden text-[#f4f4f6]">
        {/* Controls Bar */}
        <div className="h-14 px-6 border-b border-[#282a33] flex items-center justify-between bg-[#14151a] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[rgba(216,108,108,0.15)] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#d86c6c]" />
            </div>
            <div>
              <span className="font-sans text-sm font-semibold text-[#f4f4f6] block leading-tight">
                Uçuş Hazırlık ve Saha Değerlendirme Raporu
              </span>
              <span className="text-[11px] text-[#9496a1] font-sans">
                Resmi NASA PDS Arşiv Analizi ve İniş Güvenliği Raporu
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#d86c6c] hover:bg-[#c55a5a] text-white text-xs font-sans font-medium transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF Kaydet</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9496a1] hover:text-[#f4f4f6] hover:bg-[#22242c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 overflow-y-auto space-y-6 bg-[#181a20] text-[#f4f4f6] font-sans text-xs print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b border-[#282a33] pb-4 flex justify-between items-start print:border-black/20">
            <div>
              <span className="text-[11px] font-semibold text-[#d86c6c] uppercase tracking-wider block mb-1">
                LUNAR RECONNAISSANCE GEODETIC EVALUATION SYSTEM
              </span>
              <h1 className="text-xl font-bold text-[#f4f4f6] print:text-black">
                HEDEF BRİFİNGİ: {selectedTarget.name}
              </h1>
              <span className="text-xs text-[#9496a1] print:text-zinc-600">
                TARİH: {new Date().toISOString().split("T")[0]} · VERİ TİPİ: NASA PDS AÇIK BİLİMSEL ARŞİV
              </span>
            </div>
            <div className="text-right text-xs text-[#9496a1] print:text-zinc-600 space-y-0.5 font-mono">
              <div>DATUM: MOON-PA-2020</div>
              <div>ELİPSOİT: R=1,737.4 km</div>
              <div>İNİŞ PROFİLİ: {activeLander.name}</div>
            </div>
          </div>

          {/* Coordinates & Footprint Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#121317] border border-[#282a33] print:bg-zinc-100 print:border-zinc-300">
            <div>
              <span className="text-[11px] text-[#9496a1] block font-medium">ENLEM</span>
              <span className="font-semibold text-[#f4f4f6] text-sm print:text-black">
                {selectedTarget.lat.toFixed(4)}°
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#9496a1] block font-medium">BOYLAM</span>
              <span className="font-semibold text-[#f4f4f6] text-sm print:text-black">
                {selectedTarget.lng.toFixed(4)}°
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#9496a1] block font-medium">İNİŞ ELİPSİ</span>
              <span className="font-semibold text-[#d86c6c] text-sm print:text-black">
                {footprintRadiusKm * 2} km × {footprintRadiusKm * 2} km
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#9496a1] block font-medium">YÜKSEKLİK</span>
              <span className="font-semibold text-[#f4f4f6] text-sm print:text-black">
                {selectedTarget.elevationM} m (Datum Ref)
              </span>
            </div>
          </div>

          {/* Overall Flight Readiness Status */}
          <div className="p-5 rounded-2xl bg-[rgba(216,108,108,0.12)] border border-[rgba(216,108,108,0.25)] space-y-2 print:bg-zinc-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#d86c6c] uppercase tracking-wider">
                Uçuş Zarfı Sınıflandırması
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-[#181a20] text-[#d86c6c] shadow-sm border border-[rgba(216,108,108,0.3)] print:bg-white">
                {assessment.classification}
              </span>
            </div>
            <div className="text-3xl font-bold text-[#f4f4f6] print:text-black">
              {assessment.overallScore} <span className="text-lg font-normal text-[#9496a1]">/ 100</span>
            </div>
            <p className="text-[#f4f4f6] print:text-black text-xs leading-relaxed">
              {assessment.recommendation}
            </p>
          </div>

          {/* Hard Safety Constraints */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#f4f4f6] print:text-black uppercase tracking-wider">
              Uçuş Güvenlik Kuralları Doğrulama Matrisi
            </h3>
            <div className="border border-[#282a33] rounded-xl overflow-hidden print:border-zinc-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121317] text-[#9496a1] font-medium border-b border-[#282a33] print:bg-zinc-200 print:text-black">
                  <tr>
                    <th className="p-3">Güvenlik Kuralı</th>
                    <th className="p-3">Eşik Limit</th>
                    <th className="p-3">Ölçülen Değer</th>
                    <th className="p-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#282a33] print:divide-zinc-200">
                  {assessment.hardConstraints.map((c) => (
                    <tr key={c.id} className="hover:bg-[#121317]/50">
                      <td className="p-3 font-medium text-[#f4f4f6] print:text-black">{c.label}</td>
                      <td className="p-3 text-[#9496a1] font-mono">{c.threshold}</td>
                      <td className="p-3 text-[#f4f4f6] print:text-black font-mono font-semibold">{c.measured}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === "pass"
                              ? "bg-[rgba(52,199,89,0.15)] text-[#34c759]"
                              : "bg-[rgba(216,108,108,0.15)] text-[#d86c6c]"
                          }`}
                        >
                          {c.status === "pass" ? "UYGUN (PASS)" : "KABUL EDİLEMEZ (VIOLATION)"}
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
            <h3 className="text-xs font-bold text-[#f4f4f6] print:text-black uppercase tracking-wider">
              Çok Kriterli Jeomekânsal Değerlendirme (MCDA)
            </h3>
            <div className="border border-[#282a33] rounded-xl overflow-hidden print:border-zinc-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121317] text-[#9496a1] font-medium border-b border-[#282a33] print:bg-zinc-200 print:text-black">
                  <tr>
                    <th className="p-3">Kriter</th>
                    <th className="p-3">Skor</th>
                    <th className="p-3">Ölçülen Değer</th>
                    <th className="p-3">Enstrüman & Veri Kaynağı</th>
                    <th className="p-3">Güven Düzeyi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#282a33] print:divide-zinc-200">
                  {assessment.criteria.map((c) => (
                    <tr key={c.id} className="hover:bg-[#121317]/50">
                      <td className="p-3 text-[#f4f4f6] print:text-black font-medium">{c.name}</td>
                      <td className="p-3 font-bold text-[#d86c6c]">{c.score} / 100</td>
                      <td className="p-3 text-[#f4f4f6] print:text-black font-mono">{c.value}</td>
                      <td className="p-3 text-[#9496a1]">{c.instrument}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-medium uppercase text-[#9496a1] bg-[#121317] px-2 py-0.5 rounded">
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
          <div className="border-t border-[#282a33] pt-4 text-xs text-[#9496a1] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#d86c6c]" />
              Doğrulanmış NASA Gezegensel Veri Sistemi (PDS) Ürünleri
            </span>
            <span className="font-mono text-[11px]">RAPOR SONU</span>
          </div>
        </div>
      </div>
    </div>
  );
};

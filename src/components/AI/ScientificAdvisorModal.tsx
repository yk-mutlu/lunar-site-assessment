"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/store";
import { computeSiteAssessment } from "@/data/assessment-engine";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ScientificAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  sender: "system" | "user";
  text: string;
  timestamp: string;
}

export const ScientificAdvisorModal: React.FC<ScientificAdvisorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedTarget, activeLander, footprintRadiusKm } = useStore();
  const [query, setQuery] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("llama3.2-vision:latest");
  const [ollamaStatus, setOllamaStatus] = useState<"connected" | "connecting" | "offline">("connecting");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "system",
      text: `Gezegensel Karar Destek Asistanı devrede. ${selectedTarget.name} sahası için NASA LRO LOLA, Diviner ve LEND arşivleri yüklendi. PC'nizdeki yerel Ollama modeli üzerinden çalışıyorum. Sorunuzu yöneltebilirsiniz.`,
      timestamp: "12:00",
    },
  ]);

  // Fetch installed Ollama models on open
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.models && data.models.length > 0) {
          const names = data.models.map((m: any) => m.name);
          setAvailableModels(names);
          if (names.includes("llama3.2-vision:latest")) {
            setSelectedModel("llama3.2-vision:latest");
          } else if (names.includes("qwen2.5-coder:32b")) {
            setSelectedModel("qwen2.5-coder:32b");
          } else {
            setSelectedModel(names[0]);
          }
          setOllamaStatus("connected");
        } else {
          setOllamaStatus("offline");
        }
      })
      .catch(() => {
        setOllamaStatus("offline");
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const assessment = computeSiteAssessment(selectedTarget, activeLander, footprintRadiusKm);

  const quickQueries = [
    "Bu iniş aracının eğim stabilite sınırını ve devrilme riskini analiz et",
    "LEND nötron verileri ile su buzu tespiti nasıl doğrulanır?",
    "Ay'ın kütleçekim kilitlenmesi (tidal lock) ve DSN iletişim kör noktaları nelerdir?",
    "Güney Kutup sırtları ile ekvatoral iniş alanlarının aydınlatma farkı nedir?",
  ];

  const handleSend = async (text?: string) => {
    const q = text || query;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const siteContext = {
        targetName: selectedTarget.name,
        lat: selectedTarget.lat,
        lng: selectedTarget.lng,
        elevationM: selectedTarget.elevationM,
        landerName: activeLander.name,
        maxSlopeDeg: activeLander.maxSlopeDeg,
        massKg: activeLander.massKg,
        measuredSlope: assessment.criteria.find((c) => c.id === "slope")?.value || "3.5°",
        solarUptimePct: assessment.solarUptimePct,
        waterIceProbabilityPct: assessment.waterIceProbabilityPct,
        directEarthLOS: assessment.earthLOS.directLineOfSight,
        overallScore: assessment.overallScore,
        classification: assessment.classification,
      };

      const res = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: q }],
          siteContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama yanıt vermedi (Kod: ${res.status})`);
      }

      const data = await res.json();
      const botReply = data.reply || "Model boş yanıt döndürdü.";

      setMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: `[Ollama Bağlantı Uyarısı]: ${err.message}. PC'nizde Ollama'nın çalıştığından ('ollama serve') emin olun.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-[#181a20] border border-[#282a33] rounded-3xl shadow-tesla flex flex-col h-[560px] overflow-hidden font-sans text-[#f4f4f6]">
        {/* Header */}
        <div className="h-16 px-5 border-b border-[#282a33] flex items-center justify-between bg-[#14151a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[rgba(216,108,108,0.15)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#d86c6c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-sm font-semibold text-[#f4f4f6] block leading-tight">
                  Gezegensel Bilimsel Danışman (Yerel Ollama LLM)
                </span>
                {ollamaStatus === "connected" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#34c759] bg-[rgba(52,199,89,0.15)] px-2 py-0.5 rounded-full border border-[rgba(52,199,89,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
                    Ollama Aktif
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#ff9f0a] bg-[rgba(255,159,10,0.15)] px-2 py-0.5 rounded-full border border-[rgba(255,159,10,0.3)]">
                    <AlertCircle className="w-3 h-3 text-[#ff9f0a]" />
                    Ollama Bağlanıyor
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#9496a1] font-sans">
                NASA LRO & Diviner Arşivleri Doğrudan Yerel Yapay Zeka ile Eşleştirildi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Selector Dropdown */}
            {availableModels.length > 0 && (
              <div className="flex items-center gap-1 bg-[#22242c] border border-[#282a33] rounded-full px-2.5 py-1 text-xs">
                <Cpu className="w-3.5 h-3.5 text-[#9496a1]" />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent text-xs text-[#f4f4f6] font-medium focus:outline-none cursor-pointer"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m} className="bg-[#181a20] text-[#f4f4f6]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9496a1] hover:text-[#f4f4f6] hover:bg-[#22242c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scientific Disclaimers & Active Model Badge */}
        <div className="px-5 py-2 bg-[#121317] border-b border-[#282a33] flex items-center justify-between text-xs font-sans text-[#9496a1]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-[#d86c6c] flex-shrink-0" />
            <span>Aktif Hedef: {selectedTarget.name} ({selectedTarget.lat.toFixed(2)}°, {selectedTarget.lng.toFixed(2)}°)</span>
          </div>
          <span className="font-mono text-[11px] text-[#f4f4f6] font-semibold">
            Model: {selectedModel}
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 font-sans text-xs bg-[#181a20]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.sender === "system" && (
                <div className="w-7 h-7 rounded-full bg-[rgba(216,108,108,0.15)] border border-[rgba(216,108,108,0.3)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#d86c6c]" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm ${
                  m.sender === "user"
                    ? "bg-[#d86c6c] text-white"
                    : "bg-[#121317] border border-[#282a33] text-[#f4f4f6]"
                }`}
              >
                <p className="text-xs whitespace-pre-wrap">{m.text}</p>
                <span
                  className={`block mt-1 text-[10px] text-right font-mono ${
                    m.sender === "user" ? "text-white/80" : "text-[#9496a1]"
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs font-sans text-[#f4f4f6] pl-10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d86c6c] animate-ping" />
              <span className="font-medium text-[#d86c6c]">
                Yerel model ({selectedModel}) gerçek zamanlı analiz üretiyor...
              </span>
            </div>
          )}
        </div>

        {/* Quick query pills */}
        <div className="px-4 py-2 border-t border-[#282a33] bg-[#14151a] flex gap-2 overflow-x-auto">
          {quickQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] font-sans whitespace-nowrap px-3 py-1 rounded-full bg-[#22242c] hover:bg-[#2c2f3a] text-[#9496a1] hover:text-[#f4f4f6] border border-[#282a33] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Query Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-[#282a33] bg-[#14151a] flex items-center gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder="Ollama modeline iniş sahası, eğim, su buzu veya DSN bağlantısı hakkında soru sorun..."
            className="flex-1 bg-[#121317] border border-[#282a33] rounded-full px-4 py-2 text-xs font-sans text-[#f4f4f6] placeholder-[#5c5e69] focus:outline-none focus:border-[#d86c6c]"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-9 h-9 rounded-full bg-[#d86c6c] hover:bg-[#c55a5a] disabled:opacity-50 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

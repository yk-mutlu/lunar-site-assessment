import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { model, messages, siteContext } = await req.json();

    const selectedModel = model || "llama3.2-vision:latest";

    // Build scientific decision support system prompt with actual telemetry
    const systemPrompt = `Sen NASA ve Artemis programı için çalışan uzman bir Ay İniş ve Gezegensel Karar Destek Asistanısın (Lunar Landing & Planetary Decision Support Advisor).
Kullanıcıya daima Türkçe, bilimsel olarak tutarlı, net ve profesyonel yanıtlar ver.
Şu anda seçili olan iniş sahası ve telemetri verileri aşağıdadır:

--- AKTİF İNİŞ SAHASI BİLGİLERİ ---
- Hedef Adı: ${siteContext?.targetName || "Shackleton Crater Rim"}
- Koordinatlar: ${siteContext?.lat || -89.54}° Enlem, ${siteContext?.lng || -138.0}° Boylam
- Rakım: ${siteContext?.elevationM || 1420} m (LRO LOLA Datum Ref)
- Ölçülen Yüzey Eğimi: ${siteContext?.measuredSlope || "3.5"}°
- Aktif İniş Aracı: ${siteContext?.landerName || "CLPS Commercial Lander"} (Maks Eğim Limiti: ${siteContext?.maxSlopeDeg || 8.0}°, Kütle: ${siteContext?.massKg || 1800} kg)
- Yıllık Güneşlenme (Solar Uptime): %${siteContext?.solarUptimePct || 86}
- Kalıcı Gölgeli Bölge (PSR) & Su Buzu İndeksi: %${siteContext?.waterIceProbabilityPct || 78} (LRO LEND nötron spektrometresi)
- Doğrudan Dünya İletişimi (DTE LOS): ${siteContext?.directEarthLOS ? "Açık (Doğrudan DSN görüşü var)" : "Kapalı (Ay arkasında veya derin krater çukurunda, röle uydusu zorunlu)"}
- İniş Değerlendirmesi: ${siteContext?.overallScore || 85} / 100 (${siteContext?.classification || "NOMINAL"})

Bu verileri göz önünde bulundurarak iniş güvenliği, devrilme riskleri, güç üretimi, su buzu madenciliği veya iletişim pencereleri hakkında kullanıcının sorularını açıkla. Spekülasyon yapma, NASA verilerini ve fiziği temel al.`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    const ollamaRes = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: fullMessages,
        stream: false,
      }),
    });

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      return NextResponse.json(
        { error: "Ollama model generation failed", details: errorText },
        { status: 502 }
      );
    }

    const data = await ollamaRes.json();
    return NextResponse.json({
      reply: data.message?.content || "Cevap üretilemedi.",
      model: selectedModel,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Ollama bağlantı hatası", details: err.message },
      { status: 500 }
    );
  }
}

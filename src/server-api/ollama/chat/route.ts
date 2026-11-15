import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { model, messages, siteContext } = await req.json();

    const selectedModel = model || "llama3.2-vision:latest";

    // Build scientific decision support system prompt with actual telemetry
    const systemPrompt = `You are an expert Lunar Landing & Planetary Decision Support Advisor for NASA and the Artemis program.
Always provide answers in clear, scientifically consistent, precise, and professional English.
The currently selected landing site and mission telemetry are summarized below:

--- ACTIVE LUNAR LANDING SITE TELEMETRY ---
- Target Name: ${siteContext?.targetName || "Shackleton Crater Rim"}
- Coordinates: ${siteContext?.lat || -89.54}° Lat, ${siteContext?.lng || -138.0}° Lng
- Elevation: ${siteContext?.elevationM || 1420} m (LRO LOLA Datum Reference)
- Measured Surface Slope: ${siteContext?.measuredSlope || "3.5"}°
- Active Lander Profile: ${siteContext?.landerName || "CLPS Commercial Lander"} (Max Slope Limit: ${siteContext?.maxSlopeDeg || 8.0}°, Mass: ${siteContext?.massKg || 1800} kg)
- Annual Illumination Uptime: ${siteContext?.solarUptimePct || 86}%
- Permanently Shadowed Region (PSR) & Volatile Index: ${siteContext?.waterIceProbabilityPct || 78}% (LRO LEND neutron detector)
- Direct-to-Earth Communication (DTE LOS): ${siteContext?.directEarthLOS ? "Unobstructed (Direct DSN carrier lock)" : "Occluded (Horizon obstacle, orbital relay required)"}
- Landing Assessment Score: ${siteContext?.overallScore || 85} / 100 (${siteContext?.classification || "NOMINAL"})

Analyze landing safety, tip-over dynamics, photovoltaic power continuity, in-situ water ice extraction, or DSN communication windows based on these metrics. Ground all reasoning strictly in physics and verified NASA mission data.`;

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
      reply: data.message?.content || "No response generated.",
      model: selectedModel,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Ollama connection error", details: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/tags", {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Ollama not responding" }, { status: 502 });
    }
    const data = await res.json();
    const models = (data.models || []).map((m: any) => ({
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size,
    }));
    return NextResponse.json({ models });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Could not connect to Ollama on http://127.0.0.1:11434", details: err.message },
      { status: 503 }
    );
  }
}

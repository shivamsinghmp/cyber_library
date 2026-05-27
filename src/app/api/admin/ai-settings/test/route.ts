import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { batchGetAppSettings } from "@/lib/app-settings";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({})) as {
    provider?: string;
    // vertex fields (can be passed for pre-save test)
    projectId?: string; location?: string; apiKey?: string;
    // anthropic/openai
    value?: string;
  };
  const provider = (body.provider ?? "vertex") as "vertex" | "anthropic" | "openai";

  try {
    if (provider === "vertex") {
      // Use provided values or fall back to saved settings
      let projectId = body.projectId?.trim() ?? null;
      let location  = body.location?.trim()  ?? null;
      let apiKey    = body.apiKey?.trim()     ?? null;

      if (!projectId || !location || !apiKey) {
        const settings = await batchGetAppSettings(["VERTEX_PROJECT_ID", "VERTEX_LOCATION", "VERTEX_API_KEY"]);
        projectId = projectId ?? settings["VERTEX_PROJECT_ID"] ?? null;
        location  = location  ?? settings["VERTEX_LOCATION"]   ?? null;
        apiKey    = apiKey    ?? settings["VERTEX_API_KEY"]    ?? null;
      }

      if (!projectId || !location || !apiKey) {
        return NextResponse.json({ ok: false, error: "Vertex AI configuration incomplete — Project ID, Location, aur API Key sab chahiye" });
      }

      const { vertexUrl, vertexAuthHeaders } = await import("@/lib/vertex-auth");

      const res = await fetch(
        vertexUrl(projectId, location, "gemini-2.0-flash"),
        {
          method: "POST",
          headers: vertexAuthHeaders(apiKey),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0 },
          }),
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (res.status === 401 || res.status === 403) return NextResponse.json({ ok: false, error: "Permission denied (403) — service account ko Vertex AI User role chahiye" });
      if (res.status === 429) return NextResponse.json({ ok: true, message: "Vertex AI configured ✓ (rate limited — will work fine)" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = txt.slice(0, 200);
        try { msg = (JSON.parse(txt) as { error?: { message?: string } }).error?.message ?? msg; } catch {}
        return NextResponse.json({ ok: false, error: `Vertex AI error (${res.status}): ${msg}` });
      }
      return NextResponse.json({ ok: true, message: "Vertex AI configured ✓ — gemini-2.0-flash responding" });
    }

    // anthropic / openai — use single value key
    let key = body.value?.trim() ?? null;
    if (!key) {
      const settings = await batchGetAppSettings(
        provider === "anthropic" ? ["ANTHROPIC_API_KEY"] : ["OPENAI_API_KEY"]
      );
      key = settings[provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"] ?? null;
    }
    if (!key) return NextResponse.json({ ok: false, error: "No API key configured" });

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 5, messages: [{ role: "user", content: "Say OK" }] }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 401) return NextResponse.json({ ok: false, error: "Invalid API key (401)" });
      if (res.status === 429) return NextResponse.json({ ok: true, message: "Key valid ✓ (rate limited — free tier RPM hit, will work fine)" });
      if (!res.ok) return NextResponse.json({ ok: false, error: `Anthropic error (${res.status})` });
      return NextResponse.json({ ok: true, message: "Anthropic key is valid ✓" });
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", max_completion_tokens: 5, messages: [{ role: "user", content: "Say OK" }] }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 401) return NextResponse.json({ ok: false, error: "Invalid API key (401)" });
      if (res.status === 429) return NextResponse.json({ ok: true, message: "Key valid ✓ (rate limited — free tier RPM hit, will work fine)" });
      if (!res.ok) return NextResponse.json({ ok: false, error: `OpenAI error (${res.status})` });
      return NextResponse.json({ ok: true, message: "OpenAI key is valid ✓" });
    }

    return NextResponse.json({ ok: false, error: "Unknown provider" });
  } catch (e) {
    const msg = (e as Error).message ?? "Test failed";
    return NextResponse.json({ ok: false, error: msg });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { getAppSetting } from "@/lib/app-settings";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({})) as { provider?: string; value?: string };
  const provider = (body.provider ?? "gemini") as "gemini" | "anthropic" | "openai";

  // Use provided value (testing before save) or fall back to saved key
  let key = body.value?.trim() ?? null;
  if (!key) {
    const settingKey =
      provider === "gemini"    ? "GEMINI_API_KEY" :
      provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    key = await getAppSetting(settingKey);
  }

  if (!key) {
    return NextResponse.json({ ok: false, error: "No API key configured" });
  }

  try {
    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0 },
          }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (res.status === 403) return NextResponse.json({ ok: false, error: "Invalid or expired API key (403)" });
      if (res.status === 429) return NextResponse.json({ ok: false, error: "Quota exceeded (429) — key is valid but rate limited" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = txt.slice(0, 200);
        try { msg = (JSON.parse(txt) as { error?: { message?: string } }).error?.message ?? msg; } catch {}
        return NextResponse.json({ ok: false, error: `Gemini error (${res.status}): ${msg}` });
      }
      return NextResponse.json({ ok: true, message: "Gemini key is valid ✓" });
    }

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 5, messages: [{ role: "user", content: "Say OK" }] }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 401) return NextResponse.json({ ok: false, error: "Invalid API key (401)" });
      if (res.status === 429) return NextResponse.json({ ok: false, error: "Quota exceeded — key is valid" });
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
      if (res.status === 429) return NextResponse.json({ ok: false, error: "Quota exceeded — key is valid" });
      if (!res.ok) return NextResponse.json({ ok: false, error: `OpenAI error (${res.status})` });
      return NextResponse.json({ ok: true, message: "OpenAI key is valid ✓" });
    }

    return NextResponse.json({ ok: false, error: "Unknown provider" });
  } catch (e) {
    const msg = (e as Error).message ?? "Test failed";
    return NextResponse.json({ ok: false, error: msg });
  }
}

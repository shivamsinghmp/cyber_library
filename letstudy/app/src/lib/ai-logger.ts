/**
 * Fire-and-forget AI usage logger.
 * Call logAIUsage() after every AI API call — it never throws and never blocks
 * the HTTP response, so latency impact is zero.
 */
import { prisma } from "@/lib/prisma";

// Approximate USD cost per total token (blended input+output average)
// Derived from published API pricing at the time of writing.
const COST_PER_TOKEN_USD: Record<string, number> = {
  "gemini-2.5-flash":  0.00000015,  // ~$0.15/1M tokens
  "gemini-2.0-flash":  0.00000019,
  "gemini-1.5-pro":    0.0000023,
  "gemini-2.5-pro":    0.0000040,
  "claude-haiku":      0.0000018,
  "claude-sonnet":     0.0000079,
  "claude-opus":       0.0000328,
  "gpt-4o-mini":       0.00000028,
  "gpt-4.1-mini":      0.00000074,
  "gpt-4.1":           0.0000037,
  "gpt-4o":            0.0000046,
  "gpt-o1-mini":       0.0000055,
  "gpt-o1":            0.0000277,
};

const USD_TO_INR = parseFloat(process.env.USD_TO_INR ?? "83.5");

function calcCost(model: string, totalTokens: number): { costUsd: number; costInr: number } {
  const rate   = COST_PER_TOKEN_USD[model] ?? 0.000001;
  const costUsd = rate * totalTokens;
  return {
    costUsd: parseFloat(costUsd.toFixed(8)),
    costInr: parseFloat((costUsd * USD_TO_INR).toFixed(4)),
  };
}

export interface AILogParams {
  userId:        string | null;
  feature:       string;           // "studymate" | "studymate_meet" | "profile_extract" | "router"
  provider:      string;           // "google" | "anthropic" | "openai"
  model:         string;           // "gemini-2.5-flash" | "claude-sonnet" etc.
  inputTokens:   number;
  outputTokens:  number;
  coinsCharged?: number;
  latencyMs:     number;
  status?:       "success" | "error" | "timeout";
  errorMessage?: string;
}

export function logAIUsage(params: AILogParams): void {
  const {
    userId, feature, provider, model,
    inputTokens, outputTokens,
    coinsCharged = 0, latencyMs,
    status = "success", errorMessage,
  } = params;

  const logId       = "AILOG" + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  const totalTokens = inputTokens + outputTokens;
  const { costUsd, costInr } = calcCost(model, totalTokens);

  prisma.aIUsageLog.create({
    data: {
      logId,
      userId:       userId ?? null,
      feature,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
      costInr,
      coinsCharged,
      latencyMs,
      status,
      errorMessage: errorMessage ?? null,
    },
  }).catch(() => {});
}

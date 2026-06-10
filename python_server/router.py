"""
Smart model router — uses Gemini to classify message complexity,
then picks the cheapest model that fits that tier.

Tiers:
  stem    → Physics, Maths, Chemistry, Biology, equations, proofs
  smart   → Coding, history, geography, grammar, non-STEM subjects
  premium → Complex multi-step cross-subject research, long essays
  budget  → Motivation, study plans, MCQ tips, general chat (default)

Budget modes:
  strict   → always cheapest regardless of tier
  balanced → tier-based (default)
  quality  → always best available
"""

import httpx
import logging
from models import coins_for, provider_for, REGISTRY
from config import GEMINI_BASE, CLASSIFIER_TIMEOUT

log = logging.getLogger(__name__)

CLASSIFIER_PROMPT = """\
Classify this student message into ONE tier. Reply with ONLY one word.

TIERS:
stem    → ANY Physics, Mathematics, Chemistry, Biology, logical reasoning, numerical problem, equation, derivation, proof, diagram-based question
budget  → motivation, study plan, MCQ tips, general chat, exam strategy
smart   → coding, history/geography concepts, language/grammar, non-STEM subjects
premium → complex multi-step cross-subject research, very long essay analysis

Message: "{msg}"

Reply (stem OR budget OR smart OR premium):"""


async def route_to_model(
    last_message: str,
    available: list[str],
    google_key: str | None,
    budget_mode: str = "balanced",
) -> str:
    if not available:
        raise ValueError("No models available")

    if len(available) == 1:
        return available[0]

    # ── Budget mode shortcuts ──────────────────────────────────────────────────
    by_cost = sorted(available, key=lambda m: coins_for(m))

    if budget_mode == "strict":
        chosen = by_cost[0]
        log.info(f"[Router] strict mode → {chosen}")
        return chosen

    if budget_mode == "quality":
        chosen = by_cost[-1]
        log.info(f"[Router] quality mode → {chosen}")
        return chosen

    # ── Balanced: tier-based routing ──────────────────────────────────────────
    budget_models  = [m for m in available if coins_for(m) <= 2]
    smart_models   = [m for m in available if 3 <= coins_for(m) <= 9]
    premium_models = [m for m in available if coins_for(m) >= 10]

    # Sort cheapest-first within each tier
    budget_models.sort(key=lambda m: coins_for(m))
    smart_models.sort(key=lambda m: coins_for(m))
    premium_models.sort(key=lambda m: coins_for(m))

    # Best Gemini model for STEM (vision + reasoning)
    stem_model = next(
        (m for m in ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-2.5-flash"]
         if m in available),
        by_cost[-1],
    )

    fallback = budget_models[0] if budget_models else smart_models[0] if smart_models else by_cost[0]

    if not google_key:
        log.info(f"[Router] no Google key → fallback {fallback}")
        return fallback

    try:
        async with httpx.AsyncClient(timeout=CLASSIFIER_TIMEOUT) as client:
            r = await client.post(
                f"{GEMINI_BASE}/gemini-2.5-flash:generateContent?key={google_key}",
                json={
                    "contents": [{"role": "user", "parts": [{"text": CLASSIFIER_PROMPT.format(
                        msg=last_message[:400]
                    )}]}],
                    "generationConfig": {"maxOutputTokens": 8, "temperature": 0},
                },
            )
        if not r.is_success:
            log.warning(f"[Router] classifier HTTP {r.status_code} → fallback {fallback}")
            return fallback

        raw = (
            r.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
            .lower()
        )

        if raw.startswith("stem"):
            tier, chosen = "stem", stem_model
        elif raw.startswith("premium"):
            tier, chosen = "premium", premium_models[0] if premium_models else smart_models[0] if smart_models else by_cost[-1]
        elif raw.startswith("smart"):
            tier, chosen = "smart", smart_models[0] if smart_models else budget_models[0] if budget_models else by_cost[0]
        else:
            tier, chosen = "budget", budget_models[0] if budget_models else by_cost[0]

        log.info(f"[Router] '{last_message[:60]}' → tier={tier} model={chosen} raw='{raw}'")
        return chosen

    except Exception as e:
        log.warning(f"[Router] classifier failed → fallback {fallback}: {e}")
        return fallback

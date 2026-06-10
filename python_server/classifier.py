"""
WhatsApp message intent classifier.
Uses Gemini Flash Lite for speed — typically < 500ms.
Routes messages so the AI bot only handles genuine study questions.
"""

import logging
import httpx
from config import GEMINI_BASE, CLASSIFIER_TIMEOUT

log = logging.getLogger(__name__)

# Shared client — connection pooling avoids a new TLS handshake per request
_client = httpx.AsyncClient(timeout=CLASSIFIER_TIMEOUT)

INTENTS = ["study_help", "schedule", "payment", "greeting", "ignore"]

_PROMPT = """\
Classify this WhatsApp message from a student into exactly one category.

Categories:
- study_help : question about subjects, exam prep, homework, doubt, concept, formula
- schedule   : asking about class time, when is class, schedule, zoom link, joining
- payment    : asking about fees, subscription, coins, recharge, buy, price
- greeting   : hi, hello, thanks, ok, great, seen, sticker, short acknowledgment (≤ 4 words)
- ignore     : pure emoji reaction, [Sticker], [Image], [Location], [Voice Message], empty

Message: "{message}"

Reply with ONLY the category name. No explanation, no punctuation."""


async def classify_wa_intent(message: str, api_key: str | None) -> str:
    """Returns one of: study_help, schedule, payment, greeting, ignore.
    Falls back to 'study_help' on any error so no message is silently dropped."""
    if not message.strip():
        return "ignore"

    # Obvious non-study patterns — avoid API call
    if message.startswith("["):          # [Sticker], [Image], etc.
        return "ignore"
    if len(message.strip().split()) <= 2:
        return "greeting"

    if not api_key:
        return "study_help"             # no key → assume study question

    prompt = _PROMPT.format(message=message[:500])
    # API key goes in a header, not the URL — URLs leak into proxy/access logs
    url = f"{GEMINI_BASE}/gemini-2.5-flash-lite:generateContent"

    try:
        resp = await _client.post(url, headers={"x-goog-api-key": api_key}, json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 10, "temperature": 0.0},
        })

        if resp.status_code != 200:
            log.warning(f"[classifier] HTTP {resp.status_code}")
            return "study_help"

        raw = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
            .lower()
        )

        for intent in INTENTS:
            if intent in raw:
                log.info(f"[classifier] '{message[:50]}' → {intent}")
                return intent

        return "study_help"

    except Exception as e:
        log.warning(f"[classifier] failed: {e}")
        return "study_help"

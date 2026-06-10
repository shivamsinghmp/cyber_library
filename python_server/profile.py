"""
Fire-and-forget profile extraction from conversation.
Called after student's second message — extracts name, exam, year, goal.
"""

import json
import logging
import httpx
from config import GEMINI_BASE, EXTRACT_TIMEOUT

log = logging.getLogger(__name__)

EXTRACT_PROMPT = """\
Extract student profile from this conversation. Return ONLY valid JSON, nothing else.

Conversation:
{snippet}

Return this JSON (use null if info not mentioned):
{{"fullName": "string or null", "targetExam": "string or null", "targetYear": "string or null", "studyGoal": "string or null"}}"""


async def extract_profile(conversation: list[dict], api_key: str) -> dict:
    """Returns extracted profile dict — never raises."""
    try:
        snippet = "\n".join(
            f"{'Student' if m['role'] == 'user' else 'AI'}: {m['content'][:400]}"
            for m in conversation[-6:]
        )

        async with httpx.AsyncClient(timeout=EXTRACT_TIMEOUT) as client:
            r = await client.post(
                f"{GEMINI_BASE}/gemini-2.5-flash:generateContent?key={api_key}",
                json={
                    "contents": [{"role": "user", "parts": [{"text": EXTRACT_PROMPT.format(snippet=snippet)}]}],
                    "generationConfig": {"maxOutputTokens": 150, "temperature": 0},
                },
            )

        if not r.is_success:
            return {}

        text = (
            r.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )

        import re
        match = re.search(r'\{[\s\S]*\}', text)
        if not match:
            return {}

        data = json.loads(match.group())
        return {k: v for k, v in data.items() if v and str(v).strip()}

    except Exception as e:
        log.debug(f"[Profile extract] silent fail: {e}")
        return {}

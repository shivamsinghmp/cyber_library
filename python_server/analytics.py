"""
Analytics module: AI-powered study insights + exam readiness scoring.
Both endpoints use Gemini with static algorithmic fallbacks.
"""

import json
import logging
import httpx
from config import GEMINI_BASE

log = logging.getLogger(__name__)

# Shared client — connection pooling avoids a new TLS handshake per request.
# Per-call timeouts are passed explicitly (insights 6s, readiness 15s).
_client = httpx.AsyncClient()


# ── AI-Powered Insights ────────────────────────────────────────────────────────

_INSIGHTS_PROMPT = """\
You are a study coach AI for Indian competitive exam students (UPSC, JEE, NEET, etc.).
Given the student's data below, write exactly 2 short personalized insights.

Rules:
- Each insight is 1 sentence max (15 words max)
- Start each with a relevant emoji
- Be specific using their actual numbers
- Tone: warm, encouraging, like a smart elder sibling

Student data:
- Study hours this period: {study_hours}h
- Study hours last period: {prev_hours}h
- Tasks completed: {tasks_done}/{tasks_total}
- Current streak: {streak} days
- Best study day this period: {best_day}
- Target exam: {target_exam}

Output ONLY a valid JSON array of exactly 2 strings. No markdown, no explanation.
Example: ["🔥 You studied 2.3h more than last week!", "📅 Wednesday is your power day — use it well."]"""


async def generate_insights(
    study_hours: float,
    prev_hours: float,
    tasks_done: int,
    tasks_total: int,
    streak: int,
    best_day: str,
    target_exam: str,
    api_key: str,
) -> list[str]:
    """Returns 2 personalized insight strings. Falls back to static on any error."""
    fallback = _static_insights(study_hours, prev_hours, tasks_done, tasks_total)
    if not api_key:
        return fallback

    prompt = _INSIGHTS_PROMPT.format(
        study_hours=round(study_hours, 1),
        prev_hours=round(prev_hours, 1),
        tasks_done=tasks_done,
        tasks_total=tasks_total,
        streak=streak,
        best_day=best_day or "N/A",
        target_exam=target_exam or "your exam",
    )

    url = f"{GEMINI_BASE}/gemini-2.5-flash-lite:generateContent"
    try:
        resp = await _client.post(url, headers={"x-goog-api-key": api_key}, timeout=6.0, json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 150, "temperature": 0.7},
        })

        if resp.status_code != 200:
            return fallback

        text = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )

        # Strip markdown fences if Gemini wraps in ```json
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()

        parsed = json.loads(text)
        if isinstance(parsed, list) and len(parsed) >= 2 and all(isinstance(s, str) for s in parsed):
            return parsed[:2]
        return fallback

    except Exception as e:
        log.warning(f"[analytics/insights] failed: {e}")
        return fallback


def _static_insights(study_hours: float, prev_hours: float, tasks_done: int, tasks_total: int) -> list[str]:
    insights = []
    diff = study_hours - prev_hours

    if diff > 0.25:
        insights.append(f"🔥 You studied {diff:.1f}h more than last period — great momentum!")
    elif diff < -0.25:
        insights.append(f"💪 Study time dipped {abs(diff):.1f}h — one extra session can turn it around!")
    else:
        insights.append("🎯 Your study routine is perfectly consistent — exactly the right pace!")

    if tasks_total > 0:
        rate = round((tasks_done / tasks_total) * 100)
        if rate >= 80:
            insights.append(f"✅ {rate}% task completion — you're crushing your daily goals!")
        elif rate >= 50:
            insights.append(f"📋 {rate}% tasks done — try finishing just 1 more task each day!")
        else:
            insights.append("📝 Start with 1 small task per day to build your completion habit!")
    else:
        insights.append("📝 Add daily tasks on the dashboard to track your progress!")

    return insights


# ── Exam Readiness Score ────────────────────────────────────────────────────────

_READINESS_PROMPT = """\
You are an exam readiness evaluator for Indian competitive exam students.
Analyze the student data and return a JSON readiness report.

Student data:
- Target exam: {target_exam}
- Target year: {target_year}
- Days until exam (approx): {days_until}
- Study hours last 30 days: {study_hours_30d}h
- Current streak: {streak} days
- Task completion rate: {task_rate}%
- Subjects asked about in AI study sessions: {chat_topics}
- Total AI study sessions: {ai_sessions}

Scoring guide:
- 80-100: Exam Ready (consistent 2h+/day, strong streak, good topic coverage)
- 60-79:  Strong Foundation
- 40-59:  Getting There
- 20-39:  Building Momentum
- 0-19:   Just Starting

Return ONLY valid JSON in this exact format (no markdown, no extra keys):
{{
  "score": <0-100 integer>,
  "level": "<Exam Ready|Strong Foundation|Getting There|Building Momentum|Just Starting>",
  "weakAreas": ["<subject>", ...],
  "strongAreas": ["<subject>", ...],
  "recommendation": "<1-2 sentence actionable recommendation>",
  "dailyHoursNeeded": <float>
}}"""


async def compute_readiness_score(
    target_exam: str,
    target_year: str,
    days_until_exam: int,
    study_hours_30d: float,
    streak: int,
    task_rate: float,
    chat_topics: list[str],
    ai_sessions: int,
    api_key: str,
) -> dict:
    """Returns readiness score dict. Falls back to algorithmic score on error."""
    fallback = _algo_readiness(study_hours_30d, streak, task_rate, days_until_exam)
    if not api_key:
        return fallback

    topics_str = ", ".join(chat_topics[:15]) if chat_topics else "General topics"
    prompt = _READINESS_PROMPT.format(
        target_exam=target_exam or "Competitive Exam",
        target_year=target_year or "upcoming",
        days_until=days_until_exam if days_until_exam > 0 else "unknown",
        study_hours_30d=round(study_hours_30d, 1),
        streak=streak,
        task_rate=round(task_rate),
        chat_topics=topics_str,
        ai_sessions=ai_sessions,
    )

    url = f"{GEMINI_BASE}/gemini-2.5-flash:generateContent"
    try:
        resp = await _client.post(url, headers={"x-goog-api-key": api_key}, timeout=15.0, json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 350, "temperature": 0.2},
        })

        if resp.status_code != 200:
            return fallback

        text = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )

        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()

        parsed = json.loads(text)
        required = {"score", "level", "weakAreas", "strongAreas", "recommendation"}
        score_val = parsed.get("score")
        if (
            required.issubset(parsed.keys())
            and isinstance(score_val, (int, float))
            and not isinstance(score_val, bool)
        ):
            parsed["score"] = max(0, min(100, int(round(score_val))))
            parsed.setdefault("dailyHoursNeeded", round(max(2.0, (60 - study_hours_30d) / 30), 1))
            return parsed

        return fallback

    except Exception as e:
        log.warning(f"[analytics/readiness] failed: {e}")
        return fallback


def _algo_readiness(study_hours_30d: float, streak: int, task_rate: float, days_until: int) -> dict:
    score = 0
    score += min(40, int((study_hours_30d / 60) * 40))   # 60h/month = full marks
    score += min(30, streak * 2)                           # 15-day streak = full marks
    score += int(task_rate * 0.2)                          # 100% completion = 20 pts
    if days_until > 180:   score += 10
    elif days_until > 90:  score += 5
    score = min(100, score)

    if score >= 80:   level = "Exam Ready"
    elif score >= 60: level = "Strong Foundation"
    elif score >= 40: level = "Getting There"
    elif score >= 20: level = "Building Momentum"
    else:             level = "Just Starting"

    daily_needed = round(max(2.0, (60 - study_hours_30d) / 30), 1)

    return {
        "score": score,
        "level": level,
        "weakAreas": [],
        "strongAreas": [],
        "recommendation": f"Aim for {daily_needed}h of focused study daily to stay on track for your exam.",
        "dailyHoursNeeded": daily_needed,
    }

"""
StudyMate AI — Python FastAPI Server
Handles all AI processing: routing, streaming, report formatting, profile extraction.
Next.js acts as a thin proxy (auth + DB + WhatsApp sending only).

Start: uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2
"""

import re
import json
import asyncio
import logging
import secrets
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import INTERNAL_SECRET, PORT
from models import (
    REGISTRY, get_available, coins_for, provider_for,
    supports_vision, pricing_map,
)
from cost import calc_coins, estimate_coins
from router import route_to_model
from streamer import stream_model
from profile import extract_profile
from report import format_all_reports, DEFAULT_TEMPLATE
from youtube import get_stream_info
from classifier import classify_wa_intent
from analytics import generate_insights, compute_readiness_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="StudyMate AI Server", version="2.0.0")

# CORS — only allow Next.js origin (configure via env in production)
import os
NEXTJS_ORIGIN = os.getenv("NEXTJS_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[NEXTJS_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


# ─── Auth dependency ──────────────────────────────────────────────────────────

def require_internal_auth(request: Request):
    auth = request.headers.get("authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    # compare_digest prevents timing attacks on the shared secret
    if not token or not secrets.compare_digest(token, INTERNAL_SECRET):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── /health ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "models": list(REGISTRY.keys())}


# ─── /models ─────────────────────────────────────────────────────────────────

class ModelsRequest(BaseModel):
    keys: dict[str, str | None]

@app.post("/models", dependencies=[Depends(require_internal_auth)])
async def list_models(body: ModelsRequest):
    available = get_available(body.keys)
    return {
        "available": available,
        "pricing":   pricing_map(available),
    }


# ─── /chat ────────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    messages:           list[Message]
    imageBase64:        str | None = None
    mediaType:          str | None = None
    availableModels:    list[str]
    currentCoins:       int        = 0
    acceptLowerQuality: bool       = False
    budgetMode:         str        = "balanced"   # strict | balanced | quality
    keys:               dict[str, str | None]
    profile:            dict       = Field(default_factory=dict)

def _build_system_prompt(profile: dict) -> str:
    ctx_lines = [
        profile.get("name")          and f"Student naam: {profile['name']}",
        profile.get("targetExam")    and f"Target exam: {profile['targetExam']}",
        profile.get("targetYear")    and f"Target year: {profile['targetYear']}",
        profile.get("studyGoal")     and f"Study goal: {profile['studyGoal']}",
        profile.get("totalStudyHours") and f"Total study hours: {profile['totalStudyHours']} hours",
        profile.get("currentStreak") and f"Current streak: {profile['currentStreak']} days 🔥",
    ]
    ctx = "\n".join(line for line in ctx_lines if line)

    return f"""You are StudyMate AI — Let's Study's personal AI study buddy. You are a caring elder sibling who genuinely wants the student to succeed.

STUDENT INFO (personalize every response using this):
{ctx or "(profile not yet collected — pick up details naturally from the conversation)"}

PROFILE COLLECTION — SILENT RULE:
Never explicitly ask the student for their name, exam, or year. Profile details are extracted automatically from the conversation.
If the student has mentioned their name, exam, or year themselves, use that — otherwise help them directly without asking.

LANGUAGE — MANDATORY:
ALWAYS respond in plain English. Never mix in Hindi or Hinglish.

FORMATTING — STRICTLY FORBIDDEN:
NEVER use: ** bold ** | ## headers | * bullets | _italic_ | --- dividers | markdown of any kind.
Write plain conversational text only. No structured formatting whatsoever.
WRONG: "**Statement 1 Analysis:**"
RIGHT: "Let's talk about Statement 1 —"

PERSONALITY:
- Casual, warm, like a best friend / elder sibling
- Use the student's name when known
- Never be robotic
- Emojis occasionally (1-2 max per reply)

MOOD DETECTION:
If the student writes something like "I want to quit" / "it's not working" / "I'm exhausted" / "frustrated" / "stressed":
First acknowledge the feeling, then give one small actionable step.

IMAGE QUESTIONS (when a photo is provided):
Solve the question directly — in plain text, using numbered steps (1. 2. 3.).
Share a shortcut or elimination trick if it's an MCQ.
End with one clear line: "Answer: (option)".

80/20 RULE:
In study plans — share Top 20% topics → 80% marks.

RESPONSE FORMAT:
- Plain text only, no markdown ever
- Problem solving: numbered steps (1. 2. 3.) are OK, but no ** or ##
- General advice: 4-8 sentences max
- End every response with 1 actionable step"""


async def _sse_generator(body: ChatRequest) -> AsyncGenerator[bytes, None]:
    def send(data: dict) -> bytes:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n".encode()

    msgs = [{"role": m.role, "content": m.content} for m in body.messages]
    available = body.availableModels
    keys = body.keys

    if not available:
        yield send({"t": "err", "msg": "No AI models available. Please contact admin."})
        return

    # ── Model selection ────────────────────────────────────────────────────────
    last_msg = next((m["content"] for m in reversed(msgs) if m["role"] == "user"), "")

    model_id = await route_to_model(last_msg, available, keys.get("google"), body.budgetMode)

    # Image → force best vision-capable Google model
    if body.imageBase64:
        vision_google = next(
            (m for m in ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-2.5-flash"]
             if m in available and supports_vision(m)),
            None,
        )
        if vision_google:
            model_id = vision_google
        else:
            yield send({"t": "err", "msg": "Please configure Gemini API key to enable image uploads."})
            return

    # ── Coin pre-check ────────────────────────────────────────────────────────
    coins_needed = estimate_coins(msgs, model_id)
    if body.currentCoins < coins_needed:
        by_rate = sorted(available, key=lambda m: coins_for(m))
        affordable = next((m for m in by_rate if body.currentCoins >= estimate_coins(msgs, m)), None)

        if not affordable:
            yield send({
                "t": "err", "msg": "Out of coins! Please top up your wallet 🪙",
                "coinsNeeded": estimate_coins(msgs, by_rate[0]),
                "currentCoins": body.currentCoins,
                "errorCode": "coins_required",
            })
            return

        if not body.acceptLowerQuality:
            yield send({
                "t": "err",
                "errorCode": "quality_warning",
                "preferredModel": model_id,
                "preferredModelCoins": coins_needed,
                "fallbackModel": affordable,
                "fallbackModelCoins": estimate_coins(msgs, affordable),
                "currentCoins": body.currentCoins,
            })
            return

        model_id = affordable

    # Tell client which model was chosen
    yield send({"t": "model", "m": model_id})

    system = _build_system_prompt(body.profile)
    used_model = model_id
    input_tokens = output_tokens = 0

    # ── Primary stream ────────────────────────────────────────────────────────
    async def run_stream(mid: str):
        nonlocal input_tokens, output_tokens, used_model
        used_model = mid
        error_ev = None
        async for ev in stream_model(keys, mid, msgs, system, body.imageBase64, body.mediaType):
            if ev["type"] == "delta":
                yield send({"t": "c", "d": ev["text"]})
            elif ev["type"] == "done":
                # token counts captured via nonlocal — nothing to emit here
                input_tokens  = ev["inputTokens"]
                output_tokens = ev["outputTokens"]
            elif ev["type"] == "error":
                error_ev = ev
                yield send({"t": "err", "msg": ev["msg"]})
        if error_ev:
            raise RuntimeError(error_ev["msg"])

    try:
        async for chunk in run_stream(model_id):
            yield chunk
    except RuntimeError as e:
        err_msg = str(e)
        is_quota = "quota" in err_msg.lower()
        failed_provider = provider_for(model_id)

        fallback = None
        if is_quota:
            fallback = next(
                (m for m in available if provider_for(m) != failed_provider and coins_for(m) <= 2),
                next((m for m in available if provider_for(m) != failed_provider), None),
            )
        if not fallback:
            fallback = next((m for m in available if coins_for(m) == 1 and m != model_id), None)

        if fallback and fallback != model_id:
            log.info(f"[Chat] primary {model_id} failed — trying fallback {fallback}")
            yield send({"t": "model", "m": fallback})
            try:
                async for chunk in run_stream(fallback):
                    yield chunk
            except RuntimeError as fe:
                yield send({"t": "err", "msg": str(fe)})
                return
        else:
            return  # error already sent to client

    # ── Done event ────────────────────────────────────────────────────────────
    total_tokens  = (input_tokens + output_tokens) or 500
    coins_charged = min(calc_coins(total_tokens, used_model), body.currentCoins)

    yield send({
        "t":             "done",
        "inputTokens":   input_tokens,
        "outputTokens":  output_tokens,
        "coins":         coins_charged,
        "model":         used_model,
    })


@app.post("/chat", dependencies=[Depends(require_internal_auth)])
async def chat(body: ChatRequest):
    return StreamingResponse(
        _sse_generator(body),
        media_type="text/event-stream",
        headers={
            "Cache-Control":      "no-cache",
            "Connection":         "keep-alive",
            "X-Accel-Buffering":  "no",
        },
    )


# ─── /profile/extract ─────────────────────────────────────────────────────────

class ProfileExtractRequest(BaseModel):
    conversation: list[Message]
    apiKey:       str

@app.post("/profile/extract", dependencies=[Depends(require_internal_auth)])
async def profile_extract(body: ProfileExtractRequest):
    msgs = [{"role": m.role, "content": m.content} for m in body.conversation]
    result = await extract_profile(msgs, body.apiKey)
    return result


# ─── /chat/complete — non-streaming, returns full reply as JSON ───────────────
# Used by WhatsApp bot webhook (can't stream to WA)

@app.post("/chat/complete", dependencies=[Depends(require_internal_auth)])
async def chat_complete(body: ChatRequest):
    msgs = [{"role": m.role, "content": m.content} for m in body.messages]
    available = body.availableModels

    if not available:
        raise HTTPException(status_code=503, detail="No models available")

    last_msg = next((m["content"] for m in reversed(msgs) if m["role"] == "user"), "")
    model_id = await route_to_model(last_msg, available, body.keys.get("google"), body.budgetMode)

    # Coin pre-check
    coins_needed = estimate_coins(msgs, model_id)
    if body.currentCoins < coins_needed:
        by_rate = sorted(available, key=lambda m: coins_for(m))
        affordable = next((m for m in by_rate if body.currentCoins >= estimate_coins(msgs, m)), None)
        if not affordable:
            raise HTTPException(status_code=402, detail="Insufficient coins")
        model_id = affordable

    system = _build_system_prompt(body.profile)
    acc_text = ""
    full_text = None
    input_tokens = output_tokens = 0

    async for ev in stream_model(body.keys, model_id, msgs, system):
        if ev["type"] == "delta":
            acc_text += ev["text"]
        elif ev["type"] == "done":
            input_tokens  = ev["inputTokens"]
            output_tokens = ev["outputTokens"]
            full_text     = ev.get("full")
        elif ev["type"] == "error":
            raise HTTPException(status_code=502, detail=ev["msg"])

    total_tokens  = (input_tokens + output_tokens) or 500
    coins_charged = min(calc_coins(total_tokens, model_id), body.currentCoins)

    return {
        "reply":        full_text or acc_text,
        "model":        model_id,
        "coins":        coins_charged,
        "inputTokens":  input_tokens,
        "outputTokens": output_tokens,
    }


# ─── /report/format ───────────────────────────────────────────────────────────

class ReportUser(BaseModel):
    userId:         str
    name:           str | None = None
    phone:          str
    studyMins:      int = 0
    tasksCompleted: int = 0
    totalTasks:     int = 0
    streak:         int = 0
    coins:          int = 0
    coinsToday:     int = 0

class ReportFormatRequest(BaseModel):
    users:    list[ReportUser]
    template: str | None = None

@app.post("/report/format", dependencies=[Depends(require_internal_auth)])
async def report_format(body: ReportFormatRequest):
    user_dicts = [u.model_dump() for u in body.users]
    messages   = format_all_reports(user_dicts, body.template)
    return {"messages": messages, "total": len(messages)}


# ─── /youtube/info ───────────────────────────────────────────────────────────
# Replaces Node.js yt-dlp subprocess — same data, no shell spawning

class YoutubeInfoRequest(BaseModel):
    videoId: str
    cookies: str | None = None

@app.post("/youtube/info", dependencies=[Depends(require_internal_auth)])
async def youtube_info(body: YoutubeInfoRequest):
    if not re.match(r"^[a-zA-Z0-9_-]{8,15}$", body.videoId):
        raise HTTPException(status_code=400, detail="Invalid videoId")
    try:
        info = await get_stream_info(body.videoId, body.cookies)
        return info
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)[:200])
    except Exception as e:
        log.error(f"[youtube/info] {e}")
        raise HTTPException(status_code=500, detail="Extraction failed")


# ─── /classify/intent ────────────────────────────────────────────────────────
# WhatsApp bot message intent classifier — routes to correct handler

class IntentRequest(BaseModel):
    message: str
    apiKey:  str | None = None

@app.post("/classify/intent", dependencies=[Depends(require_internal_auth)])
async def classify_intent_endpoint(body: IntentRequest):
    intent = await classify_wa_intent(body.message, body.apiKey)
    return {"intent": intent}


# ─── /analytics/insights ─────────────────────────────────────────────────────
# AI-powered personalized study insights for dashboard charts

class InsightsRequest(BaseModel):
    studyHours:  float = 0
    prevHours:   float = 0
    tasksDone:   int   = 0
    tasksTotal:  int   = 0
    streak:      int   = 0
    bestDay:     str   = ""
    targetExam:  str   = ""
    apiKey:      str   = ""

@app.post("/analytics/insights", dependencies=[Depends(require_internal_auth)])
async def analytics_insights(body: InsightsRequest):
    insights = await generate_insights(
        body.studyHours, body.prevHours, body.tasksDone, body.tasksTotal,
        body.streak, body.bestDay, body.targetExam, body.apiKey,
    )
    return {"insights": insights}


# ─── /analytics/readiness ────────────────────────────────────────────────────
# Exam readiness score — Gemini analyses study data, returns 0-100 score

class ReadinessRequest(BaseModel):
    targetExam:    str        = ""
    targetYear:    str        = ""
    daysUntilExam: int        = 0
    studyHours30d: float      = 0
    streak:        int        = 0
    taskRate:      float      = 0
    chatTopics:    list[str]  = Field(default_factory=list)
    aiSessions:    int        = 0
    apiKey:        str        = ""

@app.post("/analytics/readiness", dependencies=[Depends(require_internal_auth)])
async def analytics_readiness(body: ReadinessRequest):
    result = await compute_readiness_score(
        body.targetExam, body.targetYear, body.daysUntilExam,
        body.studyHours30d, body.streak, body.taskRate,
        body.chatTopics, body.aiSessions, body.apiKey,
    )
    return result


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False, workers=2)

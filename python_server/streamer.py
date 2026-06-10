"""
SSE streaming generators for each AI provider.
Each generator yields dicts: {"type": "delta"|"done"|"error", ...}
"""

import json
import asyncio
import logging
import httpx
from models import api_id_for, provider_for
from config import GEMINI_BASE, STREAM_TIMEOUT

log = logging.getLogger(__name__)


def _strip_markdown(text: str) -> str:
    """Remove all markdown formatting server-side."""
    import re
    text = re.sub(r'\*\*\*([^*]+)\*\*\*', r'\1', text)
    text = re.sub(r'\*\*([^*]+)\*\*',     r'\1', text)
    text = re.sub(r'__([^_]+)__',         r'\1', text)
    text = re.sub(r'(?<!\w)\*([^*\n]+)\*(?!\w)', r'\1', text)
    text = re.sub(r'(?<!\w)_([^_\n]+)_(?!\w)',   r'\1', text)
    text = re.sub(r'^#{1,6}\s+(.+)$',     r'\1', text, flags=re.MULTILINE)
    text = re.sub(r'^[-*_]{3,}\s*$',      '',    text, flags=re.MULTILINE)
    text = re.sub(r'^>\s*',               '',    text, flags=re.MULTILINE)
    text = re.sub(r'`([^`]+)`',           r'\1', text)
    text = re.sub(r'```[^\n]*\n([\s\S]*?)```', r'\1', text)
    text = re.sub(r'\n{3,}',              '\n\n', text)
    return text.strip()


def _build_gemini_contents(messages: list[dict], image_b64: str | None = None, media_type: str | None = None):
    contents = []
    for i, m in enumerate(messages):
        role = "model" if m["role"] == "assistant" else "user"
        if image_b64 and i == len(messages) - 1 and m["role"] == "user":
            contents.append({"role": role, "parts": [
                {"inlineData": {"mimeType": media_type or "image/jpeg", "data": image_b64}},
                {"text": m["content"] or "Please solve this question and share any shortcuts"},
            ]})
        else:
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
    return contents


async def stream_google(
    api_key: str,
    model_id: str,
    messages: list[dict],
    system: str,
    image_b64: str | None = None,
    media_type: str | None = None,
):
    api_model = api_id_for(model_id)
    url = f"{GEMINI_BASE}/{api_model}:streamGenerateContent?alt=sse&key={api_key}"

    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": _build_gemini_contents(messages, image_b64, media_type),
        "generationConfig": {"maxOutputTokens": 8192, "temperature": 0.7},
    }

    input_tokens = 0
    output_tokens = 0
    acc_text = ""

    try:
        async with httpx.AsyncClient(timeout=STREAM_TIMEOUT) as client:
            async with client.stream("POST", url, json=body) as resp:
                if resp.status_code == 429:
                    yield {"type": "error", "msg": "AI quota limit reached. Please try again later."}
                    return
                if resp.status_code in (401, 403):
                    yield {"type": "error", "msg": "Gemini API auth failed. Check the API key."}
                    return
                if resp.status_code == 404:
                    yield {"type": "error", "msg": f"Gemini model '{api_model}' not found."}
                    return
                if not resp.is_success:
                    body_text = await resp.aread()
                    yield {"type": "error", "msg": f"Gemini API error ({resp.status_code})"}
                    return

                buffer = ""
                async for raw_chunk in resp.aiter_text():
                    buffer += raw_chunk
                    lines = buffer.split("\n")
                    buffer = lines[-1]
                    for line in lines[:-1]:
                        if not line.startswith("data: "):
                            continue
                        json_str = line[6:].strip()
                        if not json_str:
                            continue
                        try:
                            chunk = json.loads(json_str)
                            parts = (
                                chunk.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [])
                            )
                            text = "".join(p["text"] for p in parts if "text" in p)
                            if text:
                                acc_text += text
                                yield {"type": "delta", "text": text}
                            usage = chunk.get("usageMetadata", {})
                            if usage:
                                input_tokens  = usage.get("promptTokenCount",     input_tokens)
                                output_tokens = usage.get("candidatesTokenCount", output_tokens)
                        except (json.JSONDecodeError, KeyError):
                            pass

    except httpx.TimeoutException:
        yield {"type": "error", "msg": "AI response timed out. Please try again."}
        return
    except Exception as e:
        log.exception(f"[Gemini stream] {model_id}: {e}")
        yield {"type": "error", "msg": "AI service error. Please try again."}
        return

    yield {
        "type": "done",
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "full": _strip_markdown(acc_text),
    }


async def stream_anthropic(
    api_key: str,
    model_id: str,
    messages: list[dict],
    system: str,
):
    api_model = api_id_for(model_id)
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": api_model,
        "max_tokens": 8192,
        "system": system,
        "stream": True,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
    }

    input_tokens = 0
    output_tokens = 0
    acc_text = ""
    event_type = ""

    try:
        async with httpx.AsyncClient(timeout=STREAM_TIMEOUT) as client:
            async with client.stream("POST", "https://api.anthropic.com/v1/messages",
                                     headers=headers, json=body) as resp:
                if resp.status_code == 429:
                    yield {"type": "error", "msg": "AI quota limit reached. Please try again later."}
                    return
                if not resp.is_success:
                    yield {"type": "error", "msg": "AI service unavailable. Please try again later."}
                    return

                buffer = ""
                async for raw_chunk in resp.aiter_text():
                    buffer += raw_chunk
                    lines = buffer.split("\n")
                    buffer = lines[-1]
                    for line in lines[:-1]:
                        if line.startswith("event: "):
                            event_type = line[7:].strip()
                        elif line.startswith("data: "):
                            json_str = line[6:].strip()
                            if not json_str:
                                continue
                            try:
                                chunk = json.loads(json_str)
                                if event_type == "content_block_delta":
                                    text = chunk.get("delta", {}).get("text", "")
                                    if text:
                                        acc_text += text
                                        yield {"type": "delta", "text": text}
                                elif event_type == "message_start":
                                    usage = chunk.get("message", {}).get("usage", {})
                                    input_tokens = usage.get("input_tokens", input_tokens)
                                elif event_type == "message_delta":
                                    usage = chunk.get("usage", {})
                                    output_tokens = usage.get("output_tokens", output_tokens)
                            except (json.JSONDecodeError, KeyError):
                                pass

    except httpx.TimeoutException:
        yield {"type": "error", "msg": "AI response timed out. Please try again."}
        return
    except Exception as e:
        log.exception(f"[Anthropic stream] {model_id}: {e}")
        yield {"type": "error", "msg": "AI service error. Please try again."}
        return

    yield {
        "type": "done",
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "full": _strip_markdown(acc_text),
    }


async def stream_openai(
    api_key: str,
    model_id: str,
    messages: list[dict],
    system: str,
):
    api_model = api_id_for(model_id)
    is_o1 = "o1" in model_id
    sys_role = "developer" if is_o1 else "system"

    body = {
        "model": api_model,
        "max_completion_tokens": 8192,
        "stream": True,
        "stream_options": {"include_usage": True},
        "messages": [
            {"role": sys_role, "content": system},
            *[{"role": m["role"], "content": m["content"]} for m in messages],
        ],
    }

    input_tokens = 0
    output_tokens = 0
    acc_text = ""

    try:
        async with httpx.AsyncClient(timeout=STREAM_TIMEOUT) as client:
            async with client.stream(
                "POST", "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=body,
            ) as resp:
                if resp.status_code == 429:
                    yield {"type": "error", "msg": "AI quota limit reached. Please try again later."}
                    return
                if not resp.is_success:
                    yield {"type": "error", "msg": "AI service unavailable. Please try again later."}
                    return

                buffer = ""
                async for raw_chunk in resp.aiter_text():
                    buffer += raw_chunk
                    lines = buffer.split("\n")
                    buffer = lines[-1]
                    for line in lines[:-1]:
                        if not line.startswith("data: "):
                            continue
                        json_str = line[6:].strip()
                        if json_str == "[DONE]" or not json_str:
                            continue
                        try:
                            chunk = json.loads(json_str)
                            text = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                            if text:
                                acc_text += text
                                yield {"type": "delta", "text": text}
                            usage = chunk.get("usage")
                            if usage:
                                input_tokens  = usage.get("prompt_tokens",     input_tokens)
                                output_tokens = usage.get("completion_tokens", output_tokens)
                        except (json.JSONDecodeError, KeyError, IndexError):
                            pass

    except httpx.TimeoutException:
        yield {"type": "error", "msg": "AI response timed out. Please try again."}
        return
    except Exception as e:
        log.exception(f"[OpenAI stream] {model_id}: {e}")
        yield {"type": "error", "msg": "AI service error. Please try again."}
        return

    yield {
        "type": "done",
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "full": _strip_markdown(acc_text),
    }


async def stream_model(
    keys: dict,
    model_id: str,
    messages: list[dict],
    system: str,
    image_b64: str | None = None,
    media_type: str | None = None,
):
    """Dispatch to the correct provider's streaming generator."""
    p = provider_for(model_id)
    if p == "google":
        async for ev in stream_google(keys["google"], model_id, messages, system, image_b64, media_type):
            yield ev
    elif p == "anthropic":
        async for ev in stream_anthropic(keys["anthropic"], model_id, messages, system):
            yield ev
    else:
        async for ev in stream_openai(keys["openai"], model_id, messages, system):
            yield ev

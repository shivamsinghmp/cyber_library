"""
Model registry — single source of truth for all supported AI models.
Add/remove models here; everything else adapts automatically.
"""

from typing import Literal

Provider = Literal["google", "anthropic", "openai"]
BudgetMode = Literal["strict", "balanced", "quality"]

# ─── Registry ─────────────────────────────────────────────────────────────────
# coins_per_1000t: 1 coin = ₹0.50 — all rates guarantee 650%+ profit margin
REGISTRY: dict[str, dict] = {
    # ── Google Gemini ──
    "gemini-2.5-flash": {
        "provider": "google",
        "api_id":   "gemini-2.5-flash",
        "coins":    1,      # API ₹0.014/1000t → charge ₹0.50 → 3471% profit
        "vision":   True,
    },
    "gemini-2.5-flash-lite": {
        "provider": "google",
        "api_id":   "gemini-2.5-flash-lite-preview-06-17",
        "coins":    1,      # Cheapest Gemini — ultra-fast, simple queries
        "vision":   False,
    },
    "gemini-2.5-pro": {
        "provider": "google",
        "api_id":   "gemini-2.5-pro",
        "coins":    6,      # API ₹0.40/1000t → charge ₹3.00 → 650% profit
        "vision":   True,
    },
    "gemini-1.5-pro": {
        "provider": "google",
        "api_id":   "gemini-1.5-pro",
        "coins":    4,      # API ₹0.23/1000t → charge ₹2.00 → 769% profit
        "vision":   True,
    },
    # ── Anthropic Claude ──
    "claude-haiku": {
        "provider": "anthropic",
        "api_id":   "claude-haiku-4-5-20251001",
        "coins":    3,
        "vision":   False,
    },
    "claude-sonnet": {
        "provider": "anthropic",
        "api_id":   "claude-sonnet-4-6",
        "coins":    10,
        "vision":   False,
    },
    "claude-opus": {
        "provider": "anthropic",
        "api_id":   "claude-opus-4-7",
        "coins":    50,
        "vision":   False,
    },
    # ── OpenAI ──
    "gpt-4o-mini": {
        "provider": "openai",
        "api_id":   "gpt-4o-mini",
        "coins":    1,
        "vision":   True,
    },
    "gpt-4.1-mini": {
        "provider": "openai",
        "api_id":   "gpt-4.1-mini",
        "coins":    2,
        "vision":   False,
    },
    "gpt-4.1": {
        "provider": "openai",
        "api_id":   "gpt-4.1",
        "coins":    6,
        "vision":   False,
    },
    "gpt-4o": {
        "provider": "openai",
        "api_id":   "gpt-4o",
        "coins":    7,
        "vision":   True,
    },
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_available(keys: dict) -> list[str]:
    """Return list of model IDs available given configured API keys."""
    out = []
    for mid, meta in REGISTRY.items():
        p = meta["provider"]
        if p == "google"    and keys.get("google"):    out.append(mid)
        if p == "anthropic" and keys.get("anthropic"): out.append(mid)
        if p == "openai"    and keys.get("openai"):    out.append(mid)
    return out

def coins_for(model_id: str) -> int:
    return REGISTRY[model_id]["coins"]

def provider_for(model_id: str) -> Provider:
    return REGISTRY[model_id]["provider"]

def api_id_for(model_id: str) -> str:
    return REGISTRY[model_id]["api_id"]

def supports_vision(model_id: str) -> bool:
    return REGISTRY[model_id].get("vision", False)

def pricing_map(available: list[str]) -> dict[str, int]:
    return {m: coins_for(m) for m in available}

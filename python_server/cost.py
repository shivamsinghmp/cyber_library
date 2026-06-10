"""Coin calculation — ceil(tokens / 1000) × rate_per_1000t."""

import math
from models import coins_for


def calc_coins(total_tokens: int, model_id: str) -> int:
    """Actual coin cost from real API-reported token count."""
    return math.ceil(total_tokens / 1000) * coins_for(model_id)


def estimate_coins(messages: list[dict], model_id: str) -> int:
    """Pre-call estimate — used only for the affordability pre-check.
    Assumes 2048 output tokens; actual deduction uses real API count.
    """
    chars = sum(len(m.get("content", "")) for m in messages)
    est_input  = math.ceil(chars / 4) + 500   # +500 for system-prompt overhead
    est_output = 2048
    return math.ceil((est_input + est_output) / 1000) * coins_for(model_id)

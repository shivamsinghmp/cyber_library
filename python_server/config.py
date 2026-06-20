import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Internal secret — Next.js uses this to authenticate calls to Python server
INTERNAL_SECRET = os.getenv("PYTHON_SERVER_SECRET", "change-me-in-production")

# Cloud Run sets K_SERVICE — never allow the default secret on a public deployment
if os.getenv("K_SERVICE") and INTERNAL_SECRET == "change-me-in-production":
    raise RuntimeError(
        "PYTHON_SERVER_SECRET must be set to a strong value in production. "
        "Add it to PYTHON_ENV_YAML in your GitHub secrets."
    )

# Cloud Run injects PORT; fallback to PYTHON_SERVER_PORT for local dev
PORT = int(os.getenv("PORT", os.getenv("PYTHON_SERVER_PORT", "8001")))

# Request timeouts (seconds)
CLASSIFIER_TIMEOUT = 4      # model routing classifier
STREAM_TIMEOUT     = 58     # main AI stream (slightly under Vercel 60s limit)
EXTRACT_TIMEOUT    = 8      # profile extraction

# Gemini base URL
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# ── WhatsApp bot (full lifecycle: webhook, registration, wallet, payments) ────
DATABASE_URL          = os.getenv("DATABASE_URL", "")
ENCRYPTION_KEY        = os.getenv("ENCRYPTION_KEY", "")

# Legacy single-number fallback (used if a line-specific pair isn't set below)
_LEGACY_ACCESS_TOKEN    = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
_LEGACY_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")

# Three named WhatsApp lines, one Meta App (shared app secret + verify token),
# each with its own number/token. REPORTS isn't needed here — those sends
# stay in Next.js.
WHATSAPP_AI_CHAT_ACCESS_TOKEN    = os.getenv("WHATSAPP_AI_CHAT_ACCESS_TOKEN", "") or _LEGACY_ACCESS_TOKEN
WHATSAPP_AI_CHAT_PHONE_NUMBER_ID = os.getenv("WHATSAPP_AI_CHAT_PHONE_NUMBER_ID", "") or _LEGACY_PHONE_NUMBER_ID
WHATSAPP_AUTH_ACCESS_TOKEN       = os.getenv("WHATSAPP_AUTH_ACCESS_TOKEN", "") or _LEGACY_ACCESS_TOKEN
WHATSAPP_AUTH_PHONE_NUMBER_ID    = os.getenv("WHATSAPP_AUTH_PHONE_NUMBER_ID", "") or _LEGACY_PHONE_NUMBER_ID

WHATSAPP_APP_SECRET       = os.getenv("WHATSAPP_APP_SECRET", "")
WHATSAPP_VERIFY_TOKEN     = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
RAZORPAY_KEY_ID           = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET       = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET   = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
PYTHON_SERVER_PUBLIC_URL  = os.getenv("PYTHON_SERVER_PUBLIC_URL", "http://localhost:8001")

# Cloud Run deploy must not run with any of these unset — a missing secret here means
# webhook signature checks or token encryption would silently no-op instead of rejecting.
if os.getenv("K_SERVICE"):
    _required_prod_secrets = {
        "ENCRYPTION_KEY": ENCRYPTION_KEY,
        "WHATSAPP_APP_SECRET": WHATSAPP_APP_SECRET,
        "WHATSAPP_VERIFY_TOKEN": WHATSAPP_VERIFY_TOKEN,
        "RAZORPAY_KEY_SECRET": RAZORPAY_KEY_SECRET,
        "RAZORPAY_WEBHOOK_SECRET": RAZORPAY_WEBHOOK_SECRET,
    }
    _missing = [name for name, value in _required_prod_secrets.items() if not value]
    if _missing:
        raise RuntimeError(
            f"Missing required prod secrets: {', '.join(_missing)}. "
            "Add them to PYTHON_ENV_YAML in your GitHub secrets."
        )

# Coin economy (mirrors src/lib/order-fulfillment.ts custom-pack formula)
COINS_PER_RUPEE = 2

# Bot conversation tuning
LOW_BALANCE_WARNING_THRESHOLD = 5      # nudge to top up once balance drops to/below this
PAYMENT_WAIT_TIMEOUT_MINUTES   = 30    # AWAITING_PAYMENT auto-expires after this long

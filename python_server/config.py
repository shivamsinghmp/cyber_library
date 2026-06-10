import os
from dotenv import load_dotenv

load_dotenv()

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

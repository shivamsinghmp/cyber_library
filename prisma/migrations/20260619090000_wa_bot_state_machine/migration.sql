-- Migration: wa_bot_state_machine
-- Adds the WhatsApp bot's conversation state machine fields to Profile.
-- whatsappBotState drives registration / wallet-topup / payment-wait flow.
-- whatsappBotPending holds transient bot-internal payload (pending message,
-- razorpay transaction id, sent-at) — distinct from the admin-facing customFields.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "whatsappBotState" TEXT NOT NULL DEFAULT 'IDLE';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "whatsappBotPending" JSONB;

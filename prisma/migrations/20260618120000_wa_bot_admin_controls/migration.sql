-- Migration: wa_bot_admin_controls
-- Adds whatsappBotBlocked to Profile — admin per-user switch that blocks only
-- the interactive WhatsApp AI bot (orthogonal to whatsappMarketing opt-out).

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "whatsappBotBlocked" BOOLEAN NOT NULL DEFAULT false;

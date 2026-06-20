-- Migration: whatsapp_message_line
-- Tags each WhatsAppMessage with which of the 3 business WhatsApp numbers
-- (AI_CHAT / AUTH / REPORTS) it belongs to, so the admin UI and the
-- multi-number routing logic know which line a conversation is on.

ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "line" TEXT;

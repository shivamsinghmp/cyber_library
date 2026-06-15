-- Migration: influencer_tracking_improvements
-- Adds transactionId (unique) to InfluencerEarning for idempotency

ALTER TABLE "InfluencerEarning" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerEarning_transactionId_key" ON "InfluencerEarning"("transactionId") WHERE "transactionId" IS NOT NULL;

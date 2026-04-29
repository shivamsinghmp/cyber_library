-- Add durationSeconds to MeetPresenceSession for slot-wise time tracking
ALTER TABLE "MeetPresenceSession"
  ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER;

-- Index for slot-wise queries (userId + endedAt)
CREATE INDEX IF NOT EXISTS "MeetPresenceSession_userId_endedAt_idx"
  ON "MeetPresenceSession"("userId", "endedAt");

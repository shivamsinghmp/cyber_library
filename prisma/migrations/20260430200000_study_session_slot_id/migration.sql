-- Add studySlotId to StudySession for automatic slot tracking via Google Meet ID
ALTER TABLE "StudySession"
  ADD COLUMN IF NOT EXISTS "studySlotId" TEXT;

-- Foreign key constraint
ALTER TABLE "StudySession"
  ADD CONSTRAINT "StudySession_studySlotId_fkey"
  FOREIGN KEY ("studySlotId") REFERENCES "StudySlot"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for slot-wise queries
CREATE INDEX IF NOT EXISTS "StudySession_studySlotId_idx" ON "StudySession"("studySlotId");

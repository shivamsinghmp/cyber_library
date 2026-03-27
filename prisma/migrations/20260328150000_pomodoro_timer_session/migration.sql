CREATE TABLE IF NOT EXISTS "PomodoroTimerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "plannedSeconds" INTEGER NOT NULL,
    "completedSeconds" INTEGER NOT NULL,
    "completedFully" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PomodoroTimerSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PomodoroTimerSession_userId_startedAt_idx" ON "PomodoroTimerSession"("userId", "startedAt");
CREATE INDEX IF NOT EXISTS "PomodoroTimerSession_roomId_idx" ON "PomodoroTimerSession"("roomId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PomodoroTimerSession_userId_fkey') THEN
    ALTER TABLE "PomodoroTimerSession" ADD CONSTRAINT "PomodoroTimerSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PomodoroTimerSession_roomId_fkey') THEN
    ALTER TABLE "PomodoroTimerSession" ADD CONSTRAINT "PomodoroTimerSession_roomId_fkey"
      FOREIGN KEY ("roomId") REFERENCES "MeetRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

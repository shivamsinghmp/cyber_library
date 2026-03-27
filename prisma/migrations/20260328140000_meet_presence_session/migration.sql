-- Meet add-on: track time the student has the side panel open (heartbeats).
CREATE TABLE IF NOT EXISTS "MeetPresenceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetPresenceSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MeetPresenceSession_userId_startedAt_idx" ON "MeetPresenceSession"("userId", "startedAt");
CREATE INDEX IF NOT EXISTS "MeetPresenceSession_roomId_idx" ON "MeetPresenceSession"("roomId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MeetPresenceSession_userId_fkey'
  ) THEN
    ALTER TABLE "MeetPresenceSession" ADD CONSTRAINT "MeetPresenceSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MeetPresenceSession_roomId_fkey'
  ) THEN
    ALTER TABLE "MeetPresenceSession" ADD CONSTRAINT "MeetPresenceSession_roomId_fkey"
      FOREIGN KEY ("roomId") REFERENCES "MeetRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add smtpHost and smtpPort to EmailAccount (default port 2525, host smtp.gmail.com)
ALTER TABLE "EmailAccount" 
  ADD COLUMN IF NOT EXISTS "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
  ADD COLUMN IF NOT EXISTS "smtpPort" INTEGER NOT NULL DEFAULT 2525;

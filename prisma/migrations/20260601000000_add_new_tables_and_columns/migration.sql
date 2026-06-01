-- New tables and columns added in the batch-push (June 2026)
-- All statements are guarded with IF NOT EXISTS — safe to re-run.

-- ─── New User columns ────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralRewarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperAdmin"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialUsed"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt"        TIMESTAMP(3);

-- referralCode unique index
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_referralCode_key') THEN
    CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
  END IF;
END $$;

-- self-referential referrals FK
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'User_referredById_fkey'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey"
      FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── AdminStudentAccessLog ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminStudentAccessLog" (
    "id"              TEXT        NOT NULL,
    "adminId"         TEXT        NOT NULL,
    "adminName"       VARCHAR(100) NOT NULL,
    "adminIp"         INET,
    "studentId"       TEXT        NOT NULL,
    "studentUniqueId" VARCHAR(20),
    "studentName"     VARCHAR(100),
    "pageAccessed"    VARCHAR(200) NOT NULL,
    "action"          VARCHAR(50)  NOT NULL DEFAULT 'view',
    "sessionToken"    VARCHAR(200),
    "accessedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt"         TIMESTAMP(3),

    CONSTRAINT "AdminStudentAccessLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminStudentAccessLog_adminId_idx') THEN
    CREATE INDEX "AdminStudentAccessLog_adminId_idx" ON "AdminStudentAccessLog"("adminId");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminStudentAccessLog_studentId_idx') THEN
    CREATE INDEX "AdminStudentAccessLog_studentId_idx" ON "AdminStudentAccessLog"("studentId");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminStudentAccessLog_accessedAt_idx') THEN
    CREATE INDEX "AdminStudentAccessLog_accessedAt_idx" ON "AdminStudentAccessLog"("accessedAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminStudentAccessLog_adminId_accessedAt_idx') THEN
    CREATE INDEX "AdminStudentAccessLog_adminId_accessedAt_idx" ON "AdminStudentAccessLog"("adminId", "accessedAt");
  END IF;
END $$;

-- ─── AdminAuditLog ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "action"    TEXT         NOT NULL,
    "module"    TEXT         NOT NULL,
    "details"   TEXT         NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'AdminAuditLog_userId_fkey'
  ) THEN
    ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminAuditLog_userId_idx') THEN
    CREATE INDEX "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminAuditLog_createdAt_idx') THEN
    CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
  END IF;
END $$;

-- ─── StudentEvent ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "StudentEvent" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "event"     TEXT         NOT NULL,
    "page"      TEXT,
    "meta"      JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentEvent_userId_fkey'
  ) THEN
    ALTER TABLE "StudentEvent" ADD CONSTRAINT "StudentEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StudentEvent_userId_createdAt_idx') THEN
    CREATE INDEX "StudentEvent_userId_createdAt_idx" ON "StudentEvent"("userId", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StudentEvent_event_createdAt_idx') THEN
    CREATE INDEX "StudentEvent_event_createdAt_idx" ON "StudentEvent"("event", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StudentEvent_userId_event_idx') THEN
    CREATE INDEX "StudentEvent_userId_event_idx" ON "StudentEvent"("userId", "event");
  END IF;
END $$;

-- ─── TrialLog ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TrialLog" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "event"      TEXT         NOT NULL,
    "detail"     TEXT,
    "ipAddress"  TEXT,
    "userAgent"  TEXT,
    "planBought" TEXT,
    "daysUsed"   INTEGER,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'TrialLog_userId_fkey'
  ) THEN
    ALTER TABLE "TrialLog" ADD CONSTRAINT "TrialLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TrialLog_userId_createdAt_idx') THEN
    CREATE INDEX "TrialLog_userId_createdAt_idx" ON "TrialLog"("userId", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TrialLog_event_createdAt_idx') THEN
    CREATE INDEX "TrialLog_event_createdAt_idx" ON "TrialLog"("event", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TrialLog_createdAt_idx') THEN
    CREATE INDEX "TrialLog_createdAt_idx" ON "TrialLog"("createdAt");
  END IF;
END $$;

-- ─── WhatsAppTemplate ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WhatsAppTemplate" (
    "id"             TEXT         NOT NULL,
    "metaId"         TEXT,
    "name"           TEXT         NOT NULL,
    "status"         TEXT         NOT NULL DEFAULT 'PENDING',
    "category"       TEXT,
    "language"       TEXT         NOT NULL DEFAULT 'en',
    "bodyText"       TEXT         NOT NULL,
    "headerText"     TEXT,
    "footerText"     TEXT,
    "variableCount"  INTEGER      NOT NULL DEFAULT 0,
    "variableLabels" JSONB,
    "buttons"        JSONB,
    "triggerEvent"   TEXT,
    "isActive"       BOOLEAN      NOT NULL DEFAULT false,
    "syncedAt"       TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppTemplate_metaId_key') THEN
    CREATE UNIQUE INDEX "WhatsAppTemplate_metaId_key" ON "WhatsAppTemplate"("metaId");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppTemplate_name_key') THEN
    CREATE UNIQUE INDEX "WhatsAppTemplate_name_key" ON "WhatsAppTemplate"("name");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppTemplate_triggerEvent_idx') THEN
    CREATE INDEX "WhatsAppTemplate_triggerEvent_idx" ON "WhatsAppTemplate"("triggerEvent");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppTemplate_status_idx') THEN
    CREATE INDEX "WhatsAppTemplate_status_idx" ON "WhatsAppTemplate"("status");
  END IF;
END $$;

-- ─── AIUsageLog ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AIUsageLog" (
    "id"           TEXT         NOT NULL,
    "logId"        TEXT         NOT NULL,
    "userId"       TEXT,
    "feature"      TEXT         NOT NULL,
    "provider"     TEXT         NOT NULL,
    "model"        TEXT         NOT NULL,
    "inputTokens"  INTEGER      NOT NULL DEFAULT 0,
    "outputTokens" INTEGER      NOT NULL DEFAULT 0,
    "totalTokens"  INTEGER      NOT NULL DEFAULT 0,
    "costUsd"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costInr"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coinsCharged" INTEGER      NOT NULL DEFAULT 0,
    "latencyMs"    INTEGER      NOT NULL DEFAULT 0,
    "status"       TEXT         NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AIUsageLog_logId_key') THEN
    CREATE UNIQUE INDEX "AIUsageLog_logId_key" ON "AIUsageLog"("logId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'AIUsageLog_userId_fkey'
  ) THEN
    ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AIUsageLog_userId_createdAt_idx') THEN
    CREATE INDEX "AIUsageLog_userId_createdAt_idx" ON "AIUsageLog"("userId", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AIUsageLog_provider_createdAt_idx') THEN
    CREATE INDEX "AIUsageLog_provider_createdAt_idx" ON "AIUsageLog"("provider", "createdAt");
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AIUsageLog_feature_createdAt_idx') THEN
    CREATE INDEX "AIUsageLog_feature_createdAt_idx" ON "AIUsageLog"("feature", "createdAt");
  END IF;
END $$;

-- ─── StudyCoinLog new columns ─────────────────────────────────────────────────
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "txnId"          TEXT;
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "balanceBefore"  INTEGER;
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "balanceAfter"   INTEGER;
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "sourceCategory" VARCHAR(50);
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "sourceLabel"    VARCHAR(200);
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "referenceType"  VARCHAR(50);
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "referenceId"    VARCHAR(100);
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "referenceName"  VARCHAR(200);
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "deviceType"     VARCHAR(50) DEFAULT 'web_browser';
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "ipAddress"      INET;
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "adminId"        TEXT;
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "adminName"      VARCHAR(100);
ALTER TABLE "StudyCoinLog" ADD COLUMN IF NOT EXISTS "adminReason"    TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StudyCoinLog_txnId_key') THEN
    CREATE UNIQUE INDEX "StudyCoinLog_txnId_key" ON "StudyCoinLog"("txnId");
  END IF;
END $$;

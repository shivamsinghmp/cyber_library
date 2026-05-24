-- CreateTable: UserSubscription
CREATE TABLE IF NOT EXISTS "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amountPaid" INTEGER NOT NULL,
    "transactionId" TEXT,
    "paymentGatewayId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailSignature
CREATE TABLE IF NOT EXISTS "EmailSignature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StudentModuleAccess
CREATE TABLE IF NOT EXISTS "StudentModuleAccess" (
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudentModuleAccess_pkey" PRIMARY KEY ("userId","moduleId")
);

-- AlterTable: add missing columns (safe — IF NOT EXISTS guards)
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DigitalProduct" ADD COLUMN IF NOT EXISTS "coinPrice" INTEGER;
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "contentIv" TEXT;
ALTER TABLE "WhatsAppMessage" ADD COLUMN IF NOT EXISTS "wamid" TEXT;

-- AlterTable: EmailLog new columns
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "bouncedAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "clickedAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3);
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "resendId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "toName" TEXT;
ALTER TABLE "EmailLog" ALTER COLUMN "status" SET DEFAULT 'SENT';

-- DropTable: EmailAccount (only if it exists)
DROP TABLE IF EXISTS "EmailAccount";

-- CreateIndex (use IF NOT EXISTS to be safe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UserSubscription_userId_status_idx') THEN
    CREATE INDEX "UserSubscription_userId_status_idx" ON "UserSubscription"("userId", "status");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'UserSubscription_userId_endDate_idx') THEN
    CREATE INDEX "UserSubscription_userId_endDate_idx" ON "UserSubscription"("userId", "endDate");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StudentModuleAccess_userId_idx') THEN
    CREATE INDEX "StudentModuleAccess_userId_idx" ON "StudentModuleAccess"("userId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'AdminAuditLog_module_createdAt_idx') THEN
    CREATE INDEX "AdminAuditLog_module_createdAt_idx" ON "AdminAuditLog"("module", "createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'DigitalPurchase_userId_productId_key') THEN
    CREATE UNIQUE INDEX "DigitalPurchase_userId_productId_key" ON "DigitalPurchase"("userId", "productId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EmailLog_resendId_key') THEN
    CREATE UNIQUE INDEX "EmailLog_resendId_key" ON "EmailLog"("resendId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EmailLog_toEmail_idx') THEN
    CREATE INDEX "EmailLog_toEmail_idx" ON "EmailLog"("toEmail");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EmailLog_createdAt_idx') THEN
    CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'EmailLog_status_idx') THEN
    CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'TrafficVisit_path_createdAt_idx') THEN
    CREATE INDEX "TrafficVisit_path_createdAt_idx" ON "TrafficVisit"("path", "createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_userId_idx') THEN
    CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_createdAt_idx') THEN
    CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppMessage_wamid_key') THEN
    CREATE UNIQUE INDEX "WhatsAppMessage_wamid_key" ON "WhatsAppMessage"("wamid");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppMessage_phoneNumber_idx') THEN
    CREATE INDEX "WhatsAppMessage_phoneNumber_idx" ON "WhatsAppMessage"("phoneNumber");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppMessage_wamid_idx') THEN
    CREATE INDEX "WhatsAppMessage_wamid_idx" ON "WhatsAppMessage"("wamid");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WhatsAppOTP_phoneNumber_expiresAt_idx') THEN
    CREATE INDEX "WhatsAppOTP_phoneNumber_expiresAt_idx" ON "WhatsAppOTP"("phoneNumber", "expiresAt");
  END IF;
END $$;

-- AddForeignKey (only if not already present)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentModuleAccess_userId_fkey'
  ) THEN
    ALTER TABLE "StudentModuleAccess" ADD CONSTRAINT "StudentModuleAccess_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

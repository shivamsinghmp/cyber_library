-- Add referredByInfluencer to User
ALTER TABLE "User" ADD COLUMN "referredByInfluencer" TEXT;

-- Add commissionRate to InfluencerProfile
ALTER TABLE "InfluencerProfile" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- Make InfluencerEarning.couponId optional
ALTER TABLE "InfluencerEarning" ALTER COLUMN "couponId" DROP NOT NULL;

-- Create InfluencerLinkClick table
CREATE TABLE "InfluencerLinkClick" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "visitorIp" TEXT,
    "visitorId" TEXT,
    "userId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InfluencerLinkClick_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_referredByInfluencer_fkey"
  FOREIGN KEY ("referredByInfluencer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InfluencerLinkClick" ADD CONSTRAINT "InfluencerLinkClick_influencerId_fkey"
  FOREIGN KEY ("influencerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InfluencerLinkClick" ADD CONSTRAINT "InfluencerLinkClick_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "InfluencerLinkClick_influencerId_idx" ON "InfluencerLinkClick"("influencerId");
CREATE INDEX "InfluencerLinkClick_userId_idx" ON "InfluencerLinkClick"("userId");

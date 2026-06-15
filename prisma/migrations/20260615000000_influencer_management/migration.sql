-- AlterTable: Add influencer fields to Coupon
ALTER TABLE "Coupon" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: Add influencer relations to User (no DB columns needed — relation-only)

-- CreateTable: InfluencerProfile
CREATE TABLE "InfluencerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankAccountName" TEXT,
    "bankAccountNo" TEXT,
    "bankIfsc" TEXT,
    "upiId" TEXT,
    "instagram" TEXT,
    "youtube" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "website" TEXT,
    "niche" TEXT,
    "followerCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InfluencerEarning
CREATE TABLE "InfluencerEarning" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionAmount" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: InfluencerProfile unique userId
CREATE UNIQUE INDEX "InfluencerProfile_userId_key" ON "InfluencerProfile"("userId");

-- CreateIndex: InfluencerEarning indexes
CREATE INDEX "InfluencerEarning_influencerId_idx" ON "InfluencerEarning"("influencerId");
CREATE INDEX "InfluencerEarning_couponId_idx" ON "InfluencerEarning"("couponId");

-- AddForeignKey: Coupon → User (owner)
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: InfluencerProfile → User
ALTER TABLE "InfluencerProfile" ADD CONSTRAINT "InfluencerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InfluencerEarning → User (influencer)
ALTER TABLE "InfluencerEarning" ADD CONSTRAINT "InfluencerEarning_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: InfluencerEarning → Coupon
ALTER TABLE "InfluencerEarning" ADD CONSTRAINT "InfluencerEarning_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

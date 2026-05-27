-- Performance indexes added for 20k-user scale
-- IF NOT EXISTS: safe to run even if indexes were already created directly on DB

-- Session: speeds up 1-device login check (deleteMany + findFirst by userId)
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- BlogPost: speeds up public blog listing (ORDER BY publishedAt DESC)
CREATE INDEX IF NOT EXISTS "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- Transaction: speeds up payment dedup check (findFirst by paymentGatewayId)
CREATE INDEX IF NOT EXISTS "Transaction_paymentGatewayId_idx" ON "Transaction"("paymentGatewayId");

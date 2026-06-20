-- Close a TOCTOU double-credit race: two concurrent /api/razorpay/verify calls for the
-- same payment could both pass the findFirst-by-paymentGatewayId check before either
-- inserted, double-crediting coins/subscriptions. The route already catches Prisma P2002
-- on this column (see src/app/api/razorpay/verify/route.ts), but nothing could ever raise
-- it without a real unique constraint. This activates that existing guard.
DROP INDEX "Transaction_paymentGatewayId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paymentGatewayId_key" ON "Transaction"("paymentGatewayId");

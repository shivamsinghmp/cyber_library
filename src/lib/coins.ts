/**
 * Coin balance helpers — use Profile.coinBalance (materialized) instead of SUM(StudyCoinLog).
 * 
 * All coin mutations MUST go through awardCoins() or deductCoins() to keep
 * Profile.coinBalance in sync with StudyCoinLog (the audit ledger).
 */

import { prisma } from "@/lib/prisma";

/** Award coins — creates ledger entry + atomically increments Profile.coinBalance */
export async function awardCoins(
  userId: string,
  amount: number,
  reason: string,
  roomId?: string
): Promise<void> {
  if (amount === 0) return;
  await prisma.$transaction([
    prisma.studyCoinLog.create({
      data: { userId, coins: amount, reason, roomId: roomId ?? null },
    }),
    prisma.profile.update({
      where: { userId },
      data: { coinBalance: { increment: amount } },
    }),
  ]);
}

/** Deduct coins — returns false if insufficient balance (prevents overdraft).
 *  Uses an interactive transaction so the log entry is only written when the
 *  balance check succeeds. Concurrent requests cannot both pass the guard and
 *  overdraft the wallet — the UPDATE is atomic and conditional.
 */
export async function deductCoins(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  if (amount <= 0) return true;

  return prisma.$transaction(async (tx) => {
    // Atomic: only updates when coinBalance >= amount.
    // Returns count=0 (and skips the log) if the balance is insufficient.
    const updated = await tx.profile.updateMany({
      where: { userId, coinBalance: { gte: amount } },
      data:  { coinBalance: { decrement: amount } },
    });

    if (updated.count === 0) return false;

    await tx.studyCoinLog.create({
      data: { userId, coins: -amount, reason },
    });

    return true;
  });
}

/** Read current balance — O(1) from materialized column */
export async function getCoinBalance(userId: string): Promise<number> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { coinBalance: true },
  });
  return profile?.coinBalance ?? 0;
}

/**
 * One-time migration helper — recalculates coinBalance from StudyCoinLog.
 * Run once after deploying this migration to sync existing data.
 * Call via: POST /api/admin/cache-flush (or a one-off script)
 */
export async function recalculateAllCoinBalances(): Promise<void> {
  const logs = await prisma.studyCoinLog.groupBy({
    by: ["userId"],
    _sum: { coins: true },
  });

  await Promise.all(
    logs.map((row) =>
      prisma.profile.updateMany({
        where: { userId: row.userId },
        data: { coinBalance: row._sum.coins ?? 0 },
      })
    )
  );
}

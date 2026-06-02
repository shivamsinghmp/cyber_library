/**
 * Coin balance helpers — Profile.coinBalance is the materialized source of truth.
 * StudyCoinLog is the immutable audit ledger.
 *
 * All coin mutations MUST go through awardCoins() or deductCoins() to keep
 * Profile.coinBalance in sync and to write a complete audit trail entry.
 */

import { prisma } from "@/lib/prisma";

function generateTxnId(): string {
  return "TXN" + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, "0");
}

/** Optional rich metadata attached to every coin log entry. */
export interface CoinMeta {
  /** Categorical source — used for filtering and pie-chart breakdowns. */
  sourceCategory?: string;
  /** Human-readable description shown in student wallet UI. */
  sourceLabel?: string;
  /** Type of the linked entity: 'payment'|'product'|'course'|'quiz'|'referral'|'admin'|'system' */
  referenceType?: string;
  /** ID of the linked entity (Razorpay PAY-xxx, product CUID, etc.). */
  referenceId?: string;
  /** Human-readable name of the linked entity. */
  referenceName?: string;
  /** Client surface: 'web_browser'|'mobile_app'|'admin_panel'|'system' */
  deviceType?: string;
  /** Request IP — pass req IP for purchases and admin ops; omit for system grants. */
  ipAddress?: string;
  /** Admin display name — denormalised to avoid join on every read. */
  adminName?: string;
  /** Admin-provided justification (shown in admin passbook). */
  adminReason?: string;
}

/**
 * Award coins — creates ledger entry + atomically increments Profile.coinBalance.
 * Captures balanceBefore/balanceAfter snapshot for a full audit trail.
 * Pass adminId + meta.adminName when this is triggered by an admin operation.
 */
// ENV_SUPERADMIN is a synthetic ID (not in DB) — never use as FK reference
const ENV_SUPERADMIN_ID = "ENV_SUPERADMIN";
function safeAdminId(id?: string): string | null {
  if (!id || id === ENV_SUPERADMIN_ID) return null;
  return id;
}

export async function awardCoins(
  userId:  string,
  amount:  number,
  reason:  string,
  roomId?: string,
  adminId?: string,
  meta?: CoinMeta,
): Promise<void> {
  if (amount === 0) return;
  const txnId = generateTxnId();

  await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({
      where:  { userId },
      select: { coinBalance: true },
    });
    const balanceBefore = profile?.coinBalance ?? 0;
    const balanceAfter  = balanceBefore + amount;

    await tx.studyCoinLog.create({
      data: {
        txnId,
        userId,
        coins:  amount,
        reason,
        roomId:        roomId  ?? null,
        adminId:       safeAdminId(adminId),
        balanceBefore,
        balanceAfter,
        // Rich metadata (all optional — null when not provided)
        sourceCategory: meta?.sourceCategory ?? null,
        sourceLabel:    meta?.sourceLabel    ?? null,
        referenceType:  meta?.referenceType  ?? null,
        referenceId:    meta?.referenceId    ?? null,
        referenceName:  meta?.referenceName  ?? null,
        deviceType:     meta?.deviceType     ?? "web_browser",
        ipAddress:      meta?.ipAddress      ?? null,
        adminName:      meta?.adminName      ?? null,
        adminReason:    meta?.adminReason    ?? null,
      },
    });
    await tx.profile.upsert({
      where:  { userId },
      create: { userId, coinBalance: Math.max(0, amount) },
      update: { coinBalance: { increment: amount } },
    });
  });
}

/**
 * Deduct coins — returns false if insufficient balance (prevents overdraft).
 * The UPDATE is atomic and conditional — concurrent requests cannot both pass
 * the guard and overdraft the wallet.
 * Pass adminId + meta.adminName when triggered by an admin operation.
 */
export async function deductCoins(
  userId:  string,
  amount:  number,
  reason:  string,
  adminId?: string,
  meta?: CoinMeta,
): Promise<boolean> {
  if (amount <= 0) return true;
  const txnId = generateTxnId();

  return prisma.$transaction(async (tx) => {
    // Atomic: only updates when coinBalance >= amount.
    const updated = await tx.profile.updateMany({
      where: { userId, coinBalance: { gte: amount } },
      data:  { coinBalance: { decrement: amount } },
    });

    if (updated.count === 0) return false;

    // Read post-deduction balance to compute balanceBefore
    const profile = await tx.profile.findUnique({
      where:  { userId },
      select: { coinBalance: true },
    });
    const balanceAfter  = profile?.coinBalance ?? 0;
    const balanceBefore = balanceAfter + amount;

    await tx.studyCoinLog.create({
      data: {
        txnId,
        userId,
        coins:  -amount,
        reason,
        adminId:       safeAdminId(adminId),
        balanceBefore,
        balanceAfter,
        sourceCategory: meta?.sourceCategory ?? null,
        sourceLabel:    meta?.sourceLabel    ?? null,
        referenceType:  meta?.referenceType  ?? null,
        referenceId:    meta?.referenceId    ?? null,
        referenceName:  meta?.referenceName  ?? null,
        deviceType:     meta?.deviceType     ?? "web_browser",
        ipAddress:      meta?.ipAddress      ?? null,
        adminName:      meta?.adminName      ?? null,
        adminReason:    meta?.adminReason    ?? null,
      },
    });

    return true;
  });
}

/** Read current balance — O(1) from materialized column. */
export async function getCoinBalance(userId: string): Promise<number> {
  const profile = await prisma.profile.findUnique({
    where:  { userId },
    select: { coinBalance: true },
  });
  return profile?.coinBalance ?? 0;
}

/**
 * One-time migration helper — recalculates coinBalance from StudyCoinLog.
 * Run once after deploying this migration to sync existing data.
 */
export async function recalculateAllCoinBalances(): Promise<void> {
  const logs = await prisma.studyCoinLog.groupBy({
    by:   ["userId"],
    _sum: { coins: true },
  });

  await Promise.all(
    logs.map((row) =>
      prisma.profile.updateMany({
        where: { userId: row.userId },
        data:  { coinBalance: row._sum.coins ?? 0 },
      })
    )
  );
}

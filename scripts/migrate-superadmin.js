/**
 * One-time migration script — run ONCE after deploying the new schema.
 * 
 * 1. Sets isSuperAdmin=true for the legacy hardcoded admin email
 * 2. Recalculates coinBalance for all users from StudyCoinLog
 * 
 * Usage:
 *   DATABASE_URL="your-db-url" node scripts/migrate-superadmin.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LEGACY_SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "admin@cyberlib.in";

async function main() {
  console.log("🚀 Starting migration...\n");

  // 1. Set isSuperAdmin for legacy admin email
  const updated = await prisma.user.updateMany({
    where: { email: LEGACY_SUPERADMIN_EMAIL },
    data: { isSuperAdmin: true },
  });
  console.log(`✅ Set isSuperAdmin=true for ${updated.count} user(s) with email: ${LEGACY_SUPERADMIN_EMAIL}`);

  // 2. Recalculate coinBalance for all users
  console.log("\n📊 Recalculating coinBalance from StudyCoinLog...");
  const logs = await prisma.studyCoinLog.groupBy({
    by: ["userId"],
    _sum: { coins: true },
  });

  let balanceCount = 0;
  for (const row of logs) {
    const balance = row._sum.coins ?? 0;
    await prisma.profile.updateMany({
      where: { userId: row.userId },
      data: { coinBalance: balance },
    });
    balanceCount++;
  }
  console.log(`✅ Updated coinBalance for ${balanceCount} profile(s)`);

  console.log("\n🎉 Migration complete!");
  console.log("\nNext steps:");
  console.log("  1. To set a different superadmin: UPDATE \"User\" SET \"isSuperAdmin\"=true WHERE email='your@email.com'");
  console.log("  2. Remove SUPERADMIN_EMAIL env var after confirming — no longer needed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

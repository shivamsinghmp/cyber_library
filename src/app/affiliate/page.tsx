import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link2, IndianRupee, Users, Gift } from "lucide-react";
import { CopyReferralButton } from "./CopyReferralButton";
import { generateReferralCodeForUser } from "@/lib/referral";

export default async function AffiliateDashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role ?? "STUDENT";

  if (!userId || role !== "INFLUENCER") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold text-[var(--cream)]">Affiliate access only</h1>
        <p className="text-sm text-[var(--cream-muted)]">
          This dashboard is only available for influencer accounts. Please contact admin if you believe this is an error.
        </p>
      </div>
    );
  }
  // Ensure influencer has a persistent referral code
  const influencer = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, name: true, email: true },
  });
  let referralCode = influencer?.referralCode ?? null;
  if (!referralCode) {
    referralCode = await generateReferralCodeForUser(userId);
  }

  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl =
    process.env.NEXTAUTH_URL || (host ? `${protocol}://${host}` : "https://virtuallibrary.com");
  const referralLink = `${baseUrl}/signup?ref=${encodeURIComponent(referralCode)}`;

  // Referral stats
  const referredUsers = await prisma.user.findMany({
    where: { referredById: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      referralRewarded: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const totalReferred = referredUsers.length;
  const successfulReferrals = referredUsers.filter((u) => u.referralRewarded).length;

  const referralRewards = await prisma.rewardWinner.findMany({
    where: {
      userId,
      reward: { type: "REFERRAL" },
    },
    include: {
      reward: { select: { amount: true } },
    },
  });

  const totalRewardAmount = referralRewards.reduce(
    (sum, w) => sum + (w.reward?.amount ?? 0),
    0
  );
  const paidAmount = referralRewards
    .filter((w) => w.status === "PAID")
    .reduce((sum, w) => sum + (w.reward?.amount ?? 0), 0);
  const pendingAmount = totalRewardAmount - paidAmount;

  const displayName =
    influencer?.name || session?.user?.name || session?.user?.email || "Influencer";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Welcome, {displayName}!
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Influencer Dashboard — share your link, track referrals, and see your rewards.
          </p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--accent)]" />
            <p className="text-xs font-medium text-[var(--cream-muted)]">
              Total referred students
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--cream)]">{totalReferred}</p>
          <p className="mt-1 text-[11px] text-[var(--cream-muted)]">
            {successfulReferrals} have already made a qualifying purchase.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-300" />
            <p className="text-xs font-medium text-emerald-100/80">
              Total referral rewards
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-100">
            ₹{totalRewardAmount.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-100/80">
            Paid: ₹{paidAmount.toFixed(2)} · Pending: ₹{pendingAmount.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-amber-400" />
            <p className="text-xs font-medium text-[var(--cream-muted)]">
              Quick payout insight
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--cream)]">
            ₹{paidAmount.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-[var(--cream-muted)]">
            This is the amount already marked as <span className="font-semibold">PAID</span> in
            Reward Program.
          </p>
        </div>
      </div>

      {/* Referral link card */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Link2 className="h-5 w-5 text-[var(--accent)]" />
          Your referral link
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Share this link. When a student signs up and completes their first purchase, both you
          and the student receive a reward.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)]">
            {referralLink}
          </code>
          <CopyReferralButton url={referralLink} />
        </div>
      </div>

      {/* Referred students table */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Users className="h-5 w-5 text-[var(--accent)]" />
          Referred students
        </h2>
        {referredUsers.length === 0 ? (
          <p className="py-4 text-sm text-[var(--cream-muted)]">
            No students referred yet. Share your link to start earning rewards.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-[var(--cream-muted)]">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Joined</th>
                  <th className="py-2 pr-3">Referral status</th>
                </tr>
              </thead>
              <tbody>
                {referredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-[var(--cream)]">
                        {u.name || "Unnamed student"}
                      </p>
                      <p className="text-xs text-[var(--cream-muted)]">{u.email}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[var(--cream-muted)]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {u.referralRewarded ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
                          Reward triggered
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-200">
                          No qualifying purchase yet
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

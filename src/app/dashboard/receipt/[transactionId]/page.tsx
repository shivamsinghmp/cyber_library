import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "./_PrintButton";

export const dynamic = "force-dynamic";

type OrderDetail = { name: string; price: number; slotId?: string; productId?: string };

export default async function ReceiptPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;

  const session = await auth();
  const userId  = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login");

  const txn = await prisma.transaction.findUnique({
    where: { transactionId },
    include: {
      user: {
        select: {
          email: true,
          name: true,
          profile: { select: { fullName: true, phone: true } },
          userSubscriptions: {
            where: { transactionId },
            select: { planType: true, startDate: true, endDate: true, status: true },
          },
        },
      },
    },
  });

  if (!txn || txn.userId !== userId) notFound();

  const customerName = txn.user.profile?.fullName || txn.user.name || txn.user.email;
  const items        = (txn.orderDetails as OrderDetail[]) ?? [];
  const sub          = txn.user.userSubscriptions?.[0] ?? null;
  const isSubscription = !!sub;

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const fmtDateTime = (d: Date) =>
    new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-100 flex items-start justify-center py-10 px-4 print:bg-white print:py-0">
      <div className="w-full max-w-[600px]">

        {/* Print / Download button — hidden in print */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <a href="/dashboard" className="text-sm text-indigo-600 hover:underline font-medium">← Back to Dashboard</a>
          <PrintButton />
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-indigo-100 print:shadow-none print:rounded-none print:border-none">

          {/* Header — gradient */}
          <div className="px-10 py-8 text-center" style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#3730a3 60%,#4c1d95 100%)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Let's Study" width={64} height={64} className="mx-auto rounded-2xl mb-4" />
            <p className="text-[11px] font-bold tracking-[4px] uppercase text-indigo-300 mb-1">Let's Study</p>
            <p className="text-[11px] tracking-[3px] text-indigo-500 opacity-70">LEARN · GROW · CONNECT</p>
          </div>

          {/* Body */}
          <div className="px-10 py-8">

            {/* Status + title */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                ✓
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">
                {isSubscription ? "Welcome to Premium! 🎉" : "Payment Confirmed"}
              </h1>
              <p className="text-gray-500 text-sm">
                {isSubscription
                  ? `${customerName?.split(" ")[0]}, you are now a Premium Member.`
                  : `Hi ${customerName?.split(" ")[0]}, your payment was successful.`}
              </p>
            </div>

            {/* Premium badge */}
            {isSubscription && (
              <div className="text-center mb-6">
                <span className="inline-block px-5 py-1.5 rounded-full text-[11px] font-black tracking-[3px] uppercase text-white"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)" }}>
                  ✦ PREMIUM MEMBER ✦
                </span>
              </div>
            )}

            {/* Membership details */}
            {isSubscription && sub && (
              <div className="rounded-2xl p-5 mb-6" style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                <p className="text-[10px] font-bold tracking-[2px] uppercase text-violet-500 mb-3">Membership Details</p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-violet-700">Plan</span>
                  <span className="font-bold text-right text-indigo-900">{sub.planType === "MONTHLY" ? "Monthly" : "Yearly"} Membership</span>
                  <span className="text-violet-700">Status</span>
                  <span className="font-bold text-right text-green-700">{sub.status}</span>
                  <span className="text-violet-700">Start Date</span>
                  <span className="font-bold text-right text-indigo-900">{fmt(sub.startDate)}</span>
                  <span className="text-violet-700">Valid Until</span>
                  <span className="font-bold text-right text-indigo-900">{fmt(sub.endDate)}</span>
                </div>
              </div>
            )}

            {/* Items table */}
            <table className="w-full mb-1 text-sm">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[2px] uppercase text-indigo-400 rounded-l-xl">Description</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold tracking-[2px] uppercase text-indigo-400 rounded-r-xl">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-indigo-50">
                    <td className="px-4 py-3 text-gray-700">{item.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">₹{item.price.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50">
                  <td className="px-4 py-3 font-black text-gray-900 rounded-l-xl">Total Paid</td>
                  <td className="px-4 py-3 text-right font-black text-2xl rounded-r-xl" style={{ color: "#6366f1" }}>
                    ₹{txn.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Transaction info */}
            <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm">
              <p className="text-[10px] font-bold tracking-[2px] uppercase text-gray-400 mb-3">Transaction Details</p>
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-mono text-xs font-semibold text-gray-900 text-right break-all">{txn.transactionId}</span>
                {txn.paymentGatewayId && (
                  <>
                    <span className="text-gray-500">Payment ID</span>
                    <span className="font-mono text-xs font-semibold text-gray-900 text-right break-all">{txn.paymentGatewayId}</span>
                  </>
                )}
                <span className="text-gray-500">Date & Time</span>
                <span className="font-semibold text-gray-900 text-right">{fmtDateTime(txn.createdAt)}</span>
                <span className="text-gray-500">Billing Email</span>
                <span className="font-semibold text-gray-900 text-right text-xs break-all">{txn.user.email}</span>
              </div>
            </div>

            {/* What's included (subscription) */}
            {isSubscription && (
              <div className="mt-5 bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
                <p className="text-[10px] font-bold tracking-[2px] uppercase text-green-500 mb-3">What&apos;s Included</p>
                <ul className="text-sm text-green-800 space-y-1.5">
                  {[
                    "Unlimited access to all study rooms",
                    "StudyMate AI — unlimited messages",
                    "Live Google Meet sessions with auto-admit",
                    "Leaderboard, streaks & coin rewards",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Support */}
            <p className="mt-6 text-center text-xs text-gray-400">
              Questions?{" "}
              <a href="mailto:support@cyberlib.in" className="text-indigo-500 hover:underline">support@cyberlib.in</a>
            </p>
          </div>

          {/* Footer */}
          <div className="px-10 py-5 text-center" style={{ background: "#1e1b4b" }}>
            <p className="text-[10px] text-indigo-400 tracking-[2px] uppercase mb-0.5">Let's Study</p>
            <p className="text-[10px] text-indigo-800">© {new Date().getFullYear()} cyberlib.in — All rights reserved</p>
          </div>
        </div>

        {/* Print hint */}
        <p className="text-center text-xs text-gray-400 mt-4 print:hidden">
          Use &quot;Print&quot; to save as PDF
        </p>
      </div>
    </div>
  );
}

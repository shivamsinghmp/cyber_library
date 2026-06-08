import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Lock } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";

async function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="text-xs text-gray-400 underline hover:text-gray-600 transition"
      >
        Logout
      </button>
    </form>
  );
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function TrialExpiredPage() {
  const session = await auth();
  const userId  = (session?.user as { id?: string })?.id;

  if (!userId) redirect("/login");

  // Fetch trial subscription for display
  const trialSub = await prisma.userSubscription.findFirst({
    where:   { userId, planType: "TRIAL" },
    select:  { startDate: true, endDate: true },
    orderBy: { startDate: "desc" },
  });

  // If user has an active subscription, redirect to dashboard
  const activeSub = await prisma.userSubscription.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gt: new Date() } },
    select: { id: true },
  });
  if (activeSub) redirect("/dashboard");

  const startDate = trialSub?.startDate;
  const endDate   = trialSub?.endDate;
  const daysUsed  = startDate
    ? Math.ceil((Date.now() - startDate.getTime()) / 86_400_000)
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Lock icon */}
        <div className="flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50">
            <Lock className="h-9 w-9 text-red-500" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Your Free Trial Has Ended
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            You've used your free trial. Choose a plan to keep studying.
          </p>
        </div>

        {/* Trial dates */}
        {startDate && endDate && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm space-y-2">
            <div className="flex items-center justify-between text-gray-600">
              <span>Trial started</span>
              <span className="font-semibold text-gray-900">{fmtDate(startDate)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>Trial ended</span>
              <span className="font-semibold text-gray-900">{fmtDate(endDate)}</span>
            </div>
            {daysUsed !== null && (
              <div className="flex items-center justify-between text-gray-600">
                <span>Total study days</span>
                <span className="font-semibold text-gray-900">{Math.min(daysUsed, 30)}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/checkout"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-lg"
          >
            Get a Plan — Keep Studying 🚀
          </Link>
          <p className="text-xs text-gray-400">
            Monthly and yearly plans available — start today!
          </p>
        </div>

        {/* Support + Logout */}
        <div className="space-y-1">
          <p className="text-xs text-gray-400">
            Need help?{" "}
            <a href="mailto:support@cyberlib.in" className="text-indigo-500 hover:underline">
              support@cyberlib.in
            </a>
          </p>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSales } from "@/lib/api-helpers";

/**
 * For a contact that came from a real signup (source = SIGNUP, sourceUserId
 * set), returns the full student profile — same data shape as the staff
 * portal's student lookup (@/app/api/staff/student-search in the old app) —
 * so sales staff can see study hours, coins, transactions, subscriptions,
 * and digital purchases right from the pipeline, without needing a
 * separate lookup tool.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const contact = await prisma.crmContact.findUnique({ where: { id }, select: { sourceUserId: true } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    if (!contact.sourceUserId) return NextResponse.json({ student: null });

    const userId = contact.sourceUserId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) return NextResponse.json({ student: null, message: "Linked account no longer exists." });

    const [transactions, subscriptions, digitalPurchases, studySessions] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, transactionId: true, amount: true, currency: true,
          status: true, paymentGatewayId: true, orderDetails: true, createdAt: true,
        },
      }),
      prisma.roomSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { studySlot: { select: { id: true, name: true, timeLabel: true, roomId: true } } },
      }),
      prisma.digitalPurchase.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        include: { product: { select: { id: true, name: true, price: true } } },
      }),
      prisma.studySession.findMany({
        where: { userId, durationMinutes: { not: null } },
        select: { startedAt: true, durationMinutes: true },
      }),
    ]);

    const minutesByDate: Record<string, number> = {};
    for (const s of studySessions) {
      const key = new Date(s.startedAt).toISOString().slice(0, 10);
      minutesByDate[key] = (minutesByDate[key] ?? 0) + (s.durationMinutes ?? 0);
    }
    const attendanceDays = Object.values(minutesByDate).filter((m) => m >= 30).length;

    const { password: _password, ...safeUser } = user;

    return NextResponse.json({
      student: {
        ...safeUser,
        attendanceDays,
        transactions,
        subscriptions: subscriptions.map((s) => ({
          id: s.id,
          slotName: s.studySlot.name,
          timeLabel: s.studySlot.timeLabel,
          roomId: s.studySlot.roomId,
          createdAt: s.createdAt,
        })),
        digitalPurchases: digitalPurchases.map((p) => ({
          id: p.id,
          productName: p.product.name,
          productPrice: p.product.price,
          purchasedAt: p.purchasedAt,
          transactionId: p.transactionId,
        })),
      },
    });
  } catch (e) {
    console.error("GET /api/admin/pipeline/[id]/student:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** GET: Search student by Student ID, email, or mobile (staff only). Returns full details. */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || (role !== "ADMIN" && role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    if (!q || q.length < 2) {
      return NextResponse.json({ error: "Enter at least 2 characters (Student ID, email, or mobile)" }, { status: 400 });
    }

    const normalizedPhone = q.replace(/\D/g, "");
    const phoneMatch = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : null;

    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        deletedAt: null,
        OR: [
          { studentId: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          ...(phoneMatch
            ? [
                { profile: { phone: { contains: phoneMatch } } },
                { profile: { whatsappNumber: { contains: phoneMatch } } },
              ]
            : []),
        ],
      },
      include: {
        profile: true,
      },
      take: 5,
    });

    if (users.length === 0) {
      return NextResponse.json({ student: null, message: "No student found" });
    }

    const user = users[0];
    const userId = user.id;

    const [transactions, subscriptions, digitalPurchases, studySessions] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          transactionId: true,
          amount: true,
          currency: true,
          status: true,
          paymentGatewayId: true,
          orderDetails: true,
          createdAt: true,
        },
      }),
      prisma.roomSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          studySlot: { select: { id: true, name: true, timeLabel: true, roomId: true } },
        },
      }),
      prisma.digitalPurchase.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        include: {
          product: { select: { id: true, name: true, price: true } },
        },
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

    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      student: {
        ...safeUser,
        attendanceDays,
        transactions,
        subscriptions: subscriptions.map((s) => ({
          id: s.id,
          studySlotId: s.studySlotId,
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
    console.error("GET /api/staff/student-search:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

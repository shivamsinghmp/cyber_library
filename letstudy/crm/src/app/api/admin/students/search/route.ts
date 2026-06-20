import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSales } from "@/lib/api-helpers";

/**
 * Search ANY existing student by Student ID, email, name, or mobile —
 * independent of whether they're already a CrmContact. Returns the same
 * full-profile shape as /api/admin/pipeline/[id]/student, so sales staff
 * can look someone up directly without needing them in the pipeline first.
 */
export async function GET(request: Request) {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ error: "Enter at least 2 characters." }, { status: 400 });
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
      include: { profile: true },
      take: 5,
    });

    if (users.length === 0) {
      return NextResponse.json({ student: null, message: "No student found." });
    }

    const user = users[0];
    const userId = user.id;

    // Does this student already have a CRM contact?
    const existingContact = await prisma.crmContact.findFirst({
      where: { sourceUserId: userId },
      select: { id: true },
    });

    const [transactions, subscriptions, digitalPurchases, studySessions] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, transactionId: true, amount: true, status: true, createdAt: true },
      }),
      prisma.roomSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { studySlot: { select: { name: true, timeLabel: true } } },
      }),
      prisma.digitalPurchase.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        include: { product: { select: { name: true, price: true } } },
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
        crmContactId: existingContact?.id ?? null,
        transactions,
        subscriptions: subscriptions.map((s) => ({ slotName: s.studySlot.name, timeLabel: s.studySlot.timeLabel })),
        digitalPurchases: digitalPurchases.map((p) => ({ productName: p.product.name, productPrice: p.product.price })),
      },
    });
  } catch (e) {
    console.error("GET /api/admin/students/search:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** Add a found student to the pipeline (source = SIGNUP, stage = NEW). */
export async function POST(request: Request) {
  const auth = await requireSales();
  if (auth.error) return auth.error;

  try {
    const { userId } = await request.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const existing = await prisma.crmContact.findFirst({ where: { sourceUserId: userId } });
    if (existing) return NextResponse.json(existing);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, profile: { select: { phone: true, whatsappNumber: true } } },
    });
    if (!user) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const contact = await prisma.crmContact.create({
      data: {
        name: user.name,
        email: user.email,
        phone: user.profile?.phone || user.profile?.whatsappNumber || null,
        source: "SIGNUP",
        sourceUserId: userId,
        stage: "NEW",
      },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/students/search:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

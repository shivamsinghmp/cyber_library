import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { verifyAdminViewToken } from "@/lib/adminViewToken";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/admin/student-view/exit
 * Clears the __asv cookie and logs the exit.
 */
export async function POST() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const cookieStore = await cookies();
    const asvToken    = cookieStore.get("__asv")?.value;

    if (asvToken) {
      const payload = verifyAdminViewToken(asvToken);
      if (payload) {
        // Log exit event (fire-and-forget)
        prisma.adminStudentAccessLog.create({
          data: {
            adminId:      auth.user.id,
            adminName:    auth.user.email?.split("@")[0] ?? "Admin",
            studentId:    payload.studentId,
            pageAccessed: "/admin/student-view",
            action:       "exit",
            endedAt:      new Date(),
          },
        }).catch(() => {});
      }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("__asv", "", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   0,
      path:     "/",
    });
    return response;
  } catch (e) {
    console.error("POST /api/admin/student-view/exit:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

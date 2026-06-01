/**
 * Use this instead of auth() in dashboard server components to support
 * admin "View as Student" mode. When an admin is impersonating a student,
 * returns the student's userId so the page fetches the student's data.
 */

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { verifyAdminViewToken } from "@/lib/adminViewToken";

export type EffectiveUser = {
  userId:      string;
  isAdminView: boolean;
  adminId?:    string;
  adminName?:  string;
};

export async function getEffectiveUserId(): Promise<EffectiveUser> {
  const cookieStore = await cookies();
  const asvToken = cookieStore.get("__asv")?.value;

  if (asvToken) {
    const payload = verifyAdminViewToken(asvToken);
    if (payload) {
      return {
        userId:      payload.studentId,
        isAdminView: true,
        adminId:     payload.adminId,
        adminName:   payload.adminName,
      };
    }
  }

  const session = await auth();
  return {
    userId:      (session?.user as { id?: string })?.id ?? "",
    isAdminView: false,
  };
}

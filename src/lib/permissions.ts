import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminModuleIds } from "./permissions-client";

export * from "./permissions-client";

export async function requireAdminModule(requiredModule: AdminModuleIds) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Hardcoded Super Admin check
  if (session.user.email === "admin@cyberlib.in") return;

  const role = (session.user as any).role;
  if (role === "ADMIN") return; 
  
  if (role !== "EMPLOYEE") redirect("/dashboard");

  const perm = await prisma.employeePermission.findUnique({ 
    where: { userId: session.user.id }
  });
  
  if (!perm || !perm.modules.includes(requiredModule)) {
    redirect("/admin/unauthorized");
  }
}

export async function checkAdminModuleApi(requiredModule: AdminModuleIds): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  if (session.user.email === "admin@cyberlib.in") return true;
  
  const role = (session.user as any).role;
  if (role === "ADMIN") return true;
  if (role !== "EMPLOYEE") return false;

  const perm = await prisma.employeePermission.findUnique({ 
    where: { userId: session.user.id }
  });
  
  return !!(perm && perm.modules.includes(requiredModule));
}

/** Automatically infers required module from Next.js req.url */
export async function autoCheckApiAccess(req: Request): Promise<boolean> {
  const url = req.url;
  let requiredModule: AdminModuleIds = "SYSTEM_OVERVIEW";

  if (url.includes("/admin/staff") || url.includes("/admin/students") || url.includes("/admin/authors") || url.includes("/admin/referrals")) {
    requiredModule = "STAFF_MGMT";
  } else if (url.includes("/admin/transactions") || url.includes("/admin/products") || url.includes("/admin/coupons") || url.includes("/admin/rewards") || url.includes("/admin/coin-engine") || url.includes("/admin/razorpay")) {
    requiredModule = "FINANCE";
  } else if (url.includes("/admin/whatsapp") || url.includes("/admin/leads") || url.includes("/admin/forms") || url.includes("/admin/faqs") || url.includes("/admin/email") || url.includes("/admin/support") || url.includes("/admin/feedback")) {
    requiredModule = "ENGAGEMENT";
  } else if (url.includes("/admin/blog") || url.includes("/admin/export") || url.includes("/admin/bin")) {
    requiredModule = "CONTENT";
  } else if (url.includes("/admin/virtual-library") || url.includes("/admin/slots") || url.includes("/admin/meet-polls")) {
    requiredModule = "VIRTUAL_LIBRARY";
  }

  return checkAdminModuleApi(requiredModule);
}

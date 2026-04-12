export const ADMIN_MODULES = [
  { id: "SYSTEM_OVERVIEW", label: "System Overview (Traffic, Home, Settings)" },
  { id: "VIRTUAL_LIBRARY", label: "Virtual Library & Meet (Study Rooms, Polls)" },
  { id: "STUDENT_MGMT", label: "Student & Referrals Management" },
  { id: "STAFF_MGMT", label: "Staff Management (Only Super Admin should have this usually)" },
  { id: "FINANCE", label: "eCommerce & Finance (Transactions, Coupons, Store, Coins)" },
  { id: "ENGAGEMENT", label: "Engagement & Support (WhatsApp, Emails, Tickets, Leads)" },
  { id: "CONTENT", label: "Content & System (Blogs, FAQs, Export, Bin)" },
] as const;

export type AdminModuleIds = typeof ADMIN_MODULES[number]["id"];

export function hasModuleAccess(
  userRole: string,
  userAllowedModules: string[],
  requiredModule: AdminModuleIds
): boolean {
  // admin@cyberlib.in is hardcoded superadmin that can never be blocked
  if (userRole === "ADMIN") return true; 
  if (userRole === "EMPLOYEE") {
    return userAllowedModules.includes(requiredModule);
  }
  return false;
}

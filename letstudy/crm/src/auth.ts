import { createAuth } from "@cyberlib/shared/auth";

// Dual-role app: ADMIN always has full access; EMPLOYEE access is further
// gated by the "SALES" module in EmployeePermission (checked in
// DashboardShell, not here — the login form lets the user pick which role
// they're signing in as, and the shared authorize() rejects a mismatch).
export const { handlers, auth, signIn, signOut } = createAuth("crm");

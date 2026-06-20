import { createAuth } from "@cyberlib/shared/auth";

// Admin-only login — login page hardcodes loginAsRole "ADMIN", so the
// existing role-mismatch check in createAuth's authorize() rejects any
// EMPLOYEE/STUDENT credentials before a session is ever created.
export const { handlers, auth, signIn, signOut } = createAuth("portal");

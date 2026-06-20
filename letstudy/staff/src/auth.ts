import { createAuth } from "@cyberlib/shared/auth";

// Staff-only login — hardcodes loginAsRole "EMPLOYEE". The shared
// authorize() also rejects EMPLOYEE accounts whose employeeStatus isn't
// "APPROVED" yet (self-registered staff awaiting admin approval).
export const { handlers, auth, signIn, signOut } = createAuth("staff");

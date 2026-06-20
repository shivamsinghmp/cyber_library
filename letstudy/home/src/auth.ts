import { createAuth } from "@cyberlib/shared/auth";

// Session-aware personalization only (e.g. "Go to Dashboard" CTA) — actual
// login/registration for students happens on the app.lstudy.in subdomain.
export const { handlers, auth, signIn, signOut } = createAuth("home");

import { createAuth } from "@cyberlib/shared/auth";

// Student login + registration lives here on app.lstudy.in — this is the
// canonical session-issuing app for students.
export const { handlers, auth, signIn, signOut } = createAuth("app");

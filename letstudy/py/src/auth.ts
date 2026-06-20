import { createAuth } from "@cyberlib/shared/auth";

// Admin-only login, same as portal.lstudy.in — this app manages the Python
// server (WhatsApp bot, AI routing, billing), which is sensitive enough that
// it should never be reachable with anything but an ADMIN credential.
export const { handlers, auth, signIn, signOut } = createAuth("py");

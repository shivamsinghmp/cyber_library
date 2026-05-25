import { redirect } from "next/navigation";

// Email verification is now done via OTP in the Profile page.
// Anyone landing here (bookmarks, old links) gets redirected.
export default function VerifyEmailPage() {
  redirect("/dashboard/profile");
}

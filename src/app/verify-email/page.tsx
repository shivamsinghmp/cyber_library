import { redirect } from "next/navigation";

// Email verification is done via OTP in the Profile page.
// Anyone landing here gets redirected to their profile.
export default function VerifyEmailPage() {
  redirect("/dashboard/profile");
}

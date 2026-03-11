import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Mail,
  Briefcase,
  Calendar,
  Phone,
  FileText,
  Pencil,
  Clock,
} from "lucide-react";

export default async function StaffProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const [user, profile, loginLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.profile.findUnique({
      where: { userId },
      select: {
        fullName: true,
        phone: true,
        institution: true,
        bio: true,
      },
    }),
    prisma.loginLog.findMany({
      where: { userId },
      select: { loginAt: true, logoutAt: true },
    }),
  ]);

  if (!user) redirect("/login");

  const now = new Date();
  let totalSeconds = 0;
  for (const log of loginLogs) {
    const end = log.logoutAt ?? now;
    totalSeconds += (end.getTime() - log.loginAt.getTime()) / 1000;
  }
  const totalH = Math.floor(totalSeconds / 3600);
  const totalM = Math.floor((totalSeconds % 3600) / 60);
  const totalS = Math.round(totalSeconds % 60);
  const totalActiveTimeStr =
    totalSeconds <= 0
      ? "0h 0m 0s"
      : [totalH > 0 ? `${totalH}h` : "", `${totalM}m`, `${totalS}s`]
          .filter(Boolean)
          .join(" ");

  const displayName =
    profile?.fullName?.trim() ||
    user.name?.trim() ||
    user.email?.split("@")[0] ||
    "Staff";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Profile
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Your staff account details
          </p>
        </div>
        <Link
          href="/staff/profile/edit"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-white/10"
        >
          <Pencil className="h-4 w-4" />
          Edit profile
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {user.image ? (
              <Image
                src={user.image}
                alt=""
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--cream-muted)]">
                <User className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-xl font-semibold text-[var(--cream)]">
              {displayName}
            </h2>
            <p className="flex items-center gap-2 text-sm text-[var(--cream-muted)]">
              <Briefcase className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                {user.role}
              </span>
            </p>
            <p className="flex items-center gap-2 text-sm text-[var(--cream-muted)]">
              <Calendar className="h-4 w-4 shrink-0" />
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--cream)]">
              <Clock className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span className="font-mono text-xs">Total active time: {totalActiveTimeStr}</span>
            </p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-1">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cream-muted)]" />
            <div>
              <dt className="text-xs font-medium text-[var(--cream-muted)]">
                Email
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-[var(--cream)]">
                {user.email}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cream-muted)]" />
            <div>
              <dt className="text-xs font-medium text-[var(--cream-muted)]">
                Display name
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-[var(--cream)]">
                {user.name || profile?.fullName || "—"}
              </dd>
            </div>
          </div>
          {profile?.phone && (
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cream-muted)]" />
              <div>
                <dt className="text-xs font-medium text-[var(--cream-muted)]">
                  Phone
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-[var(--cream)]">
                  {profile.phone}
                </dd>
              </div>
            </div>
          )}
          {profile?.institution && (
            <div className="flex items-start gap-3">
              <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cream-muted)]" />
              <div>
                <dt className="text-xs font-medium text-[var(--cream-muted)]">
                  Institution
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-[var(--cream)]">
                  {profile.institution}
                </dd>
              </div>
            </div>
          )}
          {profile?.bio && (
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cream-muted)]" />
              <div>
                <dt className="text-xs font-medium text-[var(--cream-muted)]">
                  Bio
                </dt>
                <dd className="mt-0.5 text-sm text-[var(--cream)]">
                  {profile.bio}
                </dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

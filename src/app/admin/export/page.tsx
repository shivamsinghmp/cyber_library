"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type ExportRow = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  role: string;
  whatsappNumber: string;
  createdAt: string;
};

function escapeCsvCell(value: string): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: ExportRow[]): string {
  const headers = [
    "Student ID",
    "Name",
    "Email",
    "Role",
    "WhatsApp Number",
    "Created At",
  ];
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((r) =>
    [
      r.studentId,
      r.name,
      r.email,
      r.role,
      r.whatsappNumber,
      new Date(r.createdAt).toISOString(),
    ].map(escapeCsvCell).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export default function AdminExportPage() {
  const [loading, setLoading] = useState(false);

  async function handleExportCsv() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/export/users", { credentials: "include" });
      if (!res.ok) {
        toast.error("Failed to fetch data. Ensure you are logged in as Admin.");
        return;
      }
      const rows: ExportRow[] = await res.json();
      const csv = buildCsv(rows);
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `virtual-library-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} users.`);
    } catch {
      toast.error("Export failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 md:py-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Data Export
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Download user data (names, emails, WhatsApp numbers) for marketing and announcements.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/20">
            <FileSpreadsheet className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--cream)]">
              Export to CSV
            </h2>
            <p className="text-xs text-[var(--cream-muted)]">
              All users (students, staff, influencers) with name, email, role, and WhatsApp number.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {loading ? "Preparing…" : "Download CSV"}
        </button>
      </div>

      <p className="text-center text-sm text-[var(--cream-muted)]">
        <Link href="/admin" className="text-[var(--accent)] hover:underline">
          ← Back to Admin
        </Link>
      </p>
    </div>
  );
}

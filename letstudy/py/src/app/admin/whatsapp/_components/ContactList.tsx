"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { UserCircle, MessageSquare, AlertCircle, Users, Search, X } from "lucide-react";

type ContactInfo = {
  phoneNumber: string;
  latestMessage: string;
  latestDirection: "INBOUND" | "OUTBOUND";
  timestamp: string;
  line?: string | null;
  user: { id: string; name: string | null; email: string; image: string | null } | null;
};

function LineBadge({ line }: { line?: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    AI_CHAT: { label: "🤖 AI Chat", className: "bg-indigo-50 text-indigo-700" },
    AUTH:    { label: "🛟 Support", className: "bg-amber-50 text-amber-700" },
    REPORTS: { label: "📊 Reports", className: "bg-emerald-50 text-emerald-700" },
  };
  const info = line ? map[line] : null;
  if (!info) return null;
  return <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${info.className}`}>{info.label}</span>;
}

type Student = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  phoneNumber: string;
};

type Props = {
  contacts: ContactInfo[];
  selectedPhone: string | null;
  loading: boolean;
  unreadPhones: Set<string>;
  onSelect: (phone: string) => void;
};

function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
  const initials = name?.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (src) return <img src={src} alt={name || "User"} className="w-full h-full object-cover" />;
  return <span className="text-xs font-bold text-[var(--accent)]">{initials}</span>;
}

export function ContactList({ contacts, selectedPhone, loading, unreadPhones, onSelect }: Props) {
  const [tab,      setTab]      = useState<"chats" | "students">("chats");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search,   setSearch]   = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tab !== "students") return;
    fetchStudents(search);
  }, [tab]);

  function fetchStudents(q: string) {
    setStudentsLoading(true);
    fetch(`/api/admin/whatsapp/students?q=${encodeURIComponent(q)}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: Student[]) => setStudents(data))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }

  function onSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchStudents(val), 300);
  }

  return (
    <div className="w-72 min-w-[260px] border-r border-gray-200 flex flex-col bg-gray-50">

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setTab("chats")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${
            tab === "chats"
              ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
              : "text-[var(--cream-muted)] hover:text-gray-700"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chats
          {unreadPhones.size > 0 ? (
            <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadPhones.size}
            </span>
          ) : contacts.length > 0 && (
            <span className="ml-1 rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
              {contacts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("students")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${
            tab === "students"
              ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
              : "text-[var(--cream-muted)] hover:text-gray-700"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Students
        </button>
      </div>

      {/* Search (students tab only) */}
      {tab === "students" && (
        <div className="p-2 border-b border-gray-100 bg-white">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Name, number, email…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-7 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            />
            {search && (
              <button onClick={() => { setSearch(""); fetchStudents(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Chats Tab ── */}
        {tab === "chats" && (
          loading ? (
            <div className="p-4 text-sm text-[var(--cream-muted)] text-center animate-pulse">Loading…</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--cream-muted)] opacity-60 flex flex-col items-center gap-2">
              <AlertCircle className="w-7 h-7" />
              <p>No conversations yet.</p>
              <p className="text-xs">Send a message from the Students tab.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {contacts.map((contact) => (
                <button
                  key={contact.phoneNumber}
                  onClick={() => onSelect(contact.phoneNumber)}
                  className={`w-full p-3 flex items-start gap-3 text-left transition hover:bg-white ${
                    selectedPhone === contact.phoneNumber
                      ? "bg-white border-l-2 border-[var(--accent)]"
                      : unreadPhones.has(contact.phoneNumber)
                        ? "bg-emerald-50/60 border-l-2 border-emerald-400"
                        : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    <Avatar src={contact.user?.image} name={contact.user?.name} />
                    {unreadPhones.has(contact.phoneNumber) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${unreadPhones.has(contact.phoneNumber) ? "font-bold text-gray-900" : "font-semibold text-[var(--cream)]"}`}>
                        {contact.user?.name || contact.phoneNumber}
                      </span>
                      <span className="text-[10px] text-[var(--cream-muted)] shrink-0">
                        {format(new Date(contact.timestamp), "h:mm a")}
                      </span>
                    </div>
                    <LineBadge line={contact.line} />
                    {contact.user?.name && (
                      <span className="text-[10px] text-[var(--cream-muted)] font-mono block">{contact.phoneNumber}</span>
                    )}
                    <p className={`text-[11px] truncate mt-0.5 ${unreadPhones.has(contact.phoneNumber) ? "font-semibold text-gray-700" : "text-[var(--cream-muted)]"}`}>
                      {contact.latestDirection === "INBOUND" && unreadPhones.has(contact.phoneNumber) && (
                        <span className="text-emerald-600">↙ </span>
                      )}
                      {contact.latestMessage}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* ── Students Tab ── */}
        {tab === "students" && (
          studentsLoading ? (
            <div className="p-4 text-sm text-[var(--cream-muted)] text-center animate-pulse">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--cream-muted)] opacity-60 flex flex-col items-center gap-2">
              <Users className="w-7 h-7" />
              <p>{search ? "No match found." : "No student numbers registered yet."}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {students.map((student) => (
                <button
                  key={student.userId}
                  onClick={() => {
                    onSelect(student.phoneNumber);
                    setTab("chats");
                  }}
                  className={`w-full p-3 flex items-center gap-3 text-left transition hover:bg-white ${
                    selectedPhone === student.phoneNumber
                      ? "bg-white border-l-2 border-[var(--accent)]"
                      : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                    <Avatar src={student.image} name={student.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-[var(--cream)] truncate">
                      {student.name || "—"}
                    </p>
                    <p className="text-[10px] text-[var(--cream-muted)] font-mono truncate">{student.phoneNumber}</p>
                    <p className="text-[10px] text-[var(--cream-muted)] truncate">{student.email}</p>
                  </div>
                </button>
              ))}
              <div className="p-3 text-center text-[10px] text-[var(--cream-muted)]">
                {students.length} students with numbers
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

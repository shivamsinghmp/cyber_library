"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Send, UserCircle, Phone, Clock, MessageSquare, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

type ContactInfo = {
  phoneNumber: string;
  latestMessage: string;
  timestamp: string;
  user: { id: string; name: string | null; email: string; image: string | null } | null;
};

type ChatMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  status: string;
  createdAt: string;
};

export default function StaffWhatsAppPage() {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/staff/whatsapp")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setContacts(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingContacts(false));
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    setLoadingChat(true);
    fetch(`/api/staff/whatsapp?phoneNumber=${encodeURIComponent(selectedPhone)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => toast.error("Failed to load chat history"))
      .finally(() => setLoadingChat(false));
  }, [selectedPhone]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeContact = contacts.find((c) => c.phoneNumber === selectedPhone);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !selectedPhone) return;

    setSending(true);
    const textSnapshot = inputText;
    const tempId = "temp-" + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        direction: "OUTBOUND",
        content: textSnapshot,
        status: "SENDING...",
        createdAt: new Date().toISOString(),
      },
    ]);
    setInputText("");

    try {
      const res = await fetch("/api/staff/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: selectedPhone,
          message: textSnapshot,
          userId: activeContact?.user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to deliver message");
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "FAILED" } : m)));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, ...data.record, status: "SENT" } : m))
        );
        setContacts((prev) =>
          prev.map((c) =>
            c.phoneNumber === selectedPhone
              ? { ...c, latestMessage: textSnapshot, timestamp: new Date().toISOString() }
              : c
          )
        );
      }
    } catch {
      toast.error("Network error");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "FAILED" } : m)));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 flex h-[90vh] flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/staff"
              className="text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]"
            >
              ← Staff
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[var(--cream)]">WhatsApp Chats</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            View and reply to student WhatsApp conversations.
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <div className="w-1/3 min-w-[300px] flex flex-col border-r border-white/10 bg-black/20">
          <div className="border-b border-white/5 bg-black/30 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
              <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
              Recent Conversations
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="p-4 text-center text-sm animate-pulse text-[var(--cream-muted)]">
                Loading...
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center p-8 text-center text-sm text-[var(--cream-muted)] opacity-60">
                <AlertCircle className="mb-2 h-8 w-8" />
                <p>No chat history yet.</p>
                <p className="mt-1 text-xs">
                  When students interact via WhatsApp, conversations will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {contacts.map((contact) => (
                  <button
                    key={contact.phoneNumber}
                    type="button"
                    onClick={() => setSelectedPhone(contact.phoneNumber)}
                    className={`flex w-full items-start gap-4 p-4 text-left transition hover:bg-white/5 ${
                      selectedPhone === contact.phoneNumber
                        ? "border-l-2 border-[var(--accent)] bg-white/10"
                        : "border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                      {contact.user?.image ? (
                        <img
                          src={contact.user.image}
                          alt={contact.user.name || "Student"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircle className="h-6 w-6 text-[var(--cream-muted)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium text-[var(--cream)]">
                          {contact.user?.name || contact.phoneNumber}
                        </span>
                        <span className="whitespace-nowrap text-[10px] text-[var(--cream-muted)]/70">
                          {format(new Date(contact.timestamp), "MMM d, h:mm a")}
                        </span>
                      </div>
                      {contact.user?.name && (
                        <span className="mb-1 block font-mono text-xs text-[var(--cream-muted)]">
                          {contact.phoneNumber}
                        </span>
                      )}
                      <p className="mt-0.5 truncate text-xs text-[var(--cream-muted)]">
                        {contact.latestMessage}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex flex-1 flex-col bg-black/10">
          {selectedPhone ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 bg-black/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                    <UserCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--cream)]">
                      {activeContact?.user?.name || "Student"}
                    </h3>
                    <span className="flex items-center gap-1 font-mono text-xs text-[var(--cream-muted)]">
                      <Phone className="h-3 w-3" /> {selectedPhone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {loadingChat ? (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--cream-muted)] opacity-60">
                    Loading chat...
                  </div>
                ) : (
                  <>
                    <div className="pb-4 text-center text-xs text-[var(--cream-muted)]/50">
                      WhatsApp conversation history
                    </div>
                    {messages.map((msg) => {
                      const isOutbound = msg.direction === "OUTBOUND";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl border px-4 py-2.5 text-sm shadow-sm ${
                              isOutbound
                                ? "rounded-tr-sm border-emerald-500/30 bg-emerald-600/90 text-white"
                                : "rounded-tl-sm border-white/5 bg-white/10 text-[var(--cream)]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                          <div
                            className={`mt-1 flex items-center gap-1 text-[10px] ${
                              isOutbound ? "text-emerald-400/70" : "text-[var(--cream-muted)]/60"
                            }`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                            {isOutbound && (
                              <span className="ml-1 rounded-sm bg-black/20 px-1 font-medium capitalize opacity-80 backdrop-blur-sm">
                                {msg.status.toLowerCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={endOfMessagesRef} />
                  </>
                )}
              </div>

              <div className="border-t border-white/10 bg-black/30 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputText.trim()}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--ink)] shadow-md transition-all hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="ml-1 h-5 w-5" />
                  </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-[var(--cream-muted)]/50">
                  Meta Business API rules apply. Use templates outside 24h window.
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-[url('/noise.png')] p-8 text-center text-[var(--cream-muted)] opacity-60">
              <MessageSquare className="mb-4 h-16 w-16 opacity-50" />
              <p className="text-lg font-medium text-[var(--cream)]">WhatsApp Chats</p>
              <p className="mt-2 max-w-sm text-sm">
                Select a conversation from the list to view history and send replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

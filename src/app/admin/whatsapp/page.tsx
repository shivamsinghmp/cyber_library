"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Megaphone, PenSquare, MessageSquare, Sparkles, LayoutTemplate } from "lucide-react";
import toast from "react-hot-toast";
import { BroadcastModal }   from "./_components/BroadcastModal";
import { ContactList }      from "./_components/ContactList";
import { ChatWindow }       from "./_components/ChatWindow";
import { DailyReportTab }   from "./_components/DailyReportTab";
import { TemplatesTab }     from "./_components/TemplatesTab";

type ContactInfo = {
  phoneNumber: string;
  latestMessage: string;
  latestDirection: "INBOUND" | "OUTBOUND";
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

type SlotOption = { id: string; name: string; timeLabel: string };

export default function AdminWhatsAppPage() {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "slot">("all");
  const [broadcastSlotId, setBroadcastSlotId] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastRecipientCount, setBroadcastRecipientCount] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotOption[]>([]);

  const [mainTab, setMainTab] = useState<"chat" | "report" | "templates">("chat");
  const [lastSeenAt, setLastSeenAt] = useState<Record<string, string>>({});
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef  = useRef(0);

  // Initial contacts load
  useEffect(() => {
    fetch("/api/admin/whatsapp")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setContacts(data); })
      .catch((err) => console.error(err))
      .finally(() => setLoadingContacts(false));
  }, []);

  // Poll contacts every 8 s — silently updates sidebar with new conversations
  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/admin/whatsapp")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setContacts(data); })
        .catch(() => {});
    }, 8_000);
    return () => clearInterval(id);
  }, []);

  // Initial chat load when contact selected
  useEffect(() => {
    if (!selectedPhone) return;
    setLoadingChat(true);
    fetch(`/api/admin/whatsapp?phoneNumber=${encodeURIComponent(selectedPhone)}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => toast.error("Failed to load chat history"))
      .finally(() => setLoadingChat(false));
  }, [selectedPhone]);

  // Poll active chat every 5 s — new inbound messages appear automatically
  useEffect(() => {
    if (!selectedPhone) return;
    const id = setInterval(() => {
      fetch(`/api/admin/whatsapp?phoneNumber=${encodeURIComponent(selectedPhone)}`)
        .then((r) => r.json())
        .then((data: ChatMessage[]) => {
          if (!Array.isArray(data)) return;
          setMessages((prev) => {
            // Keep unsent/pending temp messages, merge with server data
            const pending = prev.filter((m) => m.id.startsWith("temp-"));
            return [...data, ...pending];
          });
        })
        .catch(() => {});
    }, 5_000);
    return () => clearInterval(id);
  }, [selectedPhone]);

  // Scroll to bottom only when message count grows
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Contacts with unread inbound messages (newer than last time admin opened that chat)
  const unreadPhones = useMemo(() =>
    new Set(
      contacts
        .filter((c) =>
          c.latestDirection === "INBOUND" &&
          c.phoneNumber !== selectedPhone &&
          (!lastSeenAt[c.phoneNumber] || c.timestamp > lastSeenAt[c.phoneNumber])
        )
        .map((c) => c.phoneNumber)
    ),
    [contacts, lastSeenAt, selectedPhone]
  );

  function handleSelectPhone(phone: string) {
    setSelectedPhone(phone);
    setLastSeenAt((prev) => ({ ...prev, [phone]: new Date().toISOString() }));
  }

  useEffect(() => {
    if (!broadcastOpen) return;
    fetch("/api/admin/slots")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SlotOption[]) => setSlots(data))
      .catch(() => setSlots([]));
  }, [broadcastOpen]);

  useEffect(() => {
    if (!broadcastOpen) return;
    const url = broadcastTarget === "slot" && broadcastSlotId
      ? `/api/admin/whatsapp/broadcast?slotId=${encodeURIComponent(broadcastSlotId)}`
      : "/api/admin/whatsapp/broadcast";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: unknown[]) => setBroadcastRecipientCount(Array.isArray(arr) ? arr.length : 0))
      .catch(() => setBroadcastRecipientCount(null));
  }, [broadcastOpen, broadcastTarget, broadcastSlotId]);

  const activeContact = contacts.find((c) => c.phoneNumber === selectedPhone);

  async function handleBroadcastSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastMessage.trim()) { toast.error("Enter a message"); return; }
    if (broadcastTarget === "slot" && !broadcastSlotId) { toast.error("Select a slot"); return; }
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/admin/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: broadcastTarget, slotId: broadcastTarget === "slot" ? broadcastSlotId : undefined, message: broadcastMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Broadcast failed"); return; }
      toast.success(`Broadcast sent: ${data.sent}/${data.total} delivered. ${data.failed} failed.`);
      setBroadcastOpen(false);
      setBroadcastMessage("");
      setBroadcastSlotId("");
    } catch {
      toast.error("Network error");
    } finally {
      setBroadcastSending(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !selectedPhone) return;
    setSending(true);
    const textSnapshot = inputText;
    const tempId = "temp-" + Date.now();
    setMessages((prev) => [...prev, { id: tempId, direction: "OUTBOUND", content: textSnapshot, status: "SENDING...", createdAt: new Date().toISOString() }]);
    setInputText("");
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: selectedPhone, message: textSnapshot, userId: activeContact?.user?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to deliver message");
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, status: "FAILED" } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, ...data.record, status: "SENT" } : m));
        setContacts((prev) => prev.map((c) => c.phoneNumber === selectedPhone ? { ...c, latestMessage: textSnapshot, timestamp: new Date().toISOString() } : c));
      }
    } catch {
      toast.error("Network error");
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, status: "FAILED" } : m));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 h-[90vh] flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Meta API Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Send dynamic updates and support messages directly to connected students via WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNewChatOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[var(--ink)]"
          >
            <PenSquare className="h-4 w-4" />
            New Message
          </button>
          <button
            type="button"
            onClick={() => setBroadcastOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90"
          >
            <Megaphone className="h-4 w-4" />
            Broadcast
          </button>
        </div>
      </div>

      {/* New Message Modal */}
      {newChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-bold text-gray-900 flex items-center gap-2">
              <PenSquare className="h-5 w-5 text-[var(--accent)]" />
              New Conversation
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const raw = newChatNumber.trim();
                if (!raw || raw.length < 10) { toast.error("Valid number daalo (with country code, e.g. +919876543210)"); return; }
                const formatted = raw.startsWith("+") ? raw : `+91${raw.replace(/^0+/, "")}`;
                handleSelectPhone(formatted);
                setMessages([]);
                setNewChatOpen(false);
                setNewChatNumber("");
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={newChatNumber}
                  onChange={(e) => setNewChatNumber(e.target.value)}
                  placeholder="+919876543210 ya 9876543210"
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[var(--accent)]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Country code ke saath likhna better hai. +91 automatically add ho jaayega agar nahi diya.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setNewChatOpen(false); setNewChatNumber(""); }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90"
                >
                  Open Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 self-start">
        {([
          { id: "chat",      label: "Chat",            icon: <MessageSquare   className="h-3.5 w-3.5" /> },
          { id: "report",    label: "Daily Report",    icon: <Sparkles        className="h-3.5 w-3.5" /> },
          { id: "templates", label: "Templates",       icon: <LayoutTemplate  className="h-3.5 w-3.5" /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              mainTab === tab.id
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--cream-muted)] hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <BroadcastModal
        open={broadcastOpen}
        sending={broadcastSending}
        target={broadcastTarget}
        slotId={broadcastSlotId}
        message={broadcastMessage}
        recipientCount={broadcastRecipientCount}
        slots={slots}
        onClose={() => setBroadcastOpen(false)}
        onTargetChange={setBroadcastTarget}
        onSlotChange={setBroadcastSlotId}
        onMessageChange={setBroadcastMessage}
        onSubmit={handleBroadcastSubmit}
      />

      {mainTab === "chat" ? (
        <div className="flex flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <ContactList
            contacts={contacts}
            selectedPhone={selectedPhone}
            loading={loadingContacts}
            unreadPhones={unreadPhones}
            onSelect={handleSelectPhone}
          />
          <ChatWindow
            selectedPhone={selectedPhone}
            activeContact={activeContact}
            messages={messages}
            loadingChat={loadingChat}
            inputText={inputText}
            sending={sending}
            endRef={endOfMessagesRef}
            onInputChange={setInputText}
            onSend={handleSendMessage}
          />
        </div>
      ) : mainTab === "report" ? (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6">
          <DailyReportTab />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6">
          <TemplatesTab />
        </div>
      )}
    </div>
  );
}

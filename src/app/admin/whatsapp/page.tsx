"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Send, UserCircle, Phone, Clock, MessageSquare, AlertCircle, Megaphone, X } from "lucide-react";
import toast from "react-hot-toast";

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

type SlotOption = { id: string; name: string; timeLabel: string };

export default function AdminWhatsAppPage() {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "slot">("all");
  const [broadcastSlotId, setBroadcastSlotId] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastRecipientCount, setBroadcastRecipientCount] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotOption[]>([]);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Load Contact Book
  useEffect(() => {
    fetch("/api/admin/whatsapp")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContacts(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingContacts(false));
  }, []);

  // Load Chat History when a contact is selected
  useEffect(() => {
    if (!selectedPhone) return;
    
    setLoadingChat(true);
    fetch(`/api/admin/whatsapp?phoneNumber=${encodeURIComponent(selectedPhone)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(() => toast.error("Failed to load chat history"))
      .finally(() => setLoadingChat(false));
  }, [selectedPhone]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load slots when broadcast modal opens
  useEffect(() => {
    if (!broadcastOpen) return;
    fetch("/api/admin/slots")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string; timeLabel: string }[]) => setSlots(data))
      .catch(() => setSlots([]));
  }, [broadcastOpen]);

  // Load recipient count for broadcast
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

  const activeContact = contacts.find(c => c.phoneNumber === selectedPhone);

  async function handleBroadcastSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      toast.error("Enter a message");
      return;
    }
    if (broadcastTarget === "slot" && !broadcastSlotId) {
      toast.error("Select a slot");
      return;
    }
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/admin/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: broadcastTarget,
          slotId: broadcastTarget === "slot" ? broadcastSlotId : undefined,
          message: broadcastMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Broadcast failed");
        return;
      }
      toast.success(`Broadcast sent: ${data.sent}/${data.total} delivered. ${data.failed} failed.`);
      setBroadcastOpen(false);
      setBroadcastMessage("");
      setBroadcastSlotId("");
      setContacts((prev) => prev);
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
    
    // Optimistic UI update
    const tempId = "temp-" + Date.now();
    setMessages(prev => [...prev, {
      id: tempId,
      direction: "OUTBOUND",
      content: textSnapshot,
      status: "SENDING...",
      createdAt: new Date().toISOString()
    }]);
    
    setInputText("");

    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: selectedPhone,
          message: textSnapshot,
          userId: activeContact?.user?.id, 
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Failed to deliver message");
        // Mark as failed
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "FAILED" } : m));
      } else {
        // Update with true database record
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...data.record, status: "SENT" } : m));
        
        // Update sidebar latest message snippet
        setContacts(prev => prev.map(c => 
          c.phoneNumber === selectedPhone 
            ? { ...c, latestMessage: textSnapshot, timestamp: new Date().toISOString() } 
            : c
        ));
      }
    } catch (e) {
      toast.error("Network error");
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "FAILED" } : m));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 h-[90vh] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--cream)]">WhatsApp Meta API Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Send dynamic updates and support messages directly to connected students via WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBroadcastOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90"
        >
          <Megaphone className="h-4 w-4" />
          Broadcast
        </button>
      </div>

      {broadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--ink)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--cream)] flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-[var(--accent)]" />
                Broadcast Message
              </h2>
              <button
                type="button"
                onClick={() => !broadcastSending && setBroadcastOpen(false)}
                className="rounded-lg p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleBroadcastSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">Send to</label>
                <div className="flex gap-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="target"
                      checked={broadcastTarget === "all"}
                      onChange={() => setBroadcastTarget("all")}
                      className="rounded border-white/20 text-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--cream)]">All active students</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="target"
                      checked={broadcastTarget === "slot"}
                      onChange={() => setBroadcastTarget("slot")}
                      className="rounded border-white/20 text-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--cream)]">Slot subscribers</span>
                  </label>
                </div>
              </div>
              {broadcastTarget === "slot" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">Slot</label>
                  <select
                    value={broadcastSlotId}
                    onChange={(e) => setBroadcastSlotId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-[var(--cream)]"
                  >
                    <option value="">Select a slot</option>
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} – {s.timeLabel}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">Message</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your broadcast message..."
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50"
                />
              </div>
              {broadcastRecipientCount !== null && (
                <p className="text-xs text-[var(--cream-muted)]">
                  {broadcastRecipientCount} recipient{broadcastRecipientCount !== 1 ? "s" : ""} will receive this message.
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !broadcastSending && setBroadcastOpen(false)}
                  className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcastSending || !broadcastMessage.trim()}
                  className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50"
                >
                  {broadcastSending ? "Sending…" : "Send broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        
        {/* SIDEBAR: Contacts list */}
        <div className="w-1/3 min-w-[300px] border-r border-white/10 flex flex-col bg-black/20">
          <div className="p-4 border-b border-white/5 bg-black/30">
            <h2 className="text-sm font-semibold text-[var(--cream)] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" /> 
              Recent Conversations
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="p-4 text-sm text-[var(--cream-muted)] text-center animate-pulse">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--cream-muted)] opacity-60 flex flex-col items-center">
                 <AlertCircle className="w-8 h-8 mb-2" />
                 <p>No chat history found.</p>
                 <p className="text-xs mt-1">When students complete a booking, their Number & automated Notification will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {contacts.map((contact) => (
                  <button
                    key={contact.phoneNumber}
                    onClick={() => setSelectedPhone(contact.phoneNumber)}
                    className={`w-full p-4 flex items-start gap-4 text-left transition hover:bg-white/5 ${
                      selectedPhone === contact.phoneNumber ? "bg-white/10 border-l-2 border-[var(--accent)]" : "border-l-2 border-transparent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {contact.user?.image ? (
                        <img src={contact.user.image} alt={contact.user.name || "Student"} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-6 h-6 text-[var(--cream-muted)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--cream)] truncate">
                          {contact.user?.name || contact.phoneNumber}
                        </span>
                        <span className="text-[10px] text-[var(--cream-muted)]/70 whitespace-nowrap">
                          {format(new Date(contact.timestamp), "MMM d, h:mm a")}
                        </span>
                      </div>
                      {contact.user?.name && (
                         <span className="text-xs text-[var(--cream-muted)] font-mono mb-1 block">{contact.phoneNumber}</span>
                      )}
                      <p className="text-xs text-[var(--cream-muted)] truncate mt-0.5">
                        {contact.latestMessage}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 flex flex-col bg-black/10 relative">
          {selectedPhone ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                     <UserCircle className="w-6 h-6 text-emerald-400" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-[var(--cream)]">
                       {activeContact?.user?.name || "Student"}
                     </h3>
                     <span className="text-xs text-[var(--cream-muted)] flex items-center gap-1 font-mono">
                       <Phone className="w-3 h-3" /> {selectedPhone}
                     </span>
                   </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingChat ? (
                  <div className="h-full flex items-center justify-center text-sm text-[var(--cream-muted)] opacity-60">
                    Loading chat history...
                  </div>
                ) : (
                  <>
                    <div className="text-center text-xs text-[var(--cream-muted)]/50 pb-4">
                      End-to-End Meta Encrypted Gateway
                    </div>
                    {messages.map((msg) => {
                      const isOutbound = msg.direction === "OUTBOUND";
                      return (
                        <div key={msg.id} className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isOutbound 
                                ? "bg-emerald-600/90 text-white rounded-tr-sm border border-emerald-500/30" 
                                : "bg-white/10 text-[var(--cream)] rounded-tl-sm border border-white/5"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                          
                          <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOutbound ? "text-emerald-400/70" : "text-[var(--cream-muted)]/60"}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                            {isOutbound && (
                               <span className="ml-1 capitalize font-medium opacity-80 backdrop-blur-sm px-1 rounded-sm bg-black/20">
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

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10 bg-black/30">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a WhatsApp message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputText.trim()}
                    className="w-12 h-12 rounded-full bg-[var(--accent)] text-[var(--ink)] flex items-center justify-center hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 shadow-md"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                </form>
                <div className="text-[10px] text-[var(--cream-muted)]/50 mt-2 text-center">
                  Notice: Standard Meta Business API rules apply. Unsolicited outbound messages outside 24h window must use Pre-approved Templates.
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--cream-muted)] opacity-60 p-8 text-center bg-[url('/noise.png')]">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium text-[var(--cream)]">WhatsApp Meta Control Panel</p>
              <p className="text-sm mt-2 max-w-sm">
                Select a conversation from the sidebar to view chat history or send a direct text message via the official Graph API.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

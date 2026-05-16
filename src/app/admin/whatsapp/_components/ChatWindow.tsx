"use client";

import { RefObject } from "react";
import { format } from "date-fns";
import { Send, UserCircle, Phone, Clock, MessageSquare } from "lucide-react";

type ChatMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  status: string;
  createdAt: string;
};

type ContactInfo = {
  phoneNumber: string;
  latestMessage: string;
  timestamp: string;
  user: { id: string; name: string | null; email: string; image: string | null } | null;
};

type Props = {
  selectedPhone: string | null;
  activeContact: ContactInfo | undefined;
  messages: ChatMessage[];
  loadingChat: boolean;
  inputText: string;
  sending: boolean;
  endRef: RefObject<HTMLDivElement | null>;
  onInputChange: (val: string) => void;
  onSend: (e: React.FormEvent) => void;
};

export function ChatWindow({
  selectedPhone, activeContact, messages, loadingChat,
  inputText, sending, endRef, onInputChange, onSend,
}: Props) {
  if (!selectedPhone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--cream-muted)] opacity-60 p-8 text-center bg-[url('/noise.png')]">
        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium text-gray-900">WhatsApp Meta Control Panel</p>
        <p className="text-sm mt-2 max-w-sm">
          Select a conversation from the sidebar to view chat history or send a direct text message via the official Graph API.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 relative">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{activeContact?.user?.name || "Student"}</h3>
            <span className="text-xs text-[var(--cream-muted)] flex items-center gap-1 font-mono">
              <Phone className="w-3 h-3" /> {selectedPhone}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingChat ? (
          <div className="h-full flex items-center justify-center text-sm text-[var(--cream-muted)] opacity-60">
            Loading chat history...
          </div>
        ) : (
          <>
            <div className="text-center text-xs text-gray-300 pb-4">End-to-End Meta Encrypted Gateway</div>
            {messages.map((msg) => {
              const isOutbound = msg.direction === "OUTBOUND";
              return (
                <div key={msg.id} className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isOutbound
                        ? "bg-emerald-600/90 text-white rounded-tr-sm border border-emerald-500/30"
                        : "bg-gray-100 text-[var(--cream)] rounded-tl-sm border border-gray-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOutbound ? "text-emerald-400/70" : "text-[var(--cream-muted)]/60"}`}>
                    <Clock className="w-2.5 h-2.5" />
                    {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                    {isOutbound && (
                      <span className="ml-1 capitalize font-medium opacity-80 backdrop-blur-sm px-1 rounded-sm bg-gray-50">
                        {msg.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={onSend} className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type a WhatsApp message..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-sm text-[var(--cream)] placeholder:text-gray-300 focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="w-12 h-12 rounded-full bg-[var(--accent)] text-[var(--ink)] flex items-center justify-center hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 shadow-md"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
        <div className="text-[10px] text-gray-300 mt-2 text-center">
          Notice: Standard Meta Business API rules apply. Unsolicited outbound messages outside 24h window must use Pre-approved Templates.
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { 
  MessageSquare, 
  Mail, 
  Calendar, 
  UserCircle 
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminSupportTickets() {
  const tickets = await prisma.leadSubmission.findMany({
    where: { source: "Support Contact Form" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-[var(--cream)]">
          <MessageSquare className="w-8 h-8 text-[var(--wood)]" />
          Support Tickets
        </h1>
        <p className="text-[var(--cream)]/60 text-lg">
          Messages sent by students and visitors via the Support & Contact page.
        </p>
      </div>

      {/* Stats/Overview */}
      <div className="bg-[var(--ink)]/40 border border-[var(--wood)]/20 p-6 rounded-3xl flex items-center gap-4">
        <div className="w-14 h-14 bg-[var(--wood)]/20 rounded-2xl flex items-center justify-center border border-[var(--wood)]/30">
          <Mail className="w-7 h-7 text-[var(--accent)]" />
        </div>
        <div>
          <h2 className="text-4xl font-black text-[var(--cream)]">{tickets.length}</h2>
          <p className="text-[var(--cream)]/60 font-medium">Total Messages Received</p>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-6">
        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-[var(--ink)]/40 border border-[var(--wood)]/20 rounded-3xl">
            <MessageSquare className="w-12 h-12 text-[var(--wood)]/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[var(--cream)]/60">No Support Tickets Yet</h3>
            <p className="text-[var(--cream)]/40">When someone submits the contact form, it will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((ticket) => {
              const data = ticket.data as any; // { name, email, subject, message }
              return (
                <div 
                  key={ticket.id} 
                  className="bg-[var(--ink)] border border-[var(--wood)]/20 rounded-2xl p-6 shadow-sm hover:shadow-[0_4px_24px_rgba(139,115,85,0.15)] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-[var(--cream)] break-words">
                        {data?.subject || "No Subject"}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--wood)] bg-[var(--wood)]/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(ticket.createdAt).toLocaleDateString("en-IN", { 
                          day: "2-digit", 
                          month: "short", 
                          year: "numeric" 
                        })}
                      </div>
                    </div>

                    <div className="p-4 bg-[var(--cream)]/5 rounded-xl text-[var(--cream)]/80 text-sm italic border border-[var(--wood)]/10">
                      "{data?.message || "No message content provided."}"
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--wood)]/10 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[var(--cream)]/70">
                      <UserCircle className="w-4 h-4 text-[var(--wood)]" /> 
                      <span className="font-semibold">{data?.name || "Unknown Sender"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--cream)]/70">
                      <Mail className="w-4 h-4 text-[var(--wood)]" /> 
                      <a href={`mailto:${data?.email}`} className="text-[var(--accent)] hover:text-[var(--wood)] transition-colors line-clamp-1">
                        {data?.email || "No Email"}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

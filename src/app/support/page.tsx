"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Mail, ShieldCheck, Clock, Send, MessageSquare, Loader2 } from "lucide-react";

export default function SupportPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      
      setSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--cream)] selection:bg-[var(--accent)]/30">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        {/* Header Section */}
        <div className="text-center mb-16 space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-[0_0_12px_rgba(154,130,100,0.1)]">
            How Can We <span className="text-[var(--wood)] italic pr-2">Help?</span>
          </h1>
          <p className="text-[var(--cream)]/60 max-w-2xl mx-auto text-lg md:text-xl font-light">
            Whether you have a question about the Cyber Library, Google Meet integrations, or your virtual study room, our team is ready to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Contact Details Column */}
          <div className="space-y-8">
            <div className="bg-[var(--ink)]/40 border border-[var(--wood)]/20 p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-[var(--wood)]" /> 
                Contact Details
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-[var(--cream)]/5 rounded-2xl border border-[var(--wood)]/10 hover:border-[var(--wood)]/30 transition-colors">
                  <Mail className="w-6 h-6 text-[var(--wood)] shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-lg">Email Support</h4>
                    <p className="text-[var(--cream)]/60 text-sm mt-1 mb-2">For general inquiries and technical assistances.</p>
                    <a href="mailto:support@cyberlib.in" className="text-[var(--accent)] hover:text-[var(--wood)] font-bold tracking-wide transition-colors">
                      support@cyberlib.in
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[var(--cream)]/5 rounded-2xl border border-[var(--wood)]/10 hover:border-[var(--wood)]/30 transition-colors">
                  <Clock className="w-6 h-6 text-[var(--wood)] shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-lg">Response Time</h4>
                    <p className="text-[var(--cream)]/60 text-sm mt-1">We aim to respond to all inquiries within 24 hours during working days.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[var(--cream)]/5 rounded-2xl border border-[var(--wood)]/10 hover:border-[var(--wood)]/30 transition-colors">
                  <ShieldCheck className="w-6 h-6 text-[var(--wood)] shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-lg">Privacy Guaranteed</h4>
                    <p className="text-[var(--cream)]/60 text-sm mt-1">We respect your privacy. Your information will only be used to resolve your support ticket.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="bg-[var(--ink)]/40 border border-[var(--wood)]/20 p-8 md:p-10 rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden">
            {/* Ambient Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--wood)]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <h3 className="text-2xl font-bold mb-8">Send a Message</h3>

            {success ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-[var(--wood)]/20 flex items-center justify-center border border-[var(--wood)]/50">
                  <ShieldCheck className="w-10 h-10 text-[var(--accent)]" />
                </div>
                <h4 className="text-2xl font-bold mt-4">Message Sent!</h4>
                <p className="text-[var(--cream)]/60">Thank you for reaching out. Our support team will review your message and reply via email shortly.</p>
                <button 
                  onClick={() => setSuccess(false)}
                  className="mt-6 px-6 py-2 bg-[var(--cream)]/10 hover:bg-[var(--cream)]/20 rounded-full font-medium transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold tracking-wide text-[var(--cream)]/80">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="John Doe"
                      className="w-full bg-[var(--cream)]/5 border border-[var(--wood)]/20 rounded-xl px-4 py-3 placeholder:text-[var(--cream)]/20 outline-none focus:border-[var(--wood)] focus:ring-1 focus:ring-[var(--wood)] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold tracking-wide text-[var(--cream)]/80">Email Address</label>
                    <input 
                      required 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="john@example.com"
                      className="w-full bg-[var(--cream)]/5 border border-[var(--wood)]/20 rounded-xl px-4 py-3 placeholder:text-[var(--cream)]/20 outline-none focus:border-[var(--wood)] focus:ring-1 focus:ring-[var(--wood)] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold tracking-wide text-[var(--cream)]/80">Subject</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="How can we help?"
                    className="w-full bg-[var(--cream)]/5 border border-[var(--wood)]/20 rounded-xl px-4 py-3 placeholder:text-[var(--cream)]/20 outline-none focus:border-[var(--wood)] focus:ring-1 focus:ring-[var(--wood)] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold tracking-wide text-[var(--cream)]/80">Message</label>
                  <textarea 
                    required 
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Type your message here..."
                    className="w-full bg-[var(--cream)]/5 border border-[var(--wood)]/20 rounded-xl px-4 py-3 placeholder:text-[var(--cream)]/20 outline-none focus:border-[var(--wood)] focus:ring-1 focus:ring-[var(--wood)] transition-all resize-none"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-[var(--wood)] to-[var(--accent)] hover:from-[var(--accent)] hover:to-[var(--wood)] text-[var(--ink)] font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-[0_0_20px_rgba(154,130,100,0.3)] hover:shadow-[0_0_30px_rgba(154,130,100,0.5)]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Message <Send className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

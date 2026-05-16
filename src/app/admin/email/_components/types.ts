export type EmailTemplate = {
  id: string;
  purpose: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
};

export type EmailDraft = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  createdAt: string;
};

export type EmailLog = {
  id: string;
  resendId: string | null;
  toEmail: string;
  toName: string | null;
  subject: string;
  purpose: string;
  status: "SENT" | "DELIVERED" | "OPENED" | "BOUNCED" | "FAILED";
  errorMessage: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  createdAt: string;
};

export type EmailSignature = {
  id: string;
  name: string;
  html: string;
  isDefault: boolean;
  createdAt: string;
};

export const TEMPLATE_PURPOSES = [
  { id: "OTP_VERIFY",       label: "Verification OTP",       vars: ["{{code}}", "{{name}}"] },
  { id: "OTP_RESET",        label: "Password Reset OTP",     vars: ["{{code}}", "{{name}}"] },
  { id: "MAGIC_LINK_VERIFY",label: "Email Verify Link",      vars: ["{{name}}", "{{verify_url}}"] },
  { id: "SUPPORT_REPLY",    label: "Support Reply",          vars: ["{{name}}", "{{message}}"] },
] as const;

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  SENT:      { label: "Sent",      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  DELIVERED: { label: "Delivered", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  OPENED:    { label: "Opened",    color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  BOUNCED:   { label: "Bounced",   color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  FAILED:    { label: "Failed",    color: "text-red-700",     bg: "bg-red-50 border-red-200" },
};

/** Parse User-Agent to get device type: MOBILE | TABLET | LAPTOP | DESKTOP */
export function getDeviceType(userAgent: string | null): "MOBILE" | "TABLET" | "LAPTOP" | "DESKTOP" {
  if (!userAgent || !userAgent.length) return "DESKTOP";
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk|kindle|(android(?!.*mobile))/.test(ua)) return "TABLET";
  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|windows phone|android.*mobile/.test(ua)) return "MOBILE";
  return "LAPTOP"; // treat unknown as laptop; could use DESKTOP for older browsers
}

export function getDeviceLabel(type: string): string {
  switch (type) {
    case "MOBILE": return "Mobile";
    case "TABLET": return "Tablet";
    case "LAPTOP": return "Laptop";
    case "DESKTOP": return "Desktop";
    default: return type;
  }
}

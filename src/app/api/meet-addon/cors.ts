import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cyberlib.in";

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (origin.startsWith("https://meet.google") || origin.startsWith("http://meet.google")) return true;
  if (origin === SITE_URL) return true;
  if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost")) return true;
  return false;
}

export function getMeetAddonCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "";
  const allow = isAllowedOrigin(origin) ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function withCors(response: NextResponse, request: Request): NextResponse {
  const h = getMeetAddonCorsHeaders(request);
  const res = new NextResponse(response.body, {
    status: response.status,
    headers: { ...response.headers, ...h },
  });
  return res;
}

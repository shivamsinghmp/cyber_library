import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { authConfig } from "@/auth.config";

const PROTECTED_PREFIXES = ["/admin", "/staff", "/dashboard", "/affiliate", "/author", "/api/author", "/api/admin", "/api/dashboard", "/api/staff", "/api/student", "/api/study", "/api/profile", "/api/user", "/api/feedback", "/api/rewards", "/api/razorpay", "/api/coupon", "/api/subscription"];

const PUBLIC_API_EXCEPTIONS = ["/api/study/leaderboard", "/api/public"];

function isProtected(pathname: string): boolean {
  if (PUBLIC_API_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return false;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
      }),
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
    })
  : null;

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(request: NextRequest & { auth: { user?: { role?: string } } | null }) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/") && ratelimit) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? "127.0.0.1";
    const { success, limit, remaining, reset } = await ratelimit.limit(`ratelimit_api_${ip}`);
    if (!success) {
      console.warn(`[SECURITY] Rate Limit Exceeded for IP: ${ip}`);
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  if (!isProtected(pathname)) return applySecurityHeaders(NextResponse.next());

  const session = request.auth;

  if (!session?.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const role = session.user.role || "STUDENT";

  if (pathname.startsWith("/dashboard")) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "EMPLOYEE") return NextResponse.redirect(new URL("/staff", request.url));
    if (role === "INFLUENCER") return NextResponse.redirect(new URL("/affiliate", request.url));
    if (role === "AUTHOR") return NextResponse.redirect(new URL("/author", request.url));
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN" && role !== "EMPLOYEE") return NextResponse.redirect(new URL("/dashboard", request.url));
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/staff")) {
    if (role !== "EMPLOYEE" && role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", request.url));
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/affiliate")) {
    if (role !== "INFLUENCER") return NextResponse.redirect(new URL("/dashboard", request.url));
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/author")) {
    if (role !== "AUTHOR") return NextResponse.redirect(new URL("/dashboard", request.url));
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN" && role !== "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api/author")) {
    if (role !== "AUTHOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return applySecurityHeaders(NextResponse.next());
  }

  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/staff",
    "/staff/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/affiliate",
    "/affiliate/:path*",
    "/author",
    "/author/:path*",
    "/api/author",
    "/api/author/:path*",
    "/api/admin/:path*",
    "/api/dashboard/:path*",
    "/api/staff/:path*",
    "/api/student/:path*",
    "/api/study/:path*",
    "/api/profile/:path*",
    "/api/user/:path*",
    "/api/feedback/:path*",
    "/api/rewards/:path*",
    "/api/razorpay/:path*",
    "/api/coupon/:path*",
    "/api/subscription/:path*",
    "/api/youtube/:path*",
  ],
};

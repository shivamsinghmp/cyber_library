import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { authConfig } from "@/auth.config";

// Paths that get a stricter rate limit (5 per 15 min per IP)
const AUTH_WRITE_PATHS = [
  "/api/auth/signup",
  "/api/auth/verify-email",
];

const PROTECTED_PREFIXES = ["/admin", "/staff", "/dashboard", "/affiliate", "/author", "/api/author", "/api/admin", "/api/dashboard", "/api/staff", "/api/student", "/api/study", "/api/profile", "/api/user", "/api/feedback", "/api/rewards", "/api/razorpay", "/api/coupon", "/api/subscription"];

const PUBLIC_API_EXCEPTIONS = ["/api/study/leaderboard", "/api/public"];

function isProtected(pathname: string): boolean {
  if (PUBLIC_API_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return false;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const _redisClient = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN || "" })
  : null;

// Global API rate limit: 100 requests / 60 s per IP
const ratelimit = _redisClient
  ? new Ratelimit({ redis: _redisClient, limiter: Ratelimit.slidingWindow(100, "1 m"), analytics: true })
  : null;

// Strict limit for auth write endpoints: 5 requests / 15 min per IP
const authWriteRatelimit = _redisClient
  ? new Ratelimit({ redis: _redisClient, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "@upstash/ratelimit/auth-write" })
  : null;

// Login-specific limit: 10 attempts / 15 min per IP (brute-force protection)
const loginRatelimit = _redisClient
  ? new Ratelimit({ redis: _redisClient, limiter: Ratelimit.slidingWindow(10, "15 m"), prefix: "@upstash/ratelimit/login" })
  : null;

// ── Allowed origins for CSRF origin check ─────────────────────────────────────
// Computed from NEXT_PUBLIC_SITE_URL. Same-origin requests are always allowed.
// Webhooks (/api/webhooks/*) and meet-addon routes are excluded — they handle
// their own CORS or receive requests from trusted external servers (no Origin).
const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "https://cyberlib.in").replace(/\/$/, "");
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  SITE_ORIGIN,
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
]);

// Paths exempt from the Origin check (handle their own CORS or are webhook receivers)
const ORIGIN_CHECK_EXEMPT = [
  "/api/webhooks/",    // Meta / Resend webhooks — no browser Origin header
  "/api/auth/",        // NextAuth handles its own CSRF protection
  "/api/meet-addon/",  // Google Meet addon — has dedicated CORS logic
  "/api/health",       // Public health probe
];

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// NOTE: Content-Security-Policy is intentionally NOT set here.
// next.config.ts already has a comprehensive, route-specific CSP (including a
// separate policy for /meet-addon that allows Google Meet framing). If we set
// CSP in middleware it would override the config CSP for all matched routes.
// X-XSS-Protection is also intentionally omitted — deprecated in modern browsers
// and harmful in IE; CSP provides better XSS coverage.
const SECURITY_HEADERS: Record<string, string> = {
  // DENY for all authenticated/admin routes — none of them need to be iframe'd
  "X-Frame-Options":           "DENY",
  "X-Content-Type-Options":    "nosniff",
  "Referrer-Policy":           "strict-origin-when-cross-origin",
  "Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control":    "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  return res;
}

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(request: NextRequest & { auth: { user?: { role?: string } } | null }) {
  const pathname = request.nextUrl.pathname;

  // ── CSRF: Origin header check for state-changing API requests ───────────────
  // Defense-in-depth: SameSite=Lax cookies are the primary protection; this is
  // the second layer. If Origin is present and not in the allowed list, reject.
  // We only check when Origin is present — server-to-server callers (webhooks)
  // don't send Origin, and those paths are excluded anyway.
  if (
    pathname.startsWith("/api/") &&
    STATE_CHANGING_METHODS.has(request.method) &&
    !ORIGIN_CHECK_EXEMPT.some((p) => pathname.startsWith(p))
  ) {
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      console.warn(`[security] CSRF origin blocked — origin: ${origin}, path: ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: "FORBIDDEN", message: "Cross-origin request not allowed." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ── Login brute-force protection ────────────────────────────────────────────
  if (pathname === "/api/auth/callback/credentials" && loginRatelimit) {
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? "127.0.0.1";
      const { success, reset } = await loginRatelimit.limit(`login:${ip}`);
      if (!success) {
        console.warn(`[security] Login rate limit hit — IP: ${ip}`);
        return new NextResponse(
          JSON.stringify({ error: "TOO_MANY_ATTEMPTS", message: "Too many login attempts. Please try again in 15 minutes." }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.round((reset - Date.now()) / 1000)) } }
        );
      }
    } catch (e) {
      console.warn("[security] Login ratelimit unavailable, skipping:", e);
    }
  }

  // ── Strict rate limit for auth write operations (signup / OTP verify) ──────
  if (AUTH_WRITE_PATHS.some(p => pathname === p || pathname.startsWith(p + "/")) && authWriteRatelimit) {
    try {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? "127.0.0.1";
      const { success, reset } = await authWriteRatelimit.limit(`auth-write:${ip}`);
      if (!success) {
        console.warn(`[security] Auth-write rate limit hit — IP: ${ip}, path: ${pathname}`);
        return new NextResponse(
          JSON.stringify({ error: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again in 15 minutes." }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.round((reset - Date.now()) / 1000)) } }
        );
      }
    } catch (e) {
      console.warn("[security] Auth-write ratelimit unavailable, skipping:", e);
    }
  }

  if (pathname.startsWith("/api/") && ratelimit) {
    try {
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
    } catch (e) {
      console.warn("[security] API ratelimit unavailable, skipping:", e);
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
    if (role === "ADMIN") {
      // Allow admin through only when in "View as Student" mode
      const asvParam  = request.nextUrl.searchParams.get("_admin_view");
      const asvCookie = request.cookies.get("__asv")?.value;

      if (asvParam) {
        // First hit with token in URL: set cookie, strip param, redirect to clean URL
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete("_admin_view");
        const res = NextResponse.redirect(cleanUrl);
        res.cookies.set("__asv", asvParam, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge:   900,  // 15 min — matches token TTL
          path:     "/",
        });
        return applySecurityHeaders(res);
      }

      if (asvCookie) {
        // Cookie exists — full HMAC verification happens in dashboard layout
        return applySecurityHeaders(NextResponse.next());
      }

      return NextResponse.redirect(new URL("/admin", request.url));
    }
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
    // Auth write endpoints — only here for the strict rate limiter; no session needed
    "/api/auth/signup",
    "/api/auth/verify-email",
    // Login endpoint — only here for the login brute-force rate limiter
    "/api/auth/callback/credentials",
    // Additional state-changing routes covered by CSRF origin check
    "/api/trial/:path*",
    "/api/ai/:path*",
    "/api/slots/:path*",
    "/api/support/:path*",
  ],
};

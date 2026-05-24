import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const PROTECTED_PREFIXES = ["/admin", "/staff", "/dashboard", "/affiliate", "/author", "/api/author", "/api/admin", "/api/dashboard", "/api/staff", "/api/student", "/api/study", "/api/profile", "/api/user", "/api/feedback", "/api/rewards"];

const PUBLIC_API_EXCEPTIONS = ["/api/study/leaderboard"];

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

export async function middleware(request: NextRequest) {
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

  if (!isProtected(pathname)) return NextResponse.next();

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // NextAuth v5 uses "__Secure-authjs.session-token" on HTTPS and
  // "authjs.session-token" on HTTP. Without secureCookie:true, getToken()
  // defaults to the HTTP name and silently returns null on production HTTPS.
  const secureCookie = request.url.startsWith("https://");
  const token = await getToken({ req: request, secret, secureCookie });

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const role = (token.role as string) || "STUDENT";

  if (pathname.startsWith("/dashboard")) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "EMPLOYEE") return NextResponse.redirect(new URL("/staff", request.url));
    if (role === "INFLUENCER") return NextResponse.redirect(new URL("/affiliate", request.url));
    if (role === "AUTHOR") return NextResponse.redirect(new URL("/author", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN" && role !== "EMPLOYEE") return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/staff")) {
    if (role !== "EMPLOYEE" && role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/affiliate")) {
    if (role !== "INFLUENCER") return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/author")) {
    if (role !== "AUTHOR") return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN" && role !== "EMPLOYEE") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/author")) {
    if (role !== "AUTHOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.next();
  }

  return NextResponse.next();
}

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
  ],
};

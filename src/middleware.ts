import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/staff", "/dashboard", "/affiliate", "/author", "/api/author"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const role = (token.role as string) || "STUDENT";

  // Redirect non-students away from /dashboard to their dashboard
  if (pathname.startsWith("/dashboard")) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "EMPLOYEE") return NextResponse.redirect(new URL("/staff", request.url));
    if (role === "INFLUENCER") return NextResponse.redirect(new URL("/affiliate", request.url));
    if (role === "AUTHOR") return NextResponse.redirect(new URL("/author", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", request.url));
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

  if (pathname.startsWith("/api/author")) {
    if (role !== "AUTHOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
  ],
};

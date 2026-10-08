import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/sessionToken";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow login API and login page
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login"
  ) {
    // If user already has valid token and visits /admin/login, redirect to /admin
    if (pathname === "/admin/login") {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        const payload = await verifySessionToken(token);
        if (payload) {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 2. Protect /admin routes and /api/admin/* routes
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");

  if (isAdminPage || isAdminApi) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    let validSession = false;

    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) {
        validSession = true;
      }
    }

    if (!validSession) {
      if (isAdminApi) {
        return NextResponse.json(
          { code: 401, message: "未登录或登录状态已过期，请重新登录" },
          { status: 401 }
        );
      }

      const loginUrl = new URL("/admin/login", request.url);
      const redirectTarget = pathname + request.nextUrl.search;
      if (redirectTarget && redirectTarget !== "/admin") {
        loginUrl.searchParams.set("redirect", redirectTarget);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

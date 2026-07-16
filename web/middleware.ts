import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

const PROTECTED = ["/dashboard", "/routes", "/users", "/incidents", "/trips"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get(SESSION_COOKIE)?.value;

  let hasSession = false;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { access_token?: string };
      hasSession = Boolean(parsed?.access_token);
    } catch {
      hasSession = false;
    }
  }

  const isProtected = PROTECTED.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/dashboard" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/routes/:path*", "/users/:path*", "/incidents/:path*", "/trips/:path*", "/login"],
};

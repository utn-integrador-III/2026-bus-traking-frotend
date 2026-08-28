import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

const PROTECTED = [
  "/dashboard",
  "/routes",
  "/stops",
  "/trips",
  "/telemetry",
  "/users",
  "/incidents",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );

  if (isProtected && !hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/dashboard" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/routes/:path*",
    "/stops/:path*",
    "/trips/:path*",
    "/telemetry/:path*",
    "/users/:path*",
    "/incidents/:path*",
  ],
};

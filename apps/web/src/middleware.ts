import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n } from "./lib/i18n-config";

const PUBLIC_PATHS = new Set(["/login"]);
const PUBLIC_PREFIXES = ["/certificates/verify/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if pathname has a locale
  const pathnameHasLocale = i18n.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // 2. Redirect if there is no locale
  if (!pathnameHasLocale) {
    const locale = request.cookies.get("NEXT_LOCALE")?.value || i18n.defaultLocale;
    const url = new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url);
    // Preserve search params
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // 3. Auth logic
  // Get locale from pathname to strip it for auth checks
  const locale = pathname.split("/")[1];
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
  
  const response = NextResponse.next();

  // 4. Persist locale in cookie if it changed
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale !== locale) {
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  const token = request.cookies.get("access_token")?.value;
  const isPublic =
    PUBLIC_PATHS.has(pathnameWithoutLocale) ||
    PUBLIC_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p));

  if (!token && !isPublic) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("from", pathnameWithoutLocale);
    return NextResponse.redirect(url);
  }
  
  if (token && isPublic) {
    const url = new URL(`/${locale}/dashboard`, request.url);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|logos/|uploads/).*)" ],
};

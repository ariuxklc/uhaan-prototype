import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

/**
 * Every page lives under /mn or /en. Requests without a locale always go to
 * Mongolian; visitors switch to English with the language link.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isLocale(pathname.split("/")[1])) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes, generated icons and anything that looks like a file.
  matcher: ["/((?!_next|api|apple-icon|icon|.*\\..*).*)"],
};

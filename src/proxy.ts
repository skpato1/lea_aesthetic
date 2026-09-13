import { NextRequest, NextResponse } from "next/server";
import { isLocale, localizePath, stripLocale } from "@/lib/i18n/config";

const legacy: Record<string, string> = {
  "/index.html": "/",
  "/about": "/agence",
  "/services": "/interventions",
  "/treatments": "/interventions",
  "/doctors": "/chirurgien",
  "/appointment": "/contact",
  "/privacy": "/informations-legales",
};
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const segment = url.pathname.split("/")[1];
  const locale = isLocale(segment) ? segment : "fr";
  const path = stripLocale(url.pathname);
  const headers = new Headers(request.headers);
  // Never trust a locale header supplied by the visitor.
  headers.set("x-lea-locale", locale);
  if (isLocale(segment)) {
    if (
      segment === "fr" ||
      /^\/(admin|api|media|images|fonts|_next)(\/|$)/.test(path)
    ) {
      url.pathname = path;
      return NextResponse.redirect(url, 308);
    }
    if (legacy[path]) {
      url.pathname = localizePath(legacy[path], locale);
      return NextResponse.redirect(url, 308);
    }
    url.pathname = path;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: [
    "/((?!_next|api|media|images|fonts|icon.png|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

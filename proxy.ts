import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Root domain for the platform. Subdomains of this domain are treated as
 * studio slugs and rewritten to /studio/[slug]/...
 *
 * Set NEXT_PUBLIC_ROOT_DOMAIN in .env.local for production.
 * Defaults to "localhost:3000" for local dev.
 */
const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"

/**
 * Hostnames that should NOT be treated as studio subdomains.
 * Requests to these are passed through to the normal Next.js routing.
 */
const BYPASS_HOSTS = new Set([
  ROOT_DOMAIN,           // bare domain (shutterstudio.com)
  `www.${ROOT_DOMAIN}`,  // www prefix
  "localhost",
  "localhost:3000",
  "127.0.0.1",
  "127.0.0.1:3000",
  "192.168.1.5",
  "192.168.1.5:3000",
])

/**
 * Path prefixes that should never be rewritten,
 * even when accessed from a studio subdomain.
 */
const BYPASS_PATHS = [
  "/_next",
  "/api",
  "/favicon.ico",
  "/images",
  "/icon",
  "/apple-icon",
]

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone()
  const hostname = req.headers.get("host") || ""

  // 1. Skip rewriting for the main domain, www, and localhost
  if (BYPASS_HOSTS.has(hostname)) {
    return NextResponse.next()
  }

  // 2. Skip internal / static asset paths
  if (BYPASS_PATHS.some((prefix) => url.pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // 3. Extract subdomain
  //    hostname = "mystudio.shutterstudio.com"  →  subdomain = "mystudio"
  //    hostname = "mystudio.localhost:3000"      →  subdomain = "mystudio"
  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, "").split(".")[0]

  // Safety: if nothing was extracted, pass through
  if (!subdomain || subdomain === hostname) {
    return NextResponse.next()
  }

  // 4. Rewrite the URL so Next.js serves /studio/[slug]/...
  //    e.g. mystudio.shutterstudio.com/booking  →  /studio/mystudio/booking
  url.pathname = `/studio/${subdomain}${url.pathname}`

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

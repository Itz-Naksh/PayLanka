import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

// First line of defence: redirects logged-out users to /login and blocks roles
// from pages they can't open (see `authorized` in auth.config.ts).
// Every page, server action and route handler ALSO checks on its own — the
// proxy is a convenience, not the only lock.
const { auth } = NextAuth(authConfig);

// Called with a raw request, Auth.js runs the `authorized` callback and returns
// the redirect/next response. Its public types don't list this overload.
const runAuth = auth as unknown as (request: NextRequest, event: NextFetchEvent) => Promise<Response>;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return runAuth(request, event);
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};

import type { NextAuthConfig } from "next-auth";
import { canAccessPath, homePathFor } from "@/lib/auth/permissions";

/**
 * Lightweight Auth.js config shared by the proxy (route guard) and the full
 * auth setup in `auth.ts`. It deliberately has no database or bcrypt imports,
 * so the proxy that runs on every request stays small and fast.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  // Credentials login requires JWT sessions (no session table needed).
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // one working day
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present right after login; copy what we need into the token.
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.employeeId = user.employeeId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.employeeId = token.employeeId;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const path = nextUrl.pathname;

      // Clears a stale cookie; must work whether or not the cookie looks valid.
      if (path === "/session-ended") return true;
      if (path === "/login") {
        return user ? Response.redirect(new URL(homePathFor(user.role), nextUrl)) : true;
      }
      if (!user) return false; // Auth.js redirects to /login?callbackUrl=...
      if (!canAccessPath(user.role, path)) {
        return Response.redirect(new URL("/forbidden", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

import { signOut } from "@/auth";

/**
 * Where we send someone whose session cookie is still valid but whose account
 * no longer is (deactivated, deleted, or the database was re-seeded).
 *
 * Pages can't delete cookies, so without this the proxy (which only sees the
 * cookie) and the page (which checks the database) would bounce the browser
 * between /login and /dashboard forever. Signing out clears the cookie first.
 */
export async function GET() {
  await signOut({ redirectTo: "/login?reason=session-ended" });
}

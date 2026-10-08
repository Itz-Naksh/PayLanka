import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/demo";
import { seedDatabase } from "@/server/demo/seed-data";

// Re-seeding takes a few seconds; allow up to a minute on Vercel.
export const maxDuration = 60;

function authorized(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Constant-time comparison, so the secret can't be guessed from response timing.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Nightly reset of the PUBLIC DEMO (scheduled in vercel.json). Vercel Cron
 * calls it with `Authorization: Bearer $CRON_SECRET`.
 * It refuses to run unless DEMO_MODE="true", so a real company's data can
 * never be wiped by it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (!authorized(request, secret)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  if (!isDemoMode()) {
    return Response.json({ error: "Refusing to reset: DEMO_MODE is not \"true\"." }, { status: 403 });
  }

  const started = Date.now();
  const result = await seedDatabase(prisma, () => {});
  return Response.json({ ok: true, runs: result.runs, employees: result.employees, ms: Date.now() - started });
}

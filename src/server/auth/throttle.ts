import "server-only";
import { prisma } from "@/lib/db";

/**
 * Brute-force protection for sign-in.
 *
 * After 5 wrong passwords for one email (or 20 from one IP address) within
 * 15 minutes, further attempts are refused until the window passes. A correct
 * password resets the email's count. The limits are stored in the database,
 * so they hold across serverless instances.
 */
export const LOCK_WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;
const KEEP_DAYS = 30;

export function clientIp(request: Request | undefined): string | null {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request?.headers.get("x-real-ip") || null;
}

export async function isLockedOut(email: string, ip: string | null): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000);
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { email, success: true, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: { email, success: false, createdAt: { gt: lastSuccess?.createdAt ?? windowStart } },
    }),
    ip ? prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: windowStart } } }) : 0,
  ]);
  return emailFailures >= MAX_FAILURES_PER_EMAIL || ipFailures >= MAX_FAILURES_PER_IP;
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
  await prisma.loginAttempt.create({ data: { email, ip, success } });
  if (success) {
    // Housekeeping: old attempts are no longer needed.
    await prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000) } },
    });
  }
}

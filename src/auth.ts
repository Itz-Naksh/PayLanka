import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { demoAccountFor, isDemoMode } from "@/lib/demo";
import { loginSchema } from "@/lib/validation/auth";
import { clientIp, isLockedOut, recordLoginAttempt } from "@/server/auth/throttle";

/** Thrown when an email or IP has too many recent failed sign-ins. */
export class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

// Compared against when the email doesn't exist, so a wrong email takes as
// long as a wrong password (prevents discovering valid emails by timing).
const DUMMY_HASH = "$2b$10$c.DCQNlppY7mP.cgUKt/tONf96YT.TU4Mtdrm1L9jGhOlC8fVhCay";

type DbUser = { id: string; name: string; email: string; role: "ADMIN" | "HR" | "EMPLOYEE"; employeeId: string | null };

const toSessionUser = (user: DbUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  employeeId: user.employeeId,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Normal login: email + password.
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const ip = clientIp(request);
        if (await isLockedOut(email, ip)) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        const ok = Boolean(user && user.isActive && valid);
        await recordLoginAttempt(email, ip, ok);
        if (!user || !ok) return null;

        return toSessionUser(user);
      },
    }),
    // One-click demo login. Only works while DEMO_MODE="true", and only ever
    // signs in as one of the fixed demo accounts — never a real user.
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: { role: {} },
      async authorize(raw) {
        if (!isDemoMode()) return null;
        const account = demoAccountFor(String(raw?.role ?? ""));
        if (!account) return null;

        const user = await prisma.user.findUnique({ where: { email: account.email } });
        if (!user || !user.isActive) return null;
        return toSessionUser(user);
      },
    }),
  ],
});

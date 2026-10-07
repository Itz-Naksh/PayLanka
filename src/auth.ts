import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";

// Compared against when the email doesn't exist, so a wrong email takes as
// long as a wrong password (prevents discovering valid emails by timing).
const DUMMY_HASH = "$2b$10$c.DCQNlppY7mP.cgUKt/tONf96YT.TU4Mtdrm1L9jGhOlC8fVhCay";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.isActive || !valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
});

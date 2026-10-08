import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasPermission, type Permission, type Role } from "./permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
  mustChangePassword: boolean;
};

/**
 * The logged-in user, re-read from the database once per request.
 *
 * Why re-read instead of trusting the session token? A JWT stays valid until it
 * expires, so without this a deactivated user or a role change would only take
 * effect hours later. `cache()` makes repeated calls in one request free.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      isActive: true,
      mustChangePassword: true,
    },
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    mustChangePassword: user.mustChangePassword,
  };
});

/** For pages: redirect to /login or /forbidden instead of rendering. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // A temporary password must be replaced before anything else.
  if (user.mustChangePassword) redirect("/change-password");
  if (!hasPermission(user.role, permission)) redirect("/forbidden");
  return user;
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For server actions and route handlers: throw instead of redirecting. */
export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("You are not signed in.", 401);
  if (user.mustChangePassword) {
    throw new AuthorizationError("Please change your temporary password first.", 403);
  }
  if (!hasPermission(user.role, permission)) {
    throw new AuthorizationError("You do not have permission to do that.", 403);
  }
  return user;
}

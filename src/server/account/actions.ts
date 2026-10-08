"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { errorState, parseFormData, successState, type ActionState } from "@/lib/forms/action-state";
import { changePasswordSchema } from "@/lib/validation/user";
import { DEMO_BLOCKED_MESSAGE, isLockedDemoUser } from "@/server/guard";

/**
 * Any signed-in user can change their own password — including users who are
 * forced to, which is why this doesn't go through `withPermission`.
 */
export async function changeOwnPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/session-ended");
  if (isLockedDemoUser(user)) return errorState(DEMO_BLOCKED_MESSAGE);

  const parsed = parseFormData(changePasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record || !(await bcrypt.compare(parsed.data.currentPassword, record.passwordHash))) {
    return errorState("Please fix the highlighted fields.", { currentPassword: ["Current password is incorrect"] });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
    await logAudit(tx, user, "USER_PASSWORD_CHANGED", { type: "User", id: user.id }, { email: user.email });
  });

  // First-login flow: continue into the app. Otherwise stay and confirm.
  if (user.mustChangePassword) redirect(homePathFor(user.role));
  return successState("Password changed.");
}

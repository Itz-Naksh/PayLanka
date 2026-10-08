"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { diffFields } from "@/lib/audit-diff";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { errorState, parseFormData, successState, type ActionState } from "@/lib/forms/action-state";
import { createUserSchema, resetPasswordSchema, updateUserSchema } from "@/lib/validation/user";
import { withPermission } from "@/server/guard";

const BCRYPT_COST = 10;

async function employeeLinkTaken(employeeId: string | null, excludeUserId?: string) {
  if (!employeeId) return false;
  const other = await prisma.user.findFirst({
    where: { employeeId, id: excludeUserId ? { not: excludeUserId } : undefined },
  });
  return other !== null;
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;

  const result = await withPermission("users:manage", async (actor) => {
    const parsed = parseFormData(createUserSchema, formData);
    if (!parsed.ok) return parsed.state;
    const { password, ...data } = parsed.data;

    if (await prisma.user.findUnique({ where: { email: data.email } })) {
      return errorState("Please fix the highlighted fields.", { email: ["A user with this email exists"] });
    }
    if (await employeeLinkTaken(data.employeeId)) {
      return errorState("Please fix the highlighted fields.", { employeeId: ["This employee already has a login"] });
    }

    // Passwords are only ever stored as a bcrypt hash — never in plain text.
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await prisma.$transaction(async (tx) => {
      // Temporary password: the user must replace it at first sign-in.
      const created = await tx.user.create({ data: { ...data, passwordHash, mustChangePassword: true } });
      await logAudit(tx, actor, "USER_CREATED", { type: "User", id: created.id }, {
        email: created.email,
        role: created.role,
      });
      return created;
    });
    createdId = user.id;
    revalidatePath("/settings/users");
    return successState("User created.");
  }, { blockDemo: true });

  if (createdId) redirect(`/settings/users/${createdId}?created=1`);
  return result;
}

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("users:manage", async (actor) => {
    const id = formData.get("id");
    if (typeof id !== "string" || !id) return errorState("Missing user.");
    const parsed = parseFormData(updateUserSchema, formData);
    if (!parsed.ok) return parsed.state;
    const data = parsed.data;

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) return errorState("This user no longer exists.");

    // Guard rails that stop an admin from locking everyone out.
    if (id === actor.id && (data.role !== before.role || !data.isActive)) {
      return errorState("You can't change your own role or deactivate your own account.");
    }
    const losesAdmin = before.role === "ADMIN" && before.isActive && (data.role !== "ADMIN" || !data.isActive);
    if (losesAdmin) {
      const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
      if (otherAdmins === 0) return errorState("There must always be at least one active Admin.");
    }
    if (await employeeLinkTaken(data.employeeId, id)) {
      return errorState("Please fix the highlighted fields.", { employeeId: ["This employee already has a login"] });
    }

    const changes = diffFields(before, data, ["name", "role", "isActive", "employeeId"]);
    if (Object.keys(changes).length === 0) return successState("No changes to save.");

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await logAudit(tx, actor, "USER_UPDATED", { type: "User", id }, {
        email: before.email,
        changes,
      });
    });
    revalidatePath("/settings/users");
    revalidatePath(`/settings/users/${id}`);
    return successState("User saved. Changes apply on their next page load.");
  }, { blockDemo: true });
}

export async function resetUserPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("users:manage", async (actor) => {
    const id = formData.get("id");
    if (typeof id !== "string" || !id) return errorState("Missing user.");
    const parsed = parseFormData(resetPasswordSchema, formData);
    if (!parsed.ok) return parsed.state;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorState("This user no longer exists.");

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
      // A reset also lifts any sign-in lockout from earlier wrong guesses.
      await tx.loginAttempt.deleteMany({ where: { email: user.email, success: false } });
      // Never log the password itself — only that it was reset.
      await logAudit(tx, actor, "USER_PASSWORD_RESET", { type: "User", id }, { email: user.email });
    });
    return successState("Temporary password set. Share it privately — they must change it when they next sign in.");
  }, { blockDemo: true });
}

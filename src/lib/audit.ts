import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction =
  | "SETTINGS_UPDATED"
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "EMPLOYEE_DEACTIVATED"
  | "EMPLOYEE_REACTIVATED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_RENAMED"
  | "DEPARTMENT_DELETED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_PASSWORD_RESET"
  | "USER_PASSWORD_CHANGED"
  | "PAYROLL_CREATED"
  | "PAYROLL_UPDATED"
  | "PAYROLL_SUBMITTED"
  | "PAYROLL_RETURNED"
  | "PAYROLL_APPROVED";

type Actor = { id: string; email: string };

/**
 * Write an audit entry. Pass the transaction client (`tx`) so the entry is
 * saved in the SAME transaction as the change: either both are saved or
 * neither is — you can never get a change without its audit trail.
 */
export async function logAudit(
  tx: Prisma.TransactionClient,
  actor: Actor,
  action: AuditAction,
  entity: { type: string; id: string },
  metadata?: Record<string, unknown>,
) {
  await tx.auditLog.create({
    data: {
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entityType: entity.type,
      entityId: entity.id,
      // Round-trip through JSON so Dates etc. are stored as plain JSON values.
      metadata: metadata === undefined ? undefined : (JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonObject),
    },
  });
}

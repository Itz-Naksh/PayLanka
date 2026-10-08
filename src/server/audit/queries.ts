import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { AUDIT_CATEGORIES, type AuditCategory } from "@/lib/audit-format";
import { prisma } from "@/lib/db";

export const AUDIT_PAGE_SIZE = 25;

export type AuditFilters = { category?: AuditCategory; actor?: string; page: number };

export async function listAuditEntries({ category, actor, page }: AuditFilters) {
  const prefixes = category ? ([] as string[]).concat(AUDIT_CATEGORIES[category].prefix) : [];
  const where: Prisma.AuditLogWhereInput = {
    AND: [
      prefixes.length ? { OR: prefixes.map((prefix) => ({ action: { startsWith: prefix } })) } : {},
      actor ? { actorEmail: { contains: actor.trim(), mode: "insensitive" } } : {},
    ],
  };

  const [total, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
  ]);

  // Names for the people involved (the email is stored too, in case a user is removed).
  const actorIds = [...new Set(entries.map((e) => e.actorId).filter((v): v is string => Boolean(v)))];
  const users = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const names = new Map(users.map((u) => [u.id, u.name]));

  return {
    total,
    pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    entries: entries.map((e) => ({ ...e, actorName: (e.actorId && names.get(e.actorId)) || null })),
  };
}

/** The history of one payroll run, newest first (for the run page). */
export async function runActivity(runId: string) {
  return prisma.auditLog.findMany({
    where: { entityType: "PayrollRun", entityId: runId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

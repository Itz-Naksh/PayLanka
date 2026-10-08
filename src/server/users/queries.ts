import "server-only";
import { prisma } from "@/lib/db";

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      employee: { select: { employeeNo: true } },
    },
  });
}

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, isActive: true, employeeId: true, createdAt: true },
  });
}

/** Employees that can be linked to a login: active, and not already linked (except `keepId`). */
export async function linkableEmployees(keepId?: string | null) {
  const employees = await prisma.employee.findMany({
    where: {
      OR: [{ status: "ACTIVE", user: null }, ...(keepId ? [{ id: keepId }] : [])],
    },
    orderBy: { employeeNo: "asc" },
    select: { id: true, employeeNo: true, firstName: true, lastName: true },
  });
  return employees.map((e) => ({ id: e.id, label: `${e.employeeNo} — ${e.firstName} ${e.lastName}` }));
}

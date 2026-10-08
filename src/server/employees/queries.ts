import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type EmployeeStatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

export type EmployeeFilters = {
  q?: string;
  departmentId?: string;
  status?: EmployeeStatusFilter;
};

export async function listEmployees({ q, departmentId, status = "ACTIVE" }: EmployeeFilters) {
  // Each word must match some field, so "nimal perera" finds Nimal Perera.
  const words = (q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 5);
  const where: Prisma.EmployeeWhereInput = {
    status: status === "ALL" ? undefined : status,
    departmentId: departmentId || undefined,
    AND: words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" } },
        { lastName: { contains: word, mode: "insensitive" } },
        { employeeNo: { contains: word, mode: "insensitive" } },
        { nic: { contains: word, mode: "insensitive" } },
        { designation: { contains: word, mode: "insensitive" } },
      ],
    })),
  };

  return prisma.employee.findMany({
    where,
    orderBy: { employeeNo: "asc" },
    include: { department: { select: { name: true } }, allowances: { select: { amountCents: true } } },
  });
}

export async function getEmployee(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      department: { select: { name: true } },
      allowances: { orderBy: { name: "asc" } },
      user: { select: { email: true, isActive: true } },
    },
  });
}

export async function listDepartments() {
  return prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: { where: { status: "ACTIVE" } } } } },
  });
}

/** Suggest the next number in the EMP### sequence for the "new employee" form. */
export async function suggestEmployeeNo(): Promise<string> {
  const rows = await prisma.employee.findMany({
    where: { employeeNo: { startsWith: "EMP" } },
    select: { employeeNo: true },
  });
  const highest = rows.reduce((max, { employeeNo }) => {
    const n = Number(employeeNo.slice(3));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return `EMP${String(highest + 1).padStart(3, "0")}`;
}

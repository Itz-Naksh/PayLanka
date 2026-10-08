"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { diffFields } from "@/lib/audit-diff";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { fromDateInputValue } from "@/lib/format";
import { errorState, parseFormData, successState, type ActionState } from "@/lib/forms/action-state";
import type { FieldErrors } from "@/lib/forms/form-data";
import { departmentSchema, employeeSchema } from "@/lib/validation/employee";
import { withPermission } from "@/server/guard";

const TRACKED = [
  "employeeNo",
  "firstName",
  "lastName",
  "nic",
  "epfNo",
  "departmentId",
  "designation",
  "joinDate",
  "bankName",
  "bankBranch",
  "accountNo",
  "basicSalaryCents",
] as const;

type AllowanceRow = { name: string; amountCents: number; epfLiable: boolean };

/** Comparable form of an allowance list: only the meaningful fields, in a stable order. */
const simplifyAllowances = (rows: AllowanceRow[]): AllowanceRow[] =>
  rows
    .map(({ name, amountCents, epfLiable }) => ({ name, amountCents, epfLiable }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.amountCents - b.amountCents);

/** Employee no., NIC and EPF no. must each belong to only one employee. */
async function findDuplicates(
  data: { employeeNo: string; nic: string; epfNo: string | null },
  excludeId: string | null,
): Promise<FieldErrors | null> {
  const others = await prisma.employee.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      OR: [{ employeeNo: data.employeeNo }, { nic: data.nic }, ...(data.epfNo ? [{ epfNo: data.epfNo }] : [])],
    },
    select: { employeeNo: true, nic: true, epfNo: true },
  });
  if (others.length === 0) return null;

  const errors: FieldErrors = {};
  for (const other of others) {
    if (other.employeeNo === data.employeeNo) errors.employeeNo = ["This employee number is already used"];
    if (other.nic === data.nic) errors.nic = [`This NIC is already registered to ${other.employeeNo}`];
    if (data.epfNo && other.epfNo === data.epfNo) errors.epfNo = [`This EPF number belongs to ${other.employeeNo}`];
  }
  return errors;
}

function readId(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && id.length > 0 ? id : null;
}

export async function saveEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;

  const result = await withPermission("employees:write", async (user) => {
    const employeeId = readId(formData);
    const parsed = parseFormData(employeeSchema, formData);
    if (!parsed.ok) return parsed.state;

    const { allowances, basicSalary, joinDate, ...fields } = parsed.data;
    const data = { ...fields, joinDate: fromDateInputValue(joinDate), basicSalaryCents: basicSalary };
    const allowanceRows: AllowanceRow[] = allowances.map((a) => ({
      name: a.name,
      amountCents: a.amount,
      epfLiable: a.epfLiable,
    }));

    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) return errorState("Please fix the highlighted fields.", { departmentId: ["Choose a department"] });

    const duplicates = await findDuplicates(data, employeeId);
    if (duplicates) return errorState("Some details already belong to another employee.", duplicates);

    if (!employeeId) {
      const created = await prisma.$transaction(async (tx) => {
        const employee = await tx.employee.create({ data: { ...data, allowances: { create: allowanceRows } } });
        await logAudit(tx, user, "EMPLOYEE_CREATED", { type: "Employee", id: employee.id }, {
          employeeNo: employee.employeeNo,
          name: `${employee.firstName} ${employee.lastName}`,
        });
        return employee;
      });
      createdId = created.id;
      revalidatePath("/employees");
      return successState("Employee created.");
    }

    const existing = await prisma.employee.findUnique({ where: { id: employeeId }, include: { allowances: true } });
    if (!existing) return errorState("This employee no longer exists.");

    const changes: Record<string, unknown> = diffFields(existing, data, TRACKED);
    const before = simplifyAllowances(existing.allowances);
    const after = simplifyAllowances(allowanceRows);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.allowances = { from: before, to: after };
    }
    if (Object.keys(changes).length === 0) return successState("No changes to save.");

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id: employeeId }, data });
      // Replace the allowance list as a whole: simpler than matching rows, and
      // safe because each payroll run keeps its own copy of the amounts.
      await tx.employeeAllowance.deleteMany({ where: { employeeId } });
      await tx.employeeAllowance.createMany({ data: allowanceRows.map((row) => ({ ...row, employeeId })) });
      await logAudit(tx, user, "EMPLOYEE_UPDATED", { type: "Employee", id: employeeId }, {
        employeeNo: data.employeeNo,
        changes,
      });
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${employeeId}`);
    return successState("Employee saved.");
  });

  // redirect() works by throwing, so it runs after the guarded block.
  if (createdId) redirect(`/employees/${createdId}?created=1`);
  return result;
}

export async function setEmployeeStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("employees:write", async (user) => {
    const employeeId = readId(formData);
    const activate = formData.get("status") === "ACTIVE";
    if (!employeeId) return errorState("Missing employee.");

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return errorState("This employee no longer exists.");

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: activate
          ? { status: "ACTIVE", deactivatedAt: null }
          : { status: "INACTIVE", deactivatedAt: new Date() },
      });
      // A person who has left must not keep access to the system.
      if (!activate) {
        await tx.user.updateMany({ where: { employeeId }, data: { isActive: false } });
      }
      await logAudit(
        tx,
        user,
        activate ? "EMPLOYEE_REACTIVATED" : "EMPLOYEE_DEACTIVATED",
        { type: "Employee", id: employeeId },
        { employeeNo: employee.employeeNo },
      );
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${employeeId}`);
    return successState(
      activate
        ? "Employee reactivated. They will be included in the next payroll run."
        : "Employee deactivated. They are excluded from new payroll runs and their login (if any) is disabled.",
    );
  });
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

async function departmentNameTaken(name: string, excludeId?: string) {
  const match = await prisma.department.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: excludeId ? { not: excludeId } : undefined },
  });
  return match !== null;
}

export async function createDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("employees:write", async (user) => {
    const parsed = parseFormData(departmentSchema, formData);
    if (!parsed.ok) return parsed.state;
    if (await departmentNameTaken(parsed.data.name)) {
      return errorState("Please fix the highlighted fields.", { name: ["A department with this name exists"] });
    }

    await prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({ data: parsed.data });
      await logAudit(tx, user, "DEPARTMENT_CREATED", { type: "Department", id: dept.id }, { name: dept.name });
    });
    revalidatePath("/employees", "layout");
    return successState(`Department “${parsed.data.name}” added.`);
  });
}

export async function renameDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("employees:write", async (user) => {
    const id = readId(formData);
    const parsed = parseFormData(departmentSchema, formData);
    if (!id) return errorState("Missing department.");
    if (!parsed.ok) return parsed.state;
    if (await departmentNameTaken(parsed.data.name, id)) {
      return errorState("Please fix the highlighted fields.", { name: ["A department with this name exists"] });
    }

    const before = await prisma.department.findUnique({ where: { id } });
    if (!before) return errorState("This department no longer exists.");
    if (before.name === parsed.data.name) return successState("No changes to save.");

    await prisma.$transaction(async (tx) => {
      await tx.department.update({ where: { id }, data: parsed.data });
      await logAudit(tx, user, "DEPARTMENT_RENAMED", { type: "Department", id }, {
        from: before.name,
        to: parsed.data.name,
      });
    });
    revalidatePath("/employees", "layout");
    return successState("Department renamed.");
  });
}

export async function deleteDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("employees:write", async (user) => {
    const id = readId(formData);
    if (!id) return errorState("Missing department.");

    const dept = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!dept) return errorState("This department no longer exists.");
    if (dept._count.employees > 0) {
      return errorState(`“${dept.name}” still has ${dept._count.employees} employee(s). Move them first.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.department.delete({ where: { id } });
      await logAudit(tx, user, "DEPARTMENT_DELETED", { type: "Department", id }, { name: dept.name });
    });
    revalidatePath("/employees", "layout");
    return successState(`Department “${dept.name}” deleted.`);
  });
}

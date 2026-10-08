import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { buildPayslipData, type PayslipData } from "@/lib/payslip/data";

type Denied = { ok: false; status: 401 | 403 | 404; message: string };
type Allowed = { ok: true; payslips: PayslipData[]; generatedOn: string };

const itemInclude = { run: true, lines: { orderBy: { label: "asc" } } } satisfies Prisma.PayrollItemInclude;

async function toPayslips(items: Prisma.PayrollItemGetPayload<{ include: typeof itemInclude }>[]): Promise<PayslipData[]> {
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const approverIds = [...new Set(items.map((i) => i.run.approvedById).filter((v): v is string => Boolean(v)))];
  const approvers = await prisma.user.findMany({ where: { id: { in: approverIds } }, select: { id: true, name: true } });
  const companyInfo = {
    name: company?.name ?? "Company",
    address: company?.address ?? "",
    epfRegNo: company?.epfRegNo ?? "-",
    etfRegNo: company?.etfRegNo ?? "-",
  };
  return items.map((item) =>
    buildPayslipData(
      item.run,
      item,
      companyInfo,
      approvers.find((a) => a.id === item.run.approvedById)?.name ?? null,
      formatDate,
    ),
  );
}

async function signedInUser() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, message: "Please sign in." } as const;
  if (user.mustChangePassword) return { ok: false, status: 403, message: "Change your temporary password first." } as const;
  return { ok: true, user } as const;
}

/**
 * One employee's payslip.
 * HR/Admin may open any payslip (drafts get a watermark). An employee may only
 * open their OWN payslip, and only once the payroll is approved.
 */
export async function loadItemPayslip(itemId: string): Promise<Allowed | Denied> {
  const session = await signedInUser();
  if (!session.ok) return session;
  const { user } = session;

  const item = await prisma.payrollItem.findUnique({ where: { id: itemId }, include: itemInclude });
  // Same "not found" answer whether it doesn't exist or isn't theirs, so IDs can't be probed.
  const notFound: Denied = { ok: false, status: 404, message: "Payslip not found." };
  if (!item) return notFound;

  const isPayrollStaff = hasPermission(user.role, "payroll:read");
  const isOwnApproved =
    hasPermission(user.role, "payslips:own") &&
    user.employeeId !== null &&
    item.employeeId === user.employeeId &&
    item.run.status === "APPROVED";
  if (!isPayrollStaff && !isOwnApproved) return notFound;

  return { ok: true, payslips: await toPayslips([item]), generatedOn: formatDateTime(new Date()) };
}

/** Every payslip in a run, for HR/Admin. */
export async function loadRunPayslips(runId: string): Promise<Allowed | Denied> {
  const session = await signedInUser();
  if (!session.ok) return session;
  if (!hasPermission(session.user.role, "payroll:read")) {
    return { ok: false, status: 403, message: "You do not have permission to do that." };
  }

  const items = await prisma.payrollItem.findMany({
    where: { runId },
    orderBy: { employeeNo: "asc" },
    include: itemInclude,
  });
  if (items.length === 0) return { ok: false, status: 404, message: "Payroll run not found." };
  return { ok: true, payslips: await toPayslips(items), generatedOn: formatDateTime(new Date()) };
}

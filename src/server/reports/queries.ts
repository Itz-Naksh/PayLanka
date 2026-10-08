import "server-only";
import { prisma } from "@/lib/db";
import type { ReportItem } from "@/lib/reports/types";

export async function reportRuns() {
  return prisma.payrollRun.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { id: true, year: true, month: true, status: true },
  });
}

type RunOption = Awaited<ReturnType<typeof reportRuns>>[number];

/** The run asked for in the URL, else the latest approved one, else the latest. */
export function pickRun(runs: RunOption[], requested: string | undefined): RunOption | null {
  return (
    runs.find((r) => r.id === requested) ?? runs.find((r) => r.status === "APPROVED") ?? runs[0] ?? null
  );
}

const ITEM_FIELDS = {
  employeeNo: true,
  employeeName: true,
  nic: true,
  epfNo: true,
  departmentName: true,
  designation: true,
  bankName: true,
  bankBranch: true,
  accountNo: true,
  basicCents: true,
  fixedAllowancesCents: true,
  extraAllowancesCents: true,
  overtimeCents: true,
  noPayCents: true,
  grossCents: true,
  epfLiableCents: true,
  epfEmployeeCents: true,
  epfEmployerCents: true,
  etfEmployerCents: true,
  apitCents: true,
  otherDeductionsCents: true,
  totalDeductionsCents: true,
  netCents: true,
} as const satisfies Record<keyof ReportItem, true>;

/** A run with the snapshot fields every report reads (never the live employee record). */
export async function reportData(runId: string) {
  return prisma.payrollRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      year: true,
      month: true,
      status: true,
      epfEmployeeRateBp: true,
      epfEmployerRateBp: true,
      etfEmployerRateBp: true,
      items: { orderBy: { employeeNo: "asc" }, select: ITEM_FIELDS },
    },
  });
}

export async function companyInfo() {
  return prisma.companySettings.findUnique({
    where: { id: 1 },
    select: { name: true, epfRegNo: true, etfRegNo: true },
  });
}

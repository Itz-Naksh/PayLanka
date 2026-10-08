import "server-only";
import { prisma } from "@/lib/db";
import { sumCents } from "@/lib/money";
import { toHundredths } from "@/lib/payroll/convert";
import { addMonths, currentPeriod, periodLabel } from "@/lib/payroll/period";

export type RunTotals = {
  employees: number;
  grossCents: number;
  totalDeductionsCents: number;
  netCents: number;
  epfEmployeeCents: number;
  epfEmployerCents: number;
  etfEmployerCents: number;
  apitCents: number;
  employerCostCents: number;
};

export async function listRuns() {
  const [runs, sums] = await Promise.all([
    prisma.payrollRun.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
    prisma.payrollItem.groupBy({
      by: ["runId"],
      _sum: { grossCents: true, netCents: true, epfEmployerCents: true, etfEmployerCents: true },
      _count: true,
    }),
  ]);
  const byRun = new Map(sums.map((s) => [s.runId, s]));
  return runs.map((run) => {
    const s = byRun.get(run.id);
    const gross = s?._sum.grossCents ?? 0;
    return {
      ...run,
      employees: s?._count ?? 0,
      grossCents: gross,
      netCents: s?._sum.netCents ?? 0,
      employerCostCents: gross + (s?._sum.epfEmployerCents ?? 0) + (s?._sum.etfEmployerCents ?? 0),
    };
  });
}

export async function getRunDetail(id: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { items: { orderBy: { employeeNo: "asc" }, include: { lines: { orderBy: { label: "asc" } } } } },
  });
  if (!run) return null;

  const userIds = [run.createdById, run.submittedById, run.approvedById, run.returnedById].filter(
    (v): v is string => Boolean(v),
  );
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const nameOf = (userId: string | null) => (userId ? (users.find((u) => u.id === userId)?.name ?? "Former user") : null);

  const items = run.items;
  const sum = (pick: (item: (typeof items)[number]) => number) => sumCents(items.map(pick));
  const totals: RunTotals = {
    employees: items.length,
    grossCents: sum((i) => i.grossCents),
    totalDeductionsCents: sum((i) => i.totalDeductionsCents),
    netCents: sum((i) => i.netCents),
    epfEmployeeCents: sum((i) => i.epfEmployeeCents),
    epfEmployerCents: sum((i) => i.epfEmployerCents),
    etfEmployerCents: sum((i) => i.etfEmployerCents),
    apitCents: sum((i) => i.apitCents),
    employerCostCents: sum((i) => i.grossCents + i.epfEmployerCents + i.etfEmployerCents),
  };

  return {
    run,
    totals,
    people: {
      createdBy: nameOf(run.createdById),
      submittedBy: nameOf(run.submittedById),
      approvedBy: nameOf(run.approvedById),
      returnedBy: nameOf(run.returnedById),
    },
  };
}

/** This month's run (if any), for the sidebar status card. */
export async function currentMonthRun() {
  const period = currentPeriod();
  const run = await prisma.payrollRun.findUnique({
    where: { year_month: { year: period.year, month: period.month } },
    select: { id: true, status: true },
  });
  return { period, run };
}

/** Last month's lines for the same employees, for the pre-approval review checks. */
export async function previousRunLines(period: { year: number; month: number }) {
  const before = addMonths(period, -1);
  const run = await prisma.payrollRun.findUnique({
    where: { year_month: { year: before.year, month: before.month } },
    select: {
      items: {
        select: {
          employeeId: true,
          employeeNo: true,
          employeeName: true,
          grossCents: true,
          netCents: true,
          otherDeductionsCents: true,
          overtimeHours: true,
          noPayDays: true,
        },
      },
    },
  });
  if (!run) return null;
  return {
    label: periodLabel(before),
    lines: run.items.map(({ overtimeHours, noPayDays, ...rest }) => ({
      ...rest,
      overtimeHundredths: toHundredths(overtimeHours),
      noPayDaysHundredths: toHundredths(noPayDays),
    })),
  };
}

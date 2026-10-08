import "server-only";
import { prisma } from "@/lib/db";
import { addMonths, currentPeriod, periodIndex, periodLabel, type Period } from "@/lib/payroll/period";

export type MonthPoint = {
  key: string;
  label: string; // "Oct"
  fullLabel: string; // "October 2026"
  status: "DRAFT" | "REVIEW" | "APPROVED" | null;
  grossCents: number;
  statutoryCents: number; // employer EPF + ETF
  totalCents: number;
};

// Fixed three-letter labels (en-GB would give "Sept").
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function dashboardData() {
  const now = currentPeriod();
  const first = addMonths(now, -11);

  const [runs, sums, activeEmployees] = await Promise.all([
    prisma.payrollRun.findMany({
      select: {
        id: true,
        year: true,
        month: true,
        status: true,
        epfEmployeeRateBp: true,
        epfEmployerRateBp: true,
        etfEmployerRateBp: true,
      },
    }),
    prisma.payrollItem.groupBy({
      by: ["runId"],
      _sum: {
        grossCents: true,
        netCents: true,
        epfEmployeeCents: true,
        epfEmployerCents: true,
        etfEmployerCents: true,
      },
      _count: true,
    }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
  ]);
  const sumOf = new Map(sums.map((s) => [s.runId, s]));
  const runAt = (p: Period) => runs.find((r) => r.year === p.year && r.month === p.month) ?? null;

  const totalsOf = (runId: string) => {
    const s = sumOf.get(runId);
    const gross = s?._sum.grossCents ?? 0;
    const statutory = (s?._sum.epfEmployerCents ?? 0) + (s?._sum.etfEmployerCents ?? 0);
    return {
      employees: s?._count ?? 0,
      grossCents: gross,
      netCents: s?._sum.netCents ?? 0,
      epfCents: (s?._sum.epfEmployeeCents ?? 0) + (s?._sum.epfEmployerCents ?? 0),
      etfCents: s?._sum.etfEmployerCents ?? 0,
      statutoryCents: statutory,
      costCents: gross + statutory,
    };
  };

  const months: MonthPoint[] = Array.from({ length: 12 }, (_, i) => {
    const period = addMonths(first, i);
    const run = runAt(period);
    const totals = run ? totalsOf(run.id) : null;
    return {
      key: `${period.year}-${period.month}`,
      label: SHORT[period.month - 1],
      fullLabel: periodLabel(period),
      status: run?.status ?? null,
      grossCents: totals?.grossCents ?? 0,
      statutoryCents: totals?.statutoryCents ?? 0,
      totalCents: totals?.costCents ?? 0,
    };
  });

  // Headline: this month if it has a run, else the most recent run.
  const latest =
    runAt(now) ??
    [...runs].sort((a, b) => periodIndex(b) - periodIndex(a))[0] ??
    null;

  let headline = null;
  if (latest) {
    const totals = totalsOf(latest.id);
    const previousRun = runAt(addMonths(latest, -1));
    const previousCost = previousRun ? totalsOf(previousRun.id).costCents : null;
    const byDepartment = await prisma.payrollItem.groupBy({
      by: ["departmentName"],
      where: { runId: latest.id },
      _sum: { grossCents: true, epfEmployerCents: true, etfEmployerCents: true },
      _count: true,
    });
    const departments = byDepartment
      .map((d) => ({
        department: d.departmentName,
        employees: d._count,
        costCents: (d._sum.grossCents ?? 0) + (d._sum.epfEmployerCents ?? 0) + (d._sum.etfEmployerCents ?? 0),
      }))
      .map((d) => ({ ...d, shareBp: totals.costCents ? Math.round((d.costCents * 10_000) / totals.costCents) : 0 }))
      .sort((a, b) => b.costCents - a.costCents);
    headline = {
      runId: latest.id,
      period: periodLabel(latest),
      status: latest.status,
      rates: {
        epfEmployeeRateBp: latest.epfEmployeeRateBp,
        epfEmployerRateBp: latest.epfEmployerRateBp,
        etfEmployerRateBp: latest.etfEmployerRateBp,
      },
      ...totals,
      previousCostCents: previousCost,
      departments,
    };
  }

  return { months, headline, activeEmployees };
}

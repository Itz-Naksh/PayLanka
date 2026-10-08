import { ArrowDownRight, ArrowRight, ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";
import { PayrollCostChart } from "@/components/dashboard/payroll-cost-chart";
import { RunStatusBadge } from "@/components/payroll/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { formatLKR, formatRateBp } from "@/lib/money";
import { dashboardData } from "@/server/dashboard/queries";

export const metadata = { title: "Dashboard" };

/** "+2.4% vs last month" — payroll cost going up isn't good or bad by itself, so it stays neutral. */
function Delta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || previous === 0) return null;
  const change = (current - previous) / previous;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-2 flex items-center gap-1 text-sm text-muted">
      <Icon className="size-4" aria-hidden />
      <span className="font-medium text-foreground">
        {change >= 0 ? "+" : "−"}
        {Math.abs(change * 100).toFixed(1)}%
      </span>
      vs previous month ({formatLKR(previous)})
    </p>
  );
}

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view");
  const { months, headline, activeEmployees } = await dashboardData();

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Your payroll at a glance." />

      {!headline ? (
        <Card className="p-10 text-center">
          <Wallet className="mx-auto size-10 text-primary" aria-hidden />
          <p className="mt-3 font-semibold">No payroll yet</p>
          <p className="mt-1 text-sm text-muted">Run your first month&apos;s payroll to see costs here.</p>
          {hasPermission(user.role, "payroll:edit") ? (
            <Link href="/payroll/new" className={`${buttonClasses()} mt-5`}>
              New payroll run
            </Link>
          ) : null}
        </Card>
      ) : (
        <>
          {/* Hero: the one number this page leads with */}
          <Card className="mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
                Total payroll cost · {headline.period}
                <RunStatusBadge status={headline.status} />
              </p>
              <p className="money mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{formatLKR(headline.costCents)}</p>
              <Delta current={headline.costCents} previous={headline.previousCostCents} />
            </div>
            <Link href={`/payroll/${headline.runId}`} className={buttonClasses("secondary")}>
              Open payroll <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Card>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active employees" value={activeEmployees} hint={`${headline.employees} paid in ${headline.period}`} />
            <StatCard label="Net pay to bank" value={<Money cents={headline.netCents} />} hint="After all deductions" />
            <StatCard label="EPF to pay" value={<Money cents={headline.epfCents} />} hint={`Employee ${formatRateBp(headline.rates.epfEmployeeRateBp)} + employer ${formatRateBp(headline.rates.epfEmployerRateBp)}`} />
            <StatCard label="ETF to pay" value={<Money cents={headline.etfCents} />} hint={`Employer ${formatRateBp(headline.rates.etfEmployerRateBp)}`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">Payroll cost, last 12 months</h2>
              <p className="mb-4 text-sm text-muted">What the company paid each month: gross pay plus employer EPF and ETF.</p>
              <PayrollCostChart months={months} />
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">Cost by department</h2>
              <p className="mb-4 text-sm text-muted">{headline.period}</p>
              <ul className="space-y-4">
                {headline.departments.map((d) => (
                  <li key={d.department}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">
                        {d.department}
                        <span className="ml-1.5 font-normal text-muted">
                          {d.employees} {d.employees === 1 ? "person" : "people"}
                        </span>
                      </span>
                      <span className="money text-muted">{(d.shareBp / 100).toFixed(1)}%</span>
                    </div>
                    {/* Single series: one colour for every bar; the track is a lighter step of the same hue. */}
                    <div className="mt-1.5 h-2 rounded-full bg-primary-soft" aria-hidden>
                      <div className="h-2 rounded-full bg-[#9E2F3D]" style={{ width: `${d.shareBp / 100}%` }} />
                    </div>
                    <p className="money mt-1 text-xs text-muted">{formatLKR(d.costCents)}</p>
                  </li>
                ))}
              </ul>
              <Link
                href={`/reports/departments?run=${headline.runId}`}
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Department report <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

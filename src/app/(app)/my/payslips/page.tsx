import { FileDown, Receipt } from "lucide-react";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { currentPeriod, periodLabel, taxYearOf } from "@/lib/payroll/period";

export const metadata = { title: "My payslips" };

export default async function MyPayslipsPage() {
  const user = await requirePermission("payslips:own");

  // Only the signed-in employee's own payslips, and only from approved payroll.
  const items = user.employeeId
    ? await prisma.payrollItem.findMany({
        where: { employeeId: user.employeeId, run: { status: "APPROVED" } },
        orderBy: [{ run: { year: "desc" } }, { run: { month: "desc" } }],
        select: {
          id: true,
          grossCents: true,
          totalDeductionsCents: true,
          netCents: true,
          epfEmployeeCents: true,
          epfEmployerCents: true,
          etfEmployerCents: true,
          run: { select: { year: true, month: true, approvedAt: true } },
        },
      })
    : [];

  // Totals for the current Sri Lankan tax year (April – March), from approved payslips.
  const taxYear = taxYearOf(currentPeriod());
  const thisYear = items.filter(
    (i) =>
      (i.run.year === taxYear.first.year && i.run.month >= 4) ||
      (i.run.year === taxYear.last.year && i.run.month <= 3),
  );
  const total = (pick: (i: (typeof items)[number]) => number) => thisYear.reduce((sum, i) => sum + pick(i), 0);

  return (
    <>
      <PageHeader title="My payslips" description="Your payslips from approved payroll, newest first." />

      {!user.employeeId ? (
        <Card className="p-8 text-center text-sm text-muted">
          Your login isn&apos;t linked to an employee record yet. Ask your administrator to link it.
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <Receipt className="mx-auto size-10 text-primary" aria-hidden />
          <p className="mt-3 font-semibold">No payslips yet</p>
          <p className="mt-1 text-sm text-muted">They appear here once a month&apos;s payroll is approved.</p>
        </Card>
      ) : (
        <>
          {thisYear.length > 0 ? (
            <section aria-label={`Tax year ${taxYear.label} so far`} className="mb-6">
              <h2 className="mb-3 text-base font-semibold">
                Tax year {taxYear.label} so far{" "}
                <span className="font-normal text-muted">
                  ({thisYear.length} {thisYear.length === 1 ? "month" : "months"}, April – March)
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Gross pay" value={<Money cents={total((i) => i.grossCents)} />} />
                <StatCard label="Net pay received" value={<Money cents={total((i) => i.netCents)} />} />
                <StatCard
                  label="Your EPF contribution"
                  value={<Money cents={total((i) => i.epfEmployeeCents)} />}
                  hint="Deducted from your pay"
                />
                <StatCard
                  label="Paid for you by the company"
                  value={<Money cents={total((i) => i.epfEmployerCents + i.etfEmployerCents)} />}
                  hint="Employer EPF + ETF"
                />
              </div>
            </section>
          ) : null}
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{periodLabel(item.run)}</p>
                    {/* Fixed columns: real gaps between figures, aligned from row to row. */}
                    <dl className="mt-1.5 grid max-w-md grid-cols-3 gap-x-6 text-sm">
                      <div>
                        <dt className="text-xs text-muted">Gross</dt>
                        <dd>
                          <Money cents={item.grossCents} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Deductions</dt>
                        <dd>
                          <Money cents={item.totalDeductionsCents} />
                        </dd>
                      </div>
                      {item.run.approvedAt ? (
                        <div>
                          <dt className="text-xs text-muted">Approved</dt>
                          <dd>{formatDate(item.run.approvedAt)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-muted">Net pay</p>
                      <Money cents={item.netCents} className="font-semibold" />
                    </div>
                    <a
                      href={`/api/payslips/${item.id}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary ring-1 ring-primary/30 ring-inset hover:bg-primary-soft"
                      aria-label={`Payslip PDF for ${periodLabel(item.run)}`}
                    >
                      <FileDown className="size-4" aria-hidden />
                      PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

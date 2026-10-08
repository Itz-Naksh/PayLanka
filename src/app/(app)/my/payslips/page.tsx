import { FileDown, Receipt } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { periodLabel } from "@/lib/payroll/period";

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
          run: { select: { year: true, month: true, approvedAt: true } },
        },
      })
    : [];

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
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{periodLabel(item.run)}</p>
                  <p className="text-sm text-muted">
                    Gross <Money cents={item.grossCents} /> · Deductions <Money cents={item.totalDeductionsCents} />
                    {item.run.approvedAt ? ` · Approved ${formatDate(item.run.approvedAt)}` : ""}
                  </p>
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
      )}
    </>
  );
}

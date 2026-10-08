import { ChevronRight, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { RunStatusBadge } from "@/components/payroll/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { periodLabel } from "@/lib/payroll/period";
import { listRuns } from "@/server/payroll/queries";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const user = await requirePermission("payroll:read");
  const runs = await listRuns();
  const canCreate = hasPermission(user.role, "payroll:edit");

  return (
    <>
      <PageHeader
        title="Payroll"
        description="One run per month: Draft → In review → Approved (locked)."
        actions={
          canCreate ? (
            <Link href="/payroll/new" className={buttonClasses()}>
              <Plus className="size-4" aria-hidden />
              New payroll run
            </Link>
          ) : null
        }
      />

      {runs.length === 0 ? (
        <Card className="p-10 text-center">
          <Wallet className="mx-auto size-10 text-primary" aria-hidden />
          <p className="mt-3 font-semibold">No payroll runs yet</p>
          <p className="mt-1 text-sm text-muted">Create this month&apos;s payroll to get started.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-background text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Month</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="hidden px-4 py-3 text-right sm:table-cell">Employees</th>
                  <th scope="col" className="hidden px-4 py-3 text-right md:table-cell">Gross pay</th>
                  <th scope="col" className="px-4 py-3 text-right">Net pay</th>
                  <th scope="col" className="hidden px-4 py-3 text-right lg:table-cell">Employer cost</th>
                  <th scope="col" className="w-8 px-2 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => (
                  <tr key={run.id} className="group relative hover:bg-background">
                    <td className="px-4 py-3">
                      <Link href={`/payroll/${run.id}`} className="font-semibold after:absolute after:inset-0">
                        {periodLabel(run)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="money hidden px-4 py-3 text-right sm:table-cell">{run.employees}</td>
                    <td className="hidden px-4 py-3 text-right md:table-cell">
                      <Money cents={run.grossCents} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money cents={run.netCents} className="font-medium" />
                    </td>
                    <td className="hidden px-4 py-3 text-right lg:table-cell">
                      <Money cents={run.employerCostCents} />
                    </td>
                    <td className="px-2 py-3 text-muted group-hover:text-primary">
                      <ChevronRight className="size-4" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

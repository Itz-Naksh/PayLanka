import { ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatRateBp } from "@/lib/money";
import { addMonths, currentPeriod, periodKey } from "@/lib/payroll/period";
import { NewRunForm } from "./new-run-form";

export const metadata = { title: "New payroll run" };

export default async function NewRunPage() {
  await requirePermission("payroll:edit");
  const [settings, activeEmployees] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
  ]);
  const now = currentPeriod();

  return (
    <>
      <Link href="/payroll" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Payroll
      </Link>
      <PageHeader title="New payroll run" description="Creates a draft for every active employee." />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="p-5 sm:p-6">
          <NewRunForm defaultPeriod={periodKey(now)} maxPeriod={periodKey(addMonths(now, 1))} />
        </Card>

        <Card className="h-fit p-5 text-sm">
          <p className="font-semibold">What happens next</p>
          <ul className="mt-3 space-y-2 text-muted">
            {[
              `${activeEmployees} active employees are added with their basic salary and fixed allowances.`,
              settings
                ? `Today's rates are copied in: EPF ${formatRateBp(settings.epfEmployeeRateBp)} + ${formatRateBp(settings.epfEmployerRateBp)}, ETF ${formatRateBp(settings.etfEmployerRateBp)}.`
                : "Company rates are copied in.",
              "You then enter overtime, no-pay leave, extra allowances and deductions.",
              "Employees who joined mid-month: use no-pay days to pro-rate their salary.",
            ].map((text) => (
              <li key={text} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

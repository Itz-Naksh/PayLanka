import { Card, ComingSoon, PageHeader, StatCard } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatRateBp } from "@/lib/money";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view");

  const [activeEmployees, departments, settings] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.department.count(),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Overview of your payroll." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active employees" value={activeEmployees} />
        <StatCard label="Departments" value={departments} />
        <StatCard
          label="EPF (employee / employer)"
          value={
            settings
              ? `${formatRateBp(settings.epfEmployeeRateBp)} / ${formatRateBp(settings.epfEmployerRateBp)}`
              : "—"
          }
          hint="Configurable in Settings"
        />
        <StatCard
          label="ETF (employer)"
          value={settings ? formatRateBp(settings.etfEmployerRateBp) : "—"}
          hint="Configurable in Settings"
        />
      </div>

      <Card className="mt-6 p-5 text-sm text-muted">
        <span className="font-medium text-foreground">EPF reg. no:</span> {settings?.epfRegNo ?? "—"}
        <span className="mx-3 text-muted">|</span>
        <span className="font-medium text-foreground">ETF reg. no:</span> {settings?.etfRegNo ?? "—"}
      </Card>

      <div className="mt-6">
        <ComingSoon phase={5}>
          Payroll cost this month, EPF/ETF totals and the 12-month payroll cost chart will appear here.
        </ComingSoon>
      </div>
    </>
  );
}

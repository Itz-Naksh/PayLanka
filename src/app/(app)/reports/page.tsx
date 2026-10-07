import { ComingSoon, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requirePermission("reports:read");

  return (
    <>
      <PageHeader title="Reports" description="Payroll summary, EPF/ETF, department costs and bank transfer list." />
      <ComingSoon phase={5}>Monthly reports with CSV export.</ComingSoon>
    </>
  );
}

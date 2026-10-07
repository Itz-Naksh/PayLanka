import { ComingSoon, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  await requirePermission("payroll:read");

  return (
    <>
      <PageHeader title="Payroll" description="Monthly payroll runs: Draft → Review → Approved." />
      <ComingSoon phase={3}>Generate a month&apos;s payroll, enter overtime and no-pay leave, then submit for approval.</ComingSoon>
    </>
  );
}

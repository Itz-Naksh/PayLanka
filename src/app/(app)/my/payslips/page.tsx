import { ComingSoon, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "My payslips" };

export default async function MyPayslipsPage() {
  await requirePermission("payslips:own");

  return (
    <>
      <PageHeader title="My payslips" description="Download your monthly payslips." />
      <ComingSoon phase={6}>Your approved payslips will be listed here.</ComingSoon>
    </>
  );
}

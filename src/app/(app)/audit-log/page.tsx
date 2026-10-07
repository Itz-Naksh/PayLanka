import { ComingSoon, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  await requirePermission("audit:read");

  return (
    <>
      <PageHeader title="Audit log" description="Who created, edited or approved payroll, and when." />
      <ComingSoon phase={6}>A searchable history of every payroll and employee change.</ComingSoon>
    </>
  );
}

import type { ReactNode } from "react";
import { ReportTabs } from "@/components/reports/report-tabs";
import { PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { REPORT_TITLES, REPORT_TYPES } from "@/lib/reports/build";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  await requirePermission("reports:read");

  return (
    <>
      <PageHeader title="Reports" description="Built from each month's frozen payroll figures. Export any report to CSV." />
      <ReportTabs tabs={REPORT_TYPES.map((type) => ({ href: `/reports/${type}`, label: REPORT_TITLES[type] }))} />
      {children}
    </>
  );
}

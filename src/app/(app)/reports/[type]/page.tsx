import { CircleAlert, FileSpreadsheet, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RunStatusBadge } from "@/components/payroll/status-badge";
import { ReportTable } from "@/components/reports/report-table";
import { RunPicker } from "@/components/reports/run-picker";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { requirePermission } from "@/lib/auth/session";
import { periodLabel } from "@/lib/payroll/period";
import { bankTotals, buildReport, isReportType, REPORT_TITLES, type ReportType } from "@/lib/reports/build";
import { companyInfo, pickRun, reportData, reportRuns } from "@/server/reports/queries";

export const metadata = { title: "Reports" };

const DESCRIPTIONS: Record<ReportType, string> = {
  summary: "Every earning, deduction and employer contribution, per employee.",
  "epf-etf": "Member-wise EPF (employee + employer) and ETF for the month's returns.",
  departments: "What each department costs the company, including employer EPF and ETF.",
  "bank-transfer": "Net pay to transfer, grouped by bank. Full account numbers — keep confidential.",
};

/** Bank transfers are only produced from final figures. */
const NEEDS_APPROVAL: ReportType[] = ["bank-transfer"];

export default async function ReportPage({ params, searchParams }: PageProps<"/reports/[type]">) {
  await requirePermission("reports:read");
  const [{ type }, query] = await Promise.all([params, searchParams]);
  if (!isReportType(type)) notFound();

  const runs = await reportRuns();
  const run = pickRun(runs, typeof query.run === "string" ? query.run : undefined);

  if (!run) {
    return (
      <Card className="p-10 text-center text-sm text-muted">
        No payroll runs yet. <Link href="/payroll/new" className="font-semibold text-primary">Create one</Link> to see reports.
      </Card>
    );
  }

  const [data, company] = await Promise.all([reportData(run.id), companyInfo()]);
  if (!data) notFound();
  const report = buildReport(type, data.items, data);
  const label = periodLabel(data);
  const blocked = NEEDS_APPROVAL.includes(type) && data.status !== "APPROVED";

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {REPORT_TITLES[type]} — {label}
          </h2>
          <p className="text-sm text-muted">{DESCRIPTIONS[type]}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <RunPicker
            runs={runs.map((r) => ({ id: r.id, label: periodLabel(r), status: r.status }))}
            selectedId={run.id}
          />
          {blocked ? null : (
            <a href={`/api/reports/${type}/csv?run=${run.id}`} className={buttonClasses("secondary")}>
              <FileSpreadsheet className="size-4" aria-hidden />
              Export CSV
            </a>
          )}
        </div>
      </div>

      {data.status !== "APPROVED" && !blocked ? (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-ink ring-1 ring-warning/30">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          <span>
            This payroll is <RunStatusBadge status={data.status} /> — figures may still change until it is approved.
          </span>
        </p>
      ) : null}

      {type === "epf-etf" && company ? (
        <p className="mb-4 text-sm text-muted">
          {company.name} · EPF reg. <strong className="text-foreground">{company.epfRegNo}</strong> · ETF reg.{" "}
          <strong className="text-foreground">{company.etfRegNo}</strong>
        </p>
      ) : null}

      {blocked ? (
        <Card className="p-10 text-center">
          <Lock className="mx-auto size-8 text-primary" aria-hidden />
          <p className="mt-3 font-semibold">Available once {label} payroll is approved</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            A bank transfer list is only produced from final, approved figures, so nobody is paid from a draft.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <ReportTable report={report} caption={`${REPORT_TITLES[type]}, ${label}`} />
          </Card>
          {type === "bank-transfer" ? (
            <Card className="p-5 text-sm">
              <h3 className="font-semibold">Totals by bank</h3>
              <ul className="mt-3 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-4">
                {bankTotals(data.items).map((bank) => (
                  <li key={bank.bank} className="flex items-center justify-between gap-3 border-b border-border py-2">
                    <span>
                      {bank.bank}
                      <span className="block text-xs text-muted">
                        {bank.transfers} {bank.transfers === 1 ? "transfer" : "transfers"}
                      </span>
                    </span>
                    <Money cents={bank.amountCents} className="font-medium" />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}

import { ArrowLeft, CircleCheck, FileDown, Lock, MessageSquareWarning, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RunStatusBadge } from "@/components/payroll/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, PageHeader, StatCard } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { formatRateBp } from "@/lib/money";
import { toHundredths, ratesOf } from "@/lib/payroll/convert";
import { periodLabel } from "@/lib/payroll/period";
import { getRunDetail } from "@/server/payroll/queries";
import { runBrackets } from "@/server/payroll/engine";
import { ItemsTable } from "./items-table";
import { RunActions } from "./run-actions";
import type { ItemView } from "./types";

export const metadata = { title: "Payroll run" };

export default async function PayrollRunPage({ params }: PageProps<"/payroll/[runId]">) {
  const user = await requirePermission("payroll:read");
  const { runId } = await params;
  const detail = await getRunDetail(runId);
  if (!detail) notFound();
  const { run, totals, people } = detail;

  const period = periodLabel(run);
  const canEdit = hasPermission(user.role, "payroll:edit");
  const canSubmit = hasPermission(user.role, "payroll:submit");
  const canApprove = hasPermission(user.role, "payroll:approve");
  const editable = run.status === "DRAFT" && canEdit;
  const approveBlockedReason =
    run.submittedById === user.id
      ? "You submitted this payroll, so another Admin must approve it (segregation of duties). You can still return it."
      : null;

  // Plain JSON for client components (Prisma Decimal isn't serialisable).
  const items: ItemView[] = run.items.map((item) => ({
    id: item.id,
    employeeNo: item.employeeNo,
    employeeName: item.employeeName,
    departmentName: item.departmentName,
    designation: item.designation,
    basicCents: item.basicCents,
    overtimeHundredths: toHundredths(item.overtimeHours),
    noPayDaysHundredths: toHundredths(item.noPayDays),
    fixedAllowancesCents: item.fixedAllowancesCents,
    extraAllowancesCents: item.extraAllowancesCents,
    overtimeCents: item.overtimeCents,
    noPayCents: item.noPayCents,
    grossCents: item.grossCents,
    epfLiableCents: item.epfLiableCents,
    epfEmployeeCents: item.epfEmployeeCents,
    epfEmployerCents: item.epfEmployerCents,
    etfEmployerCents: item.etfEmployerCents,
    apitCents: item.apitCents,
    otherDeductionsCents: item.otherDeductionsCents,
    totalDeductionsCents: item.totalDeductionsCents,
    netCents: item.netCents,
    lines: item.lines.map((l) => ({ source: l.source, label: l.label, amountCents: l.amountCents, epfLiable: l.epfLiable })),
  }));
  const context = { rates: ratesOf(run), apitBrackets: runBrackets(run) };

  return (
    <>
      <Link href="/payroll" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Payroll
      </Link>

      <PageHeader
        title={`${period} payroll`}
        description={`${totals.employees} employees`}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
            <a
              href={`/api/payroll/${run.id}/payslips`}
              target="_blank"
              rel="noopener"
              className={buttonClasses("secondary")}
            >
              <FileDown className="size-4" aria-hidden />
              {run.status === "APPROVED" ? "All payslips (PDF)" : "Preview payslips"}
            </a>
            <RunActions
              runId={run.id}
              period={period}
              status={run.status}
              canEdit={canEdit}
              canSubmit={canSubmit}
              canApprove={canApprove}
              approveBlockedReason={approveBlockedReason}
            />
          </div>
        }
      />
      <div className="-mt-3 mb-6">
        <RunStatusBadge status={run.status} />
      </div>

      {run.status === "DRAFT" && run.returnNote ? (
        <Banner icon={<MessageSquareWarning className="size-5" aria-hidden />} tone="warning">
          <strong>Returned by {people.returnedBy}</strong>
          {run.returnedAt ? ` on ${formatDateTime(run.returnedAt)}` : ""}: “{run.returnNote}”
        </Banner>
      ) : null}
      {run.status === "REVIEW" ? (
        <Banner icon={<Send className="size-5" aria-hidden />} tone="warning">
          Waiting for an Admin to approve. Inputs are read-only while in review.
        </Banner>
      ) : null}
      {run.status === "APPROVED" ? (
        <Banner icon={<Lock className="size-5" aria-hidden />} tone="success">
          Approved and locked. Corrections must go into a later month&apos;s payroll.
        </Banner>
      ) : null}
      {editable ? (
        <p className="mb-4 text-sm text-muted">
          Click the ✏️ on a row to enter overtime, no-pay leave, extra allowances and deductions.
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross pay" value={<Money cents={totals.grossCents} />} />
        <StatCard
          label="Net pay (to bank)"
          value={<Money cents={totals.netCents} />}
          hint="Transferred to employees' bank accounts"
        />
        <StatCard
          label="EPF to pay (8% + 12%)"
          value={<Money cents={totals.epfEmployeeCents + totals.epfEmployerCents} />}
          hint="Employee + employer share"
        />
        <StatCard label="Total employer cost" value={<Money cents={totals.employerCostCents} />} hint="Gross + EPF 12% + ETF 3%" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_18rem]">
        <ItemsTable items={items} totals={totals} context={context} editable={editable} />

        <div className="space-y-6">
          <Card className="p-5 text-sm">
            <h2 className="font-semibold">Workflow</h2>
            <ol className="mt-3 space-y-3">
              <Step done label="Created" who={people.createdBy} when={run.createdAt} />
              <Step done={Boolean(run.submittedAt)} label="Submitted for review" who={people.submittedBy} when={run.submittedAt} />
              <Step done={Boolean(run.approvedAt)} label="Approved & locked" who={people.approvedBy} when={run.approvedAt} />
            </ol>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-semibold">Rates used in this run</h2>
            <dl className="mt-3 space-y-1.5 text-muted">
              <Rate label="EPF employee / employer" value={`${formatRateBp(run.epfEmployeeRateBp)} / ${formatRateBp(run.epfEmployerRateBp)}`} />
              <Rate label="ETF employer" value={formatRateBp(run.etfEmployerRateBp)} />
              <Rate label="OT" value={`basic ÷ ${run.otHourlyDivisor} × ${run.otMultiplierBp / 10_000}`} />
              <Rate label="No-pay" value={`basic ÷ ${run.noPayDayDivisor}`} />
              <Rate label="APIT" value={run.apitEnabled ? "On" : "Off"} />
            </dl>
            <p className="mt-3 text-xs text-muted">
              Copied from Settings when the run was created{run.status === "DRAFT" ? " — use Refresh to pick up changes" : ""}.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function Banner({ icon, tone, children }: { icon: React.ReactNode; tone: "warning" | "success"; children: React.ReactNode }) {
  const tones = {
    warning: "bg-warning-soft text-warning-ink ring-warning/30",
    success: "bg-success-soft text-success-ink ring-success/30",
  };
  return (
    <div role="status" className={`mb-4 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ${tones[tone]}`}>
      <span className="shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

function Step({ done, label, who, when }: { done: boolean; label: string; who: string | null; when: Date | null }) {
  return (
    <li className="flex gap-2.5">
      <CircleCheck className={`mt-0.5 size-4 shrink-0 ${done ? "text-success" : "text-border"}`} aria-hidden />
      <div>
        <p className={done ? "font-medium" : "text-muted"}>{label}</p>
        {done && when ? (
          <p className="text-xs text-muted">
            {who ?? "—"} · {formatDateTime(when)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Rate({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="money font-medium text-foreground">{value}</dd>
    </div>
  );
}

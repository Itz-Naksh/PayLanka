import { formatLKR, formatRateBp } from "@/lib/money";
import { cn } from "@/lib/utils";

export type BreakdownData = {
  basicCents: number;
  overtimeCents: number;
  overtimeHours: number;
  noPayCents: number;
  noPayDays: number;
  grossCents: number;
  epfLiableCents: number;
  epfEmployeeCents: number;
  epfEmployerCents: number;
  etfEmployerCents: number;
  apitCents: number;
  totalDeductionsCents: number;
  netCents: number;
  allowances: { label: string; amountCents: number; epfLiable: boolean; extra: boolean }[];
  deductions: { label: string; amountCents: number }[];
  rates: { epfEmployeeRateBp: number; epfEmployerRateBp: number; etfEmployerRateBp: number };
};

function Row({ label, cents, note, strong, negative }: { label: string; cents: number; note?: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1", strong && "border-t border-border pt-2 font-semibold")}>
      <dt className={cn(!strong && "text-muted")}>
        {label}
        {note ? <span className="ml-1 text-xs text-muted">({note})</span> : null}
      </dt>
      <dd className={cn("money", negative && cents < 0 && "text-error")}>
        {negative && cents > 0 ? `− ${formatLKR(cents)}` : formatLKR(cents)}
      </dd>
    </div>
  );
}

/** Earnings / deductions / employer contributions — the same layout the PDF payslip will use. */
export function PayBreakdown({ data }: { data: BreakdownData }) {
  return (
    <div className="grid gap-5 text-sm md:grid-cols-3">
      <section>
        <h4 className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Earnings</h4>
        <dl>
          <Row label="Basic salary" cents={data.basicCents} />
          {data.allowances.map((a, i) => (
            <Row
              key={`${a.label}-${i}`}
              label={a.label}
              cents={a.amountCents}
              note={[a.extra ? "this month" : null, a.epfLiable ? "EPF" : null].filter(Boolean).join(", ") || undefined}
            />
          ))}
          {data.overtimeCents > 0 ? <Row label="Overtime" note={`${data.overtimeHours} h`} cents={data.overtimeCents} /> : null}
          {data.noPayCents > 0 ? (
            <Row label="No-pay leave" note={`${data.noPayDays} d`} cents={data.noPayCents} negative />
          ) : null}
          <Row label="Gross pay" cents={data.grossCents} strong />
        </dl>
      </section>

      <section>
        <h4 className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Deductions</h4>
        <dl>
          <Row label={`EPF employee ${formatRateBp(data.rates.epfEmployeeRateBp)}`} cents={data.epfEmployeeCents} />
          {data.apitCents > 0 ? <Row label="APIT (income tax)" cents={data.apitCents} /> : null}
          {data.deductions.map((d, i) => (
            <Row key={`${d.label}-${i}`} label={d.label} cents={d.amountCents} />
          ))}
          <Row label="Total deductions" cents={data.totalDeductionsCents} strong />
        </dl>
        <div className="mt-3 flex items-baseline justify-between rounded-lg bg-primary-soft px-3 py-2 font-semibold text-primary">
          <span>Net pay</span>
          <span className={cn("money text-base", data.netCents < 0 && "text-error")}>{formatLKR(data.netCents)}</span>
        </div>
      </section>

      <section>
        <h4 className="mb-1 text-xs font-semibold tracking-wider text-muted uppercase">Employer contributions</h4>
        <dl>
          <Row label="EPF/ETF liable earnings" cents={data.epfLiableCents} />
          <Row label={`EPF employer ${formatRateBp(data.rates.epfEmployerRateBp)}`} cents={data.epfEmployerCents} />
          <Row label={`ETF employer ${formatRateBp(data.rates.etfEmployerRateBp)}`} cents={data.etfEmployerCents} />
        </dl>
        <p className="mt-2 text-xs text-muted">Paid by the company — not deducted from the employee. Overtime is excluded.</p>
      </section>
    </div>
  );
}

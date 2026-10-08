"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactLKR, formatLKR } from "@/lib/money";
import type { MonthPoint } from "@/server/dashboard/queries";

// Chart steps of the brand colours, validated with the dataviz palette checker
// (lightness band, colour-blind separation ΔE 28). The darker brand maroon fails
// the lightness band for chart marks, so the chart uses a lighter step.
const SERIES = [
  { key: "grossCents", label: "Gross pay", color: "#9E2F3D" },
  { key: "statutoryCents", label: "Employer EPF + ETF", color: "#D9A440" },
] as const;
const SURFACE = "#FFFFFF";
const GRID = "#E8E1DC";
const MUTED = "#6E6464";

/** Clean axis ticks (0, 500K, 1M, …): a 1/2/2.5/5 x 10^n step giving about four intervals. */
export function niceTicks(max: number, intervals = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

type TooltipProps = { active?: boolean; payload?: { payload: MonthPoint }[] };

function ChartTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg bg-surface px-3 py-2 text-sm shadow-lg ring-1 ring-border">
      <p className="font-semibold">{point.fullLabel}</p>
      {point.status === null ? (
        <p className="text-muted">No payroll run</p>
      ) : (
        <dl className="mt-1 space-y-0.5">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-muted">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
                {s.label}
              </dt>
              <dd className="money">{formatLKR(point[s.key])}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-border pt-1 font-semibold">
            <dt>Total cost</dt>
            <dd className="money">{formatLKR(point.totalCents)}</dd>
          </div>
          {point.status !== "APPROVED" ? <p className="pt-0.5 text-xs text-muted">Not yet approved</p> : null}
        </dl>
      )}
    </div>
  );
}

/** 12 months of employer payroll cost: gross pay + employer EPF/ETF, stacked. */
export function PayrollCostChart({ months }: { months: MonthPoint[] }) {
  const lastWithData = months.findLastIndex((m) => m.status !== null);
  const latest = months[lastWithData];
  const ticks = niceTicks(Math.max(...months.map((m) => m.totalCents)));

  return (
    <div>
      {/* Legend (always shown for 2 series) */}
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>

      <div
        className="h-72"
        role="img"
        aria-label={
          latest
            ? `Column chart of monthly payroll cost for the last 12 months. ${latest.fullLabel}: ${formatLKR(latest.totalCents)}. Full figures are in the table below.`
            : "Column chart of monthly payroll cost. No payroll yet."
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 24, right: 28, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: MUTED, fontSize: 12 }} />
            <YAxis
              ticks={ticks}
              domain={[0, ticks.at(-1) ?? 0]}
              tickFormatter={(v: number) => formatCompactLKR(v)}
              tickLine={false}
              axisLine={false}
              width={72}
              tick={{ fill: MUTED, fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F5E9EA", opacity: 0.6 }} />
            <Bar
              dataKey="grossCents"
              stackId="cost"
              fill={SERIES[0].color}
              maxBarSize={24}
              stroke={SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Bar
              dataKey="statutoryCents"
              stackId="cost"
              fill={SERIES[1].color}
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              stroke={SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {/* One selective direct label: the latest month's total. */}
              <LabelList
                dataKey="totalCents"
                position="top"
                content={({ x, y, width, index }) =>
                  index === lastWithData && typeof x === "number" && typeof y === "number" && typeof width === "number" ? (
                    <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill="#2A2324">
                      {formatCompactLKR(months[index].totalCents)}
                    </text>
                  ) : null
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table view: the same numbers without needing colour or hover. */}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-primary">Show as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="py-1.5 pr-3">Month</th>
                <th scope="col" className="py-1.5 pr-3 text-right">Gross pay</th>
                <th scope="col" className="py-1.5 pr-3 text-right">Employer EPF + ETF</th>
                <th scope="col" className="py-1.5 text-right">Total cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {months.map((m) => (
                <tr key={m.key}>
                  <td className="py-1.5 pr-3">{m.fullLabel}</td>
                  <td className="money py-1.5 pr-3 text-right">{m.status ? formatLKR(m.grossCents) : "—"}</td>
                  <td className="money py-1.5 pr-3 text-right">{m.status ? formatLKR(m.statutoryCents) : "—"}</td>
                  <td className="money py-1.5 text-right font-medium">{m.status ? formatLKR(m.totalCents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

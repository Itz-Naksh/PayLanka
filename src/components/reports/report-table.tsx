import { formatLKR } from "@/lib/money";
import type { Report, ReportColumn, ReportValue } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

function display(column: ReportColumn, value: ReportValue) {
  if (value === null || value === undefined || value === "") return column.kind === "text" ? "—" : "";
  switch (column.kind) {
    case "money":
      // Accounting convention: a dash for nil keeps busy tables readable (the CSV keeps 0.00).
      return Number(value) === 0 ? <span className="text-muted">–</span> : formatLKR(Number(value));
    case "percentBp":
      return `${(Number(value) / 100).toFixed(1)}%`;
    case "count":
      return new Intl.NumberFormat("en-LK").format(Number(value));
    case "text":
      return String(value);
  }
}

const numeric = (column: ReportColumn) => column.kind !== "text";

/** Renders any report definition; the CSV export uses the very same definition. */
export function ReportTable({ report, caption }: { report: Report; caption: string }) {
  const cell = (column: ReportColumn) =>
    // nowrap: account numbers and names must never break across lines; the table scrolls instead.
    cn("px-3 py-2.5 whitespace-nowrap", numeric(column) && "money text-right", column.wide && "hidden lg:table-cell");

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-background text-left text-xs font-semibold tracking-wide text-muted uppercase">
          <tr>
            {report.columns.map((column) => (
              <th key={column.key} scope="col" className={cn(cell(column), "py-3 whitespace-nowrap")}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {report.rows.map((row, index) => (
            <tr key={index} className="hover:bg-background">
              {report.columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    cell(column),
                    column.emphasis && "font-medium text-foreground",
                    Number(row[column.key]) < 0 && column.kind === "money" && "text-error",
                  )}
                >
                  {display(column, row[column.key] ?? null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {report.totals ? (
          <tfoot className="border-t-2 border-border bg-background font-semibold">
            <tr>
              {report.columns.map((column) => (
                <td key={column.key} className={cell(column)}>
                  {display(column, report.totals![column.key] ?? null)}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

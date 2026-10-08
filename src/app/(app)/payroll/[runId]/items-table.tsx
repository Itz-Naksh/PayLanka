"use client";

import { ChevronDown, CircleAlert, Pencil } from "lucide-react";
import { Fragment, useState } from "react";
import { PayBreakdown } from "@/components/payroll/pay-breakdown";
import { Card } from "@/components/ui/card";
import { formatLKR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { breakdownFromItem, ItemEditor } from "./item-editor";
import type { ItemView, RunCalcContext } from "./types";

type Totals = { grossCents: number; epfEmployeeCents: number; totalDeductionsCents: number; netCents: number };

export function ItemsTable({
  items,
  totals,
  context,
  editable,
}: {
  items: ItemView[];
  totals: Totals;
  context: RunCalcContext;
  editable: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-background text-left text-xs font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Employee</th>
              <th scope="col" className="hidden px-3 py-3 text-right lg:table-cell">Basic</th>
              <th scope="col" className="hidden px-3 py-3 text-center whitespace-nowrap md:table-cell">OT (hrs)</th>
              <th scope="col" className="hidden px-3 py-3 text-center whitespace-nowrap md:table-cell">No-pay (days)</th>
              <th scope="col" className="hidden px-3 py-3 text-right sm:table-cell">Gross</th>
              <th scope="col" className="hidden px-3 py-3 text-right xl:table-cell">EPF 8%</th>
              <th scope="col" className="hidden px-3 py-3 text-right lg:table-cell">Deductions</th>
              <th scope="col" className="px-3 py-3 text-right">Net pay</th>
              <th scope="col" className="w-12 px-2 py-3"><span className="sr-only">{editable ? "Edit" : "Details"}</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const open = openId === item.id;
              return (
                <Fragment key={item.id}>
                  <tr className={cn("border-t border-border", open ? "bg-primary-soft/50" : "hover:bg-background")}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.employeeName}</p>
                      <p className="text-xs text-muted">
                        {item.employeeNo} · {item.departmentName}
                      </p>
                    </td>
                    <td className="money hidden px-3 py-3 text-right lg:table-cell">{formatLKR(item.basicCents)}</td>
                    <td className="money hidden px-3 py-3 text-center md:table-cell">
                      {item.overtimeHundredths ? item.overtimeHundredths / 100 : "—"}
                    </td>
                    <td className="money hidden px-3 py-3 text-center md:table-cell">
                      {item.noPayDaysHundredths ? item.noPayDaysHundredths / 100 : "—"}
                    </td>
                    <td className="money hidden px-3 py-3 text-right sm:table-cell">{formatLKR(item.grossCents)}</td>
                    <td className="money hidden px-3 py-3 text-right xl:table-cell">{formatLKR(item.epfEmployeeCents)}</td>
                    <td className="money hidden px-3 py-3 text-right lg:table-cell">{formatLKR(item.totalDeductionsCents)}</td>
                    <td className={cn("money px-3 py-3 text-right font-semibold", item.netCents < 0 && "text-error")}>
                      {item.netCents < 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <CircleAlert className="size-4" aria-label="Negative net pay" />
                          {formatLKR(item.netCents)}
                        </span>
                      ) : (
                        formatLKR(item.netCents)
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : item.id)}
                        aria-expanded={open}
                        aria-controls={`detail-${item.id}`}
                        aria-label={`${editable ? "Edit" : "Show details for"} ${item.employeeName}`}
                        className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-primary"
                      >
                        {editable && !open ? <Pencil className="size-4" aria-hidden /> : (
                          <ChevronDown className={cn("size-4 transition", open && "rotate-180")} aria-hidden />
                        )}
                      </button>
                    </td>
                  </tr>
                  {open ? (
                    <tr id={`detail-${item.id}`} className="bg-primary-soft/30">
                      <td colSpan={9} className="px-4 py-5">
                        {editable ? (
                          <ItemEditor item={item} context={context} />
                        ) : (
                          <PayBreakdown data={breakdownFromItem(item, context)} />
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-border bg-background font-semibold">
            <tr>
              <td className="px-4 py-3">Total ({items.length})</td>
              <td className="hidden lg:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="money hidden px-3 py-3 text-right sm:table-cell">{formatLKR(totals.grossCents)}</td>
              <td className="money hidden px-3 py-3 text-right xl:table-cell">{formatLKR(totals.epfEmployeeCents)}</td>
              <td className="money hidden px-3 py-3 text-right lg:table-cell">{formatLKR(totals.totalDeductionsCents)}</td>
              <td className="money px-3 py-3 text-right">{formatLKR(totals.netCents)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

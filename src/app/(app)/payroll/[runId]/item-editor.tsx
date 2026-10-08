"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PayBreakdown, type BreakdownData } from "@/components/payroll/pay-breakdown";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage } from "@/components/ui/field";
import { formDataToObject } from "@/lib/forms/form-data";
import { initialRowKey, useNewRowKey } from "@/lib/forms/row-keys";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { centsToDecimalString } from "@/lib/money";
import { calculatePayroll } from "@/lib/payroll/calculate";
import { hundredthsToInput } from "@/lib/payroll/convert";
import type { EarningLine, PayrollResult } from "@/lib/payroll/types";
import { itemInputsSchema } from "@/lib/validation/payroll";
import { saveItemInputs } from "@/server/payroll/actions";
import type { ItemView, RunCalcContext } from "./types";

export function breakdownFromItem(item: ItemView, context: RunCalcContext): BreakdownData {
  return {
    ...item,
    overtimeHours: item.overtimeHundredths / 100,
    noPayDays: item.noPayDaysHundredths / 100,
    allowances: item.lines
      .filter((l) => l.source !== "OTHER_DEDUCTION")
      .map((l) => ({ label: l.label, amountCents: l.amountCents, epfLiable: l.epfLiable, extra: l.source === "EXTRA_ALLOWANCE" })),
    deductions: item.lines.filter((l) => l.source === "OTHER_DEDUCTION"),
    rates: context.rates,
  };
}

type Row = { key: string; label: string; amount: string; epfLiable?: boolean };
/** Edit one employee's monthly inputs, with a live preview from the shared payroll engine. */
export function ItemEditor({ item, context }: { item: ItemView; context: RunCalcContext }) {
  const { state, pending, onSubmit, error } = useValidatedAction(itemInputsSchema, saveItemInputs);
  const fixed: EarningLine[] = item.lines
    .filter((l) => l.source === "FIXED_ALLOWANCE")
    .map((l) => ({ label: l.label, amountCents: l.amountCents, epfLiable: l.epfLiable }));

  const key = useNewRowKey("r");
  const [extras, setExtras] = useState<Row[]>(() =>
    item.lines
      .filter((l) => l.source === "EXTRA_ALLOWANCE")
      .map((l, i) => ({
        key: initialRowKey("extra", i),
        label: l.label,
        amount: centsToDecimalString(l.amountCents),
        epfLiable: l.epfLiable,
      })),
  );
  const [deductions, setDeductions] = useState<Row[]>(() =>
    item.lines
      .filter((l) => l.source === "OTHER_DEDUCTION")
      .map((l, i) => ({ key: initialRowKey("deduction", i), label: l.label, amount: centsToDecimalString(l.amountCents) })),
  );
  const [preview, setPreview] = useState<BreakdownData>(() => breakdownFromItem(item, context));

  function recalc(form: HTMLFormElement) {
    const parsed = itemInputsSchema.safeParse(formDataToObject(new FormData(form)));
    if (!parsed.success) return; // keep the last valid preview while the user is mid-typing
    const inputs = parsed.data;
    const extraLines = inputs.extraAllowances.map((a) => ({ label: a.label, amountCents: a.amount, epfLiable: a.epfLiable }));
    const deductionLines = inputs.otherDeductions.map((d) => ({ label: d.label, amountCents: d.amount }));
    const result: PayrollResult = calculatePayroll(
      {
        basicCents: item.basicCents,
        fixedAllowances: fixed,
        extraAllowances: extraLines,
        overtimeHundredths: inputs.overtimeHours,
        noPayDaysHundredths: inputs.noPayDays,
        otherDeductions: deductionLines,
      },
      context,
    );
    setPreview({
      ...result,
      overtimeHours: inputs.overtimeHours / 100,
      noPayDays: inputs.noPayDays / 100,
      allowances: [
        ...fixed.map((a) => ({ ...a, extra: false })),
        ...extraLines.map((a) => ({ ...a, extra: true })),
      ],
      deductions: deductionLines,
      rates: context.rates,
    });
  }

  const recalcLater = (form: HTMLFormElement | null) => form && requestAnimationFrame(() => recalc(form));

  return (
    <form
      onSubmit={onSubmit}
      onChange={(e: FormEvent<HTMLFormElement>) => recalc(e.currentTarget)}
      noValidate
      className="space-y-5"
    >
      <input type="hidden" name="itemId" value={item.id} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Overtime hours"
          id={`${item.id}-ot`}
          name="overtimeHours"
          inputMode="decimal"
          defaultValue={hundredthsToInput(item.overtimeHundredths)}
          placeholder="0"
          error={error("overtimeHours")}
        />
        <Field
          label="No-pay leave (days)"
          id={`${item.id}-np`}
          name="noPayDays"
          inputMode="decimal"
          defaultValue={hundredthsToInput(item.noPayDaysHundredths)}
          placeholder="0"
          hint="Half day = 0.5"
          error={error("noPayDays")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <LineList
          title="Extra allowances this month"
          prefix="extraAllowances"
          rows={extras}
          withEpf
          error={error}
          itemId={item.id}
          onAdd={() => setExtras((r) => [...r, { key: key(), label: "", amount: "", epfLiable: false }])}
          onRemove={(k, form) => {
            setExtras((r) => r.filter((row) => row.key !== k));
            recalcLater(form);
          }}
        />
        <LineList
          title="Other deductions (advance, loan…)"
          prefix="otherDeductions"
          rows={deductions}
          error={error}
          itemId={item.id}
          onAdd={() => setDeductions((r) => [...r, { key: key(), label: "", amount: "" }])}
          onRemove={(k, form) => {
            setDeductions((r) => r.filter((row) => row.key !== k));
            recalcLater(form);
          }}
        />
      </div>

      <div className="rounded-lg bg-background p-4 ring-1 ring-border">
        <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Live preview</p>
        <PayBreakdown data={preview} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <FormMessage status={state.status} message={state.message} />
        <Button type="submit" disabled={pending} className="sm:ml-auto">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function LineList({
  title,
  prefix,
  rows,
  withEpf = false,
  error,
  itemId,
  onAdd,
  onRemove,
}: {
  title: string;
  prefix: string;
  rows: Row[];
  withEpf?: boolean;
  error: (path: string) => string | undefined;
  itemId: string;
  onAdd: () => void;
  onRemove: (key: string, form: HTMLFormElement | null) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      {rows.length === 0 ? <p className="text-sm text-muted">None.</p> : null}
      {rows.map((row, index) => (
        <div key={row.key} className="grid gap-2 rounded-lg border border-border bg-surface p-2.5 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
          <Field
            label="Description"
            id={`${itemId}-${row.key}-label`}
            name={`${prefix}[${index}][label]`}
            defaultValue={row.label}
            error={error(`${prefix}.${index}.label`)}
          />
          <Field
            label="Rs."
            id={`${itemId}-${row.key}-amount`}
            name={`${prefix}[${index}][amount]`}
            inputMode="decimal"
            defaultValue={row.amount}
            error={error(`${prefix}.${index}.amount`)}
          />
          <div className="flex items-center gap-2 sm:pb-1">
            {withEpf ? (
              <Checkbox
                label="EPF"
                id={`${itemId}-${row.key}-epf`}
                name={`${prefix}[${index}][epfLiable]`}
                defaultChecked={row.epfLiable}
              />
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove ${title.toLowerCase()} ${index + 1}`}
              onClick={(e) => onRemove(row.key, e.currentTarget.form)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={onAdd}>
        <Plus className="size-4" aria-hidden />
        Add
      </Button>
    </fieldset>
  );
}

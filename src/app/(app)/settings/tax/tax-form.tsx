"use client";

import { Info, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, FormMessage } from "@/components/ui/field";
import { initialRowKey, useNewRowKey } from "@/lib/forms/row-keys";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { taxTableSchema } from "@/lib/validation/payroll";
import { saveTaxTable } from "@/server/settings/tax-actions";

export type TaxDefaults = {
  apitEnabled: boolean;
  name: string;
  effectiveFrom: string;
  brackets: { fromCents: string; toCents: string; rateBp: string }[];
};

export function TaxForm({ defaults }: { defaults: TaxDefaults }) {
  const { state, pending, onSubmit, error } = useValidatedAction(taxTableSchema, saveTaxTable);
  const key = useNewRowKey("b");
  const [rows, setRows] = useState(() => defaults.brackets.map((b, i) => ({ key: initialRowKey("b", i), ...b })));
  const bracketError = error("brackets");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="flex gap-2 rounded-lg bg-accent-soft p-4 text-sm ring-1 ring-accent/40">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <strong>Optional hook.</strong> PayLanka ships with <strong>no tax rates</strong>. Enter the monthly APIT
          brackets from the current Inland Revenue tax table yourself and verify them before switching this on. Tax is
          calculated progressively on each employee&apos;s monthly gross pay.
        </span>
      </p>

      <Card className="p-5 sm:p-6">
        <Checkbox
          label="Deduct APIT (income tax) in payroll"
          name="apitEnabled"
          defaultChecked={defaults.apitEnabled}
          description="When off, no income tax is deducted — the table below is kept for later."
        />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Table name" name="name" defaultValue={defaults.name} error={error("name")} placeholder="e.g. APIT Table 1 – 2026/27" />
          <Field label="Effective from" name="effectiveFrom" type="date" defaultValue={defaults.effectiveFrom} error={error("effectiveFrom")} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">Monthly brackets</h2>
        <p className="mt-1 text-sm text-muted">
          Each bracket taxes only the part of income inside it. Start at 0, make each bracket start where the previous
          one ends, and leave the last &ldquo;To&rdquo; empty.
        </p>

        <div className="mt-5 space-y-2">
          {rows.length === 0 ? <p className="text-sm text-muted">No brackets yet.</p> : null}
          {rows.map((row, index) => (
            <div key={row.key} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
              <Field label="From (Rs.)" id={`${row.key}-from`} name={`brackets[${index}][fromCents]`} inputMode="decimal" defaultValue={row.fromCents} error={error(`brackets.${index}.fromCents`)} />
              <Field label="To (Rs.)" id={`${row.key}-to`} name={`brackets[${index}][toCents]`} inputMode="decimal" defaultValue={row.toCents} placeholder="No limit" error={error(`brackets.${index}.toCents`)} />
              <Field label="Rate (%)" id={`${row.key}-rate`} name={`brackets[${index}][rateBp]`} inputMode="decimal" defaultValue={row.rateBp} error={error(`brackets.${index}.rateBp`)} />
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove bracket ${index + 1}`}
                className="justify-self-start sm:mb-1"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          {bracketError ? <p className="text-sm text-error">{bracketError}</p> : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setRows((r) => [...r, { key: key(), fromCents: r.at(-1)?.toCents ?? (r.length === 0 ? "0" : ""), toCents: "", rateBp: "" }])
            }
          >
            <Plus className="size-4" aria-hidden />
            Add bracket
          </Button>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <FormMessage status={state.status} message={state.message} />
        <Button type="submit" disabled={pending} className="sm:ml-auto">
          {pending ? "Saving…" : "Save tax settings"}
        </Button>
      </div>
    </form>
  );
}

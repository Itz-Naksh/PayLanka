"use client";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { createRunSchema } from "@/lib/validation/payroll";
import { createRun } from "@/server/payroll/actions";

export function NewRunForm({ defaultPeriod, maxPeriod }: { defaultPeriod: string; maxPeriod: string }) {
  const { state, pending, onSubmit, error } = useValidatedAction(createRunSchema, createRun);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        label="Payroll month"
        name="period"
        type="month"
        defaultValue={defaultPeriod}
        max={maxPeriod}
        error={error("period")}
        className="max-w-xs"
      />
      <FormMessage status={state.status} message={state.message} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create draft payroll"}
      </Button>
    </form>
  );
}

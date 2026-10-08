"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormMessage, TextareaField } from "@/components/ui/field";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { companySettingsSchema } from "@/lib/validation/settings";
import { updateCompanySettings } from "@/server/settings/actions";

export type CompanyDefaults = {
  name: string;
  address: string;
  epfRegNo: string;
  etfRegNo: string;
  epfEmployeeRateBp: string;
  epfEmployerRateBp: string;
  etfEmployerRateBp: string;
  otHourlyDivisor: string;
  otMultiplierBp: string;
  noPayDayDivisor: string;
};

export function CompanyForm({ defaults }: { defaults: CompanyDefaults }) {
  const { state, pending, onSubmit, error } = useValidatedAction(companySettingsSchema, updateCompanySettings);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">Company details</h2>
        <p className="mt-1 text-sm text-muted">Shown on payslips and statutory reports.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Company name" name="name" defaultValue={defaults.name} error={error("name")} />
          <TextareaField
            label="Address"
            name="address"
            defaultValue={defaults.address}
            error={error("address")}
            className="sm:row-span-2"
          />
          <Field label="EPF registration number" name="epfRegNo" defaultValue={defaults.epfRegNo} error={error("epfRegNo")} />
          <Field label="ETF registration number" name="etfRegNo" defaultValue={defaults.etfRegNo} error={error("etfRegNo")} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">Contribution rates</h2>
        <p className="mt-1 text-sm text-muted">
          Applied to EPF/ETF-liable earnings (basic salary + allowances marked EPF/ETF liable − no-pay deduction).
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <Field
            label="EPF – employee (%)"
            name="epfEmployeeRateBp"
            inputMode="decimal"
            defaultValue={defaults.epfEmployeeRateBp}
            error={error("epfEmployeeRateBp")}
            hint="Deducted from the employee"
          />
          <Field
            label="EPF – employer (%)"
            name="epfEmployerRateBp"
            inputMode="decimal"
            defaultValue={defaults.epfEmployerRateBp}
            error={error("epfEmployerRateBp")}
            hint="Paid by the company"
          />
          <Field
            label="ETF – employer (%)"
            name="etfEmployerRateBp"
            inputMode="decimal"
            defaultValue={defaults.etfEmployerRateBp}
            error={error("etfEmployerRateBp")}
            hint="Paid by the company"
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">Overtime & no-pay leave</h2>
        <p className="mt-1 text-sm text-muted">
          Overtime pay = basic ÷ hourly divisor × multiplier × hours. No-pay deduction = basic ÷ day divisor × days.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <Field
            label="OT hourly divisor"
            name="otHourlyDivisor"
            inputMode="numeric"
            defaultValue={defaults.otHourlyDivisor}
            error={error("otHourlyDivisor")}
            hint="Commonly 240"
          />
          <Field
            label="OT multiplier"
            name="otMultiplierBp"
            inputMode="decimal"
            defaultValue={defaults.otMultiplierBp}
            error={error("otMultiplierBp")}
            hint="1.5 = time and a half"
          />
          <Field
            label="No-pay day divisor"
            name="noPayDayDivisor"
            inputMode="numeric"
            defaultValue={defaults.noPayDayDivisor}
            error={error("noPayDayDivisor")}
            hint="30 (calendar) or 26 (working days)"
          />
        </div>
      </Card>

      <p className="flex gap-2 rounded-lg bg-accent-soft p-4 text-sm text-foreground ring-1 ring-accent/40">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Rates are not hard-coded so they can follow changes in law. Verify them against current EPF/ETF regulations.
          Changes apply to payroll runs created <strong>after</strong> saving; existing runs keep the rates they were
          created with.
        </span>
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <FormMessage status={state.status} message={state.message} />
        <Button type="submit" disabled={pending} className="sm:ml-auto">
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

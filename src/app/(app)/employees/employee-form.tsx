"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, FormMessage, SelectField } from "@/components/ui/field";
import { formDataToObject } from "@/lib/forms/form-data";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { formatLKR, parseRupees } from "@/lib/money";
import { employeeSchema } from "@/lib/validation/employee";
import { saveEmployee } from "@/server/employees/actions";

export type AllowanceDefaults = { name: string; amount: string; epfLiable: boolean };

export type EmployeeDefaults = {
  id?: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  nic: string;
  epfNo: string;
  departmentId: string;
  designation: string;
  joinDate: string;
  bankName: string;
  bankBranch: string;
  accountNo: string;
  basicSalary: string;
  allowances: AllowanceDefaults[];
};

const SRI_LANKAN_BANKS = [
  "Bank of Ceylon",
  "People's Bank",
  "Commercial Bank",
  "Hatton National Bank",
  "Sampath Bank",
  "Seylan Bank",
  "Nations Trust Bank",
  "DFCC Bank",
  "NDB Bank",
  "Pan Asia Bank",
  "Union Bank",
  "Amana Bank",
  "Cargills Bank",
  "National Savings Bank",
];

type Summary = { fixedPay: number; epfLiable: number };

/** Live preview of fixed monthly pay and the EPF/ETF base, from the current form values. */
function summarize(values: Record<string, unknown>): Summary {
  const basic = parseRupees(String(values.basicSalary ?? "")) ?? 0;
  const rows = (Array.isArray(values.allowances) ? values.allowances : []) as Record<string, string>[];
  let fixedPay = basic;
  let epfLiable = basic;
  for (const row of rows) {
    const amount = parseRupees(row.amount ?? "") ?? 0;
    fixedPay += amount;
    if (row.epfLiable === "on") epfLiable += amount;
  }
  return { fixedPay, epfLiable };
}

function summarizeDefaults(d: EmployeeDefaults): Summary {
  return summarize({
    basicSalary: d.basicSalary,
    allowances: d.allowances.map((a) => ({ amount: a.amount, epfLiable: a.epfLiable ? "on" : undefined })),
  });
}

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

export function EmployeeForm({
  defaults,
  departments,
}: {
  defaults: EmployeeDefaults;
  departments: { id: string; name: string }[];
}) {
  const { state, pending, onSubmit, error } = useValidatedAction(employeeSchema, saveEmployee);
  const [rows, setRows] = useState(() => defaults.allowances.map((a) => ({ key: newKey(), defaults: a })));
  const [summary, setSummary] = useState(() => summarizeDefaults(defaults));

  function refreshSummary(event: FormEvent<HTMLFormElement>) {
    setSummary(summarize(formDataToObject(new FormData(event.currentTarget))));
  }

  function addRow() {
    setRows((current) => [...current, { key: newKey(), defaults: { name: "", amount: "", epfLiable: false } }]);
  }

  function removeRow(key: string, form: HTMLFormElement | null) {
    setRows((current) => current.filter((r) => r.key !== key));
    // Recalculate after React has removed the row's inputs.
    if (form) requestAnimationFrame(() => setSummary(summarize(formDataToObject(new FormData(form)))));
  }

  return (
    <form onSubmit={onSubmit} onChange={refreshSummary} noValidate className="space-y-6">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <Section title="Personal details">
        <Field label="First name" name="firstName" defaultValue={defaults.firstName} error={error("firstName")} autoComplete="off" />
        <Field label="Last name" name="lastName" defaultValue={defaults.lastName} error={error("lastName")} autoComplete="off" />
        <Field
          label="NIC number"
          name="nic"
          defaultValue={defaults.nic}
          error={error("nic")}
          hint="Old (851234567V) or new (198512345678) format"
          autoComplete="off"
        />
      </Section>

      <Section title="Employment">
        <Field label="Employee number" name="employeeNo" defaultValue={defaults.employeeNo} error={error("employeeNo")} />
        <Field label="EPF number" name="epfNo" defaultValue={defaults.epfNo} error={error("epfNo")} hint="Optional" />
        <SelectField label="Department" name="departmentId" defaultValue={defaults.departmentId} error={error("departmentId")}>
          <option value="">Choose…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
        <Field label="Designation" name="designation" defaultValue={defaults.designation} error={error("designation")} />
        <Field label="Join date" name="joinDate" type="date" defaultValue={defaults.joinDate} error={error("joinDate")} />
      </Section>

      <Section title="Bank details" description="Used for the monthly bank transfer list.">
        <Field label="Bank" name="bankName" list="sl-banks" defaultValue={defaults.bankName} error={error("bankName")} />
        <datalist id="sl-banks">
          {SRI_LANKAN_BANKS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
        <Field label="Branch" name="bankBranch" defaultValue={defaults.bankBranch} error={error("bankBranch")} hint="Optional" />
        <Field label="Account number" name="accountNo" defaultValue={defaults.accountNo} error={error("accountNo")} />
      </Section>

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">Salary & fixed allowances</h2>
        <p className="mt-1 text-sm text-muted">
          Tick <strong className="font-semibold text-foreground">EPF/ETF liable</strong> for allowances that form part of
          &ldquo;total earnings&rdquo; for EPF and ETF. Unticked allowances are paid but not contributed on.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-5">
            <Field
              label="Basic salary (Rs.)"
              name="basicSalary"
              inputMode="decimal"
              defaultValue={defaults.basicSalary}
              error={error("basicSalary")}
              className="max-w-xs"
            />

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Fixed monthly allowances</legend>
              {rows.length === 0 ? <p className="text-sm text-muted">No fixed allowances.</p> : null}
              {rows.map((row, index) => (
                <div
                  key={row.key}
                  className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_10rem_auto_auto] sm:items-end"
                >
                  <Field
                    label="Name"
                    id={`allowance-${row.key}-name`}
                    name={`allowances[${index}][name]`}
                    defaultValue={row.defaults.name}
                    placeholder="e.g. Transport"
                    error={error(`allowances.${index}.name`)}
                  />
                  <Field
                    label="Amount (Rs.)"
                    id={`allowance-${row.key}-amount`}
                    name={`allowances[${index}][amount]`}
                    inputMode="decimal"
                    defaultValue={row.defaults.amount}
                    error={error(`allowances.${index}.amount`)}
                  />
                  <div className="sm:pb-2.5">
                    <Checkbox
                      label="EPF/ETF liable"
                      id={`allowance-${row.key}-epf`}
                      name={`allowances[${index}][epfLiable]`}
                      defaultChecked={row.defaults.epfLiable}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove allowance ${index + 1}`}
                    onClick={(e) => removeRow(row.key, e.currentTarget.form)}
                    className="justify-self-start sm:mb-1"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addRow}>
                <Plus className="size-4" aria-hidden />
                Add allowance
              </Button>
            </fieldset>
          </div>

          <aside className="h-fit rounded-lg bg-background p-4 text-sm ring-1 ring-border" aria-live="polite">
            <p className="font-semibold">Monthly summary</p>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Fixed monthly pay</dt>
                <dd className="money font-semibold">{formatLKR(summary.fixedPay)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">EPF/ETF liable earnings</dt>
                <dd className="money font-semibold">{formatLKR(summary.epfLiable)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Before overtime and no-pay leave, which are entered in each payroll run.
            </p>
          </aside>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage status={state.status} message={state.message} />
        <Button type="submit" disabled={pending} className="sm:ml-auto">
          {pending ? "Saving…" : defaults.id ? "Save changes" : "Create employee"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </Card>
  );
}

/**
 * Turns stored audit entries (action + JSON metadata) into plain sentences for
 * the audit log page. Pure, so it is unit-tested and safe on any input shape.
 */
import { formatLKR, formatRateBp } from "./money";

export const ACTION_LABELS: Record<string, string> = {
  SETTINGS_UPDATED: "Company settings changed",
  TAX_TABLE_UPDATED: "APIT tax table changed",
  EMPLOYEE_CREATED: "Employee added",
  EMPLOYEE_UPDATED: "Employee edited",
  EMPLOYEE_DEACTIVATED: "Employee deactivated",
  EMPLOYEE_REACTIVATED: "Employee reactivated",
  DEPARTMENT_CREATED: "Department added",
  DEPARTMENT_RENAMED: "Department renamed",
  DEPARTMENT_DELETED: "Department deleted",
  USER_CREATED: "User created",
  USER_UPDATED: "User edited",
  USER_PASSWORD_RESET: "Password reset by admin",
  USER_PASSWORD_CHANGED: "Password changed",
  PAYROLL_CREATED: "Payroll created",
  PAYROLL_UPDATED: "Payroll line edited",
  PAYROLL_REFRESHED: "Payroll draft refreshed",
  PAYROLL_SUBMITTED: "Payroll submitted for review",
  PAYROLL_RETURNED: "Payroll returned to draft",
  PAYROLL_APPROVED: "Payroll approved & locked",
  PAYROLL_DELETED: "Payroll draft deleted",
};

export const AUDIT_CATEGORIES = {
  payroll: { label: "Payroll", prefix: "PAYROLL_" },
  employees: { label: "Employees & departments", prefix: ["EMPLOYEE_", "DEPARTMENT_"] },
  users: { label: "Users & passwords", prefix: "USER_" },
  settings: { label: "Settings & tax", prefix: ["SETTINGS_", "TAX_"] },
} as const;
export type AuditCategory = keyof typeof AUDIT_CATEGORIES;

export type AuditTone = "neutral" | "success" | "warning" | "error";

export function actionTone(action: string): AuditTone {
  if (action === "PAYROLL_APPROVED") return "success";
  if (action === "PAYROLL_RETURNED" || action.endsWith("_DEACTIVATED") || action.includes("PASSWORD_RESET")) {
    return "warning";
  }
  if (action.endsWith("_DELETED")) return "error";
  return "neutral";
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  address: "Address",
  epfRegNo: "EPF reg. no.",
  etfRegNo: "ETF reg. no.",
  epfEmployeeRateBp: "EPF employee rate",
  epfEmployerRateBp: "EPF employer rate",
  etfEmployerRateBp: "ETF employer rate",
  otHourlyDivisor: "OT hourly divisor",
  otMultiplierBp: "OT multiplier",
  noPayDayDivisor: "No-pay day divisor",
  employeeNo: "Employee no.",
  firstName: "First name",
  lastName: "Last name",
  nic: "NIC",
  epfNo: "EPF no.",
  departmentId: "Department",
  designation: "Designation",
  joinDate: "Join date",
  bankName: "Bank",
  bankBranch: "Branch",
  accountNo: "Account no.",
  basicSalaryCents: "Basic salary",
  allowances: "Fixed allowances",
  role: "Role",
  isActive: "Active",
  employeeId: "Linked employee",
};

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const isObject = (v: unknown): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Format one stored value for people, using the field name to pick the unit. */
export function formatValue(key: string, value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.endsWith("Id")) return "changed";
  if (key === "otMultiplierBp" && typeof value === "number") return `${value / 10_000}×`;
  if (key.endsWith("Bp") && typeof value === "number") return formatRateBp(value);
  if (key.endsWith("Cents") && typeof value === "number") return formatLKR(value);
  if (key === "allowances" && Array.isArray(value)) {
    if (value.length === 0) return "none";
    return value
      .filter(isObject)
      .map((a) => `${a.name} ${formatLKR(Number(a.amountCents ?? 0))}${a.epfLiable ? " (EPF)" : ""}`)
      .join(", ");
  }
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "none";
  if (isObject(value)) return JSON.stringify(value);
  return String(value);
}

export type AuditChange = { field: string; from: string; to: string };

/** "Basic salary: Rs. 85,000.00 → Rs. 90,000.00" rows from a `changes` object. */
export function describeChanges(metadata: unknown): AuditChange[] {
  if (!isObject(metadata) || !isObject(metadata.changes)) return [];
  return Object.entries(metadata.changes).flatMap(([key, change]) =>
    isObject(change)
      ? [{ field: FIELD_LABELS[key] ?? key, from: formatValue(key, change.from), to: formatValue(key, change.to) }]
      : [],
  );
}

/** A one-line summary of what the entry is about. */
export function describeEntry(action: string, metadata: unknown): string {
  const m = isObject(metadata) ? metadata : {};
  const s = (key: string) => (typeof m[key] === "string" || typeof m[key] === "number" ? String(m[key]) : "");
  const money = (key: string) => (typeof m[key] === "number" ? formatLKR(m[key] as number) : "");

  switch (action) {
    case "PAYROLL_CREATED":
      return `${s("period")} · ${s("employees")} employees`;
    case "PAYROLL_UPDATED": {
      const parts = [
        Number(m.overtimeHours) ? `OT ${s("overtimeHours")} h` : null,
        Number(m.noPayDays) ? `no-pay ${s("noPayDays")} d` : null,
        Number(m.extraAllowancesCents) ? `extras ${money("extraAllowancesCents")}` : null,
        Number(m.otherDeductionsCents) ? `deductions ${money("otherDeductionsCents")}` : null,
      ].filter(Boolean);
      return `${s("employeeNo")}${parts.length ? ` · ${parts.join(", ")}` : ""} · net ${money("netCents")}`;
    }
    case "PAYROLL_REFRESHED": {
      const removed = Array.isArray(m.removed) ? m.removed.length : 0;
      return `${s("period")} · ${s("added") || 0} added, ${removed} removed`;
    }
    case "PAYROLL_APPROVED":
      return `${s("period")} · ${s("employees")} employees · gross ${money("grossCents")} · net ${money("netCents")}`;
    case "PAYROLL_RETURNED":
      return `${s("period")} · “${s("note")}”`;
    case "PAYROLL_SUBMITTED":
    case "PAYROLL_DELETED":
      return s("period");
    case "EMPLOYEE_CREATED":
      return `${s("employeeNo")} · ${s("name")}`;
    case "EMPLOYEE_UPDATED":
    case "EMPLOYEE_DEACTIVATED":
    case "EMPLOYEE_REACTIVATED":
      return s("employeeNo");
    case "DEPARTMENT_RENAMED":
      return `${s("from")} → ${s("to")}`;
    case "DEPARTMENT_CREATED":
    case "DEPARTMENT_DELETED":
      return s("name");
    case "USER_CREATED":
      return `${s("email")} · ${s("role")}`;
    case "USER_UPDATED":
    case "USER_PASSWORD_RESET":
    case "USER_PASSWORD_CHANGED":
      return s("email");
    case "TAX_TABLE_UPDATED": {
      const count = Array.isArray(m.brackets) ? m.brackets.length : 0;
      return `${s("name")} · ${count} brackets · APIT ${m.apitEnabled ? "on" : "off"}`;
    }
    default:
      return "";
  }
}

/** Where the entry's subject can be opened in the app, if anywhere. */
export function entityHref(entityType: string, entityId: string, action: string): string | null {
  if (action.endsWith("_DELETED")) return null; // it no longer exists
  switch (entityType) {
    case "PayrollRun":
      return `/payroll/${entityId}`;
    case "Employee":
      return `/employees/${entityId}`;
    case "User":
      return `/settings/users/${entityId}`;
    case "CompanySettings":
      return "/settings/company";
    case "TaxTable":
      return "/settings/tax";
    case "Department":
      return "/employees/departments";
    default:
      return null;
  }
}

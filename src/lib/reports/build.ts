import { sumCents } from "@/lib/money";
import type { Report, ReportColumn, ReportItem, ReportRates, ReportRow } from "./types";

export const REPORT_TYPES = ["summary", "epf-etf", "departments", "bank-transfer"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TITLES: Record<ReportType, string> = {
  summary: "Payroll summary",
  "epf-etf": "EPF / ETF contributions",
  departments: "Department cost",
  "bank-transfer": "Bank transfer list",
};

export function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

const pct = (bp: number) => `${bp / 100}%`;

/** Sum the money/count columns of the given rows. */
function totalsFor(columns: ReportColumn[], rows: ReportRow[], labelKey: string): ReportRow {
  const totals: ReportRow = {};
  for (const column of columns) {
    if (column.kind === "money" || column.kind === "count") {
      totals[column.key] = sumCents(rows.map((r) => Number(r[column.key] ?? 0)));
    } else {
      totals[column.key] = null;
    }
  }
  totals[labelKey] = "Total";
  return totals;
}

/** Every earnings and deduction component, one row per employee. */
export function payrollSummary(items: ReportItem[], rates: ReportRates): Report {
  const columns: ReportColumn[] = [
    { key: "employeeNo", label: "No.", kind: "text" },
    { key: "employee", label: "Employee", kind: "text", emphasis: true },
    { key: "department", label: "Department", kind: "text", wide: true },
    { key: "basic", label: "Basic", kind: "money", wide: true },
    { key: "allowances", label: "Allowances", kind: "money", wide: true },
    { key: "overtime", label: "Overtime", kind: "money", wide: true },
    { key: "noPay", label: "No-pay", kind: "money", wide: true },
    { key: "gross", label: "Gross pay", kind: "money" },
    { key: "epfEmployee", label: `EPF ${pct(rates.epfEmployeeRateBp)}`, kind: "money", wide: true },
    { key: "apit", label: "APIT", kind: "money", wide: true },
    { key: "otherDeductions", label: "Other deductions", kind: "money", wide: true },
    { key: "net", label: "Net pay", kind: "money" },
    { key: "epfEmployer", label: `EPF ${pct(rates.epfEmployerRateBp)} (employer)`, kind: "money", wide: true },
    { key: "etfEmployer", label: `ETF ${pct(rates.etfEmployerRateBp)}`, kind: "money", wide: true },
    { key: "employerCost", label: "Employer cost", kind: "money" },
  ];
  const rows = items.map((i) => ({
    employeeNo: i.employeeNo,
    employee: i.employeeName,
    department: i.departmentName,
    basic: i.basicCents,
    allowances: i.fixedAllowancesCents + i.extraAllowancesCents,
    overtime: i.overtimeCents,
    noPay: -i.noPayCents,
    gross: i.grossCents,
    epfEmployee: i.epfEmployeeCents,
    apit: i.apitCents,
    otherDeductions: i.otherDeductionsCents,
    net: i.netCents,
    epfEmployer: i.epfEmployerCents,
    etfEmployer: i.etfEmployerCents,
    employerCost: i.grossCents + i.epfEmployerCents + i.etfEmployerCents,
  }));
  return { columns, rows, totals: totalsFor(columns, rows, "employeeNo") };
}

/**
 * Monthly EPF / ETF return figures per member (the information needed for the
 * EPF "C" form and the ETF return). Contributions are on EPF-liable earnings.
 */
export function epfEtfReport(items: ReportItem[], rates: ReportRates): Report {
  const columns: ReportColumn[] = [
    { key: "epfNo", label: "EPF no.", kind: "text" },
    { key: "employee", label: "Member name", kind: "text", emphasis: true },
    { key: "nic", label: "NIC", kind: "text", wide: true },
    { key: "earnings", label: "Total earnings", kind: "money" },
    { key: "employee8", label: `Employee ${pct(rates.epfEmployeeRateBp)}`, kind: "money", wide: true },
    { key: "employer12", label: `Employer ${pct(rates.epfEmployerRateBp)}`, kind: "money", wide: true },
    { key: "epfTotal", label: "Total EPF", kind: "money" },
    { key: "etf", label: `ETF ${pct(rates.etfEmployerRateBp)}`, kind: "money" },
  ];
  const rows = [...items]
    .sort((a, b) => (a.epfNo ?? "").localeCompare(b.epfNo ?? "", undefined, { numeric: true }))
    .map((i) => ({
      epfNo: i.epfNo ?? "",
      employee: i.employeeName,
      nic: i.nic,
      earnings: i.epfLiableCents,
      employee8: i.epfEmployeeCents,
      employer12: i.epfEmployerCents,
      epfTotal: i.epfEmployeeCents + i.epfEmployerCents,
      etf: i.etfEmployerCents,
    }));
  return { columns, rows, totals: totalsFor(columns, rows, "epfNo") };
}

/** Total cost per department, with each department's share of the whole. */
export function departmentCost(items: ReportItem[]): Report {
  const columns: ReportColumn[] = [
    { key: "department", label: "Department", kind: "text", emphasis: true },
    { key: "employees", label: "Employees", kind: "count" },
    { key: "gross", label: "Gross pay", kind: "money", wide: true },
    { key: "epfEtf", label: "Employer EPF + ETF", kind: "money", wide: true },
    { key: "cost", label: "Total cost", kind: "money" },
    { key: "average", label: "Average per employee", kind: "money", wide: true },
    { key: "share", label: "Share of cost", kind: "percentBp" },
  ];

  const groups = new Map<string, ReportItem[]>();
  for (const item of items) groups.set(item.departmentName, [...(groups.get(item.departmentName) ?? []), item]);
  const totalCost = sumCents(items.map((i) => i.grossCents + i.epfEmployerCents + i.etfEmployerCents));

  const rows = [...groups.entries()]
    .map(([department, members]) => {
      const gross = sumCents(members.map((m) => m.grossCents));
      const epfEtf = sumCents(members.map((m) => m.epfEmployerCents + m.etfEmployerCents));
      const cost = gross + epfEtf;
      return {
        department,
        employees: members.length,
        gross,
        epfEtf,
        cost,
        average: Math.round(cost / members.length),
        share: totalCost === 0 ? 0 : Math.round((cost * 10_000) / totalCost),
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const totals = totalsFor(columns, rows, "department");
  totals.average = rows.length === 0 ? 0 : Math.round(Number(totals.cost) / Number(totals.employees));
  totals.share = totalCost === 0 ? 0 : 10_000;
  return { columns, rows, totals };
}

/** Who to pay, where: grouped by bank so each bank's batch is easy to prepare. */
export function bankTransferList(items: ReportItem[]): Report {
  const columns: ReportColumn[] = [
    { key: "bank", label: "Bank", kind: "text" },
    { key: "branch", label: "Branch", kind: "text", wide: true },
    { key: "accountNo", label: "Account no.", kind: "text" },
    { key: "employeeNo", label: "Employee no.", kind: "text", wide: true },
    { key: "employee", label: "Account holder", kind: "text", emphasis: true },
    { key: "net", label: "Amount", kind: "money" },
  ];
  const rows = [...items]
    .sort((a, b) => a.bankName.localeCompare(b.bankName) || a.employeeNo.localeCompare(b.employeeNo))
    .map((i) => ({
      bank: i.bankName,
      branch: i.bankBranch ?? "",
      accountNo: i.accountNo,
      employeeNo: i.employeeNo,
      employee: i.employeeName,
      net: i.netCents,
    }));
  return { columns, rows, totals: totalsFor(columns, rows, "bank") };
}

/** Per-bank subtotals for the bank list. */
export function bankTotals(items: ReportItem[]) {
  const byBank = new Map<string, { bank: string; transfers: number; amountCents: number }>();
  for (const item of items) {
    const entry = byBank.get(item.bankName) ?? { bank: item.bankName, transfers: 0, amountCents: 0 };
    entry.transfers++;
    entry.amountCents += item.netCents;
    byBank.set(item.bankName, entry);
  }
  return [...byBank.values()].sort((a, b) => b.amountCents - a.amountCents);
}

export function buildReport(type: ReportType, items: ReportItem[], rates: ReportRates): Report {
  switch (type) {
    case "summary":
      return payrollSummary(items, rates);
    case "epf-etf":
      return epfEtfReport(items, rates);
    case "departments":
      return departmentCost(items);
    case "bank-transfer":
      return bankTransferList(items);
  }
}

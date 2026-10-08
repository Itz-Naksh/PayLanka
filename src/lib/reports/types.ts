/**
 * A report is a list of columns plus rows of raw values. The same definition
 * drives the on-screen table AND the CSV export, so the two can never disagree.
 */
export type ColumnKind = "text" | "money" | "count" | "percentBp";

export type ReportColumn = {
  key: string;
  label: string;
  kind: ColumnKind;
  /** Hide on narrow screens (still exported to CSV). */
  wide?: boolean;
  /** The row's name column, shown slightly bolder. */
  emphasis?: boolean;
};

export type ReportValue = string | number | null;
export type ReportRow = Record<string, ReportValue>;

export type Report = {
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Totals row (first text column shows "Total"), or null. */
  totals: ReportRow | null;
};

/** The frozen payroll-item fields the reports read. */
export type ReportItem = {
  employeeNo: string;
  employeeName: string;
  nic: string;
  epfNo: string | null;
  departmentName: string;
  designation: string;
  bankName: string;
  bankBranch: string | null;
  accountNo: string;
  basicCents: number;
  fixedAllowancesCents: number;
  extraAllowancesCents: number;
  overtimeCents: number;
  noPayCents: number;
  grossCents: number;
  epfLiableCents: number;
  epfEmployeeCents: number;
  epfEmployerCents: number;
  etfEmployerCents: number;
  apitCents: number;
  otherDeductionsCents: number;
  totalDeductionsCents: number;
  netCents: number;
};

export type ReportRates = { epfEmployeeRateBp: number; epfEmployerRateBp: number; etfEmployerRateBp: number };

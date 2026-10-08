/**
 * Everything printed on one payslip, as plain data. Built from the frozen
 * payroll item (snapshot), never from the live employee record, so a payslip
 * re-downloaded next year is identical to the one issued.
 */
import { rupeesInWords } from "@/lib/amount-in-words";
import { toHundredths } from "@/lib/payroll/convert";
import { periodKey, periodLabel } from "@/lib/payroll/period";

export type PayslipLine = { label: string; amountCents: number; note?: string };

export type PayslipData = {
  fileName: string;
  final: boolean; // false => "DRAFT" watermark
  company: { name: string; address: string; epfRegNo: string; etfRegNo: string };
  periodLabel: string;
  approval: string | null;
  employee: {
    name: string;
    employeeNo: string;
    nic: string;
    epfNo: string | null;
    department: string;
    designation: string;
    bank: string;
    branch: string | null;
    account: string;
  };
  earnings: PayslipLine[];
  grossCents: number;
  deductions: PayslipLine[];
  totalDeductionsCents: number;
  netCents: number;
  netInWords: string;
  employer: PayslipLine[];
  employerCostCents: number;
};

/** "DEMO-80021993" -> "****1993": enough for the employee to recognise, useless to a thief. */
export function maskAccount(account: string): string {
  const compact = account.replace(/\s+/g, "");
  return compact.length <= 4 ? compact : `****${compact.slice(-4)}`;
}

const pct = (bp: number) => `${bp / 100}%`;

type RunLike = {
  year: number;
  month: number;
  status: "DRAFT" | "REVIEW" | "APPROVED";
  approvedAt: Date | null;
  epfEmployeeRateBp: number;
  epfEmployerRateBp: number;
  etfEmployerRateBp: number;
};

type ItemLike = {
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
  overtimeHours: { toString(): string };
  noPayDays: { toString(): string };
  overtimeCents: number;
  noPayCents: number;
  grossCents: number;
  epfLiableCents: number;
  epfEmployeeCents: number;
  epfEmployerCents: number;
  etfEmployerCents: number;
  apitCents: number;
  totalDeductionsCents: number;
  netCents: number;
  lines: { source: string; label: string; amountCents: number; epfLiable: boolean }[];
};

export function buildPayslipData(
  run: RunLike,
  item: ItemLike,
  company: PayslipData["company"],
  approvedBy: string | null,
  formatDate: (d: Date) => string,
): PayslipData {
  const period = { year: run.year, month: run.month };
  const otHours = toHundredths(item.overtimeHours) / 100;
  const noPayDays = toHundredths(item.noPayDays) / 100;

  const earnings: PayslipLine[] = [{ label: "Basic salary", amountCents: item.basicCents }];
  for (const line of item.lines.filter((l) => l.source !== "OTHER_DEDUCTION")) {
    earnings.push({ label: line.label, amountCents: line.amountCents, note: line.epfLiable ? "EPF" : undefined });
  }
  if (item.overtimeCents > 0) earnings.push({ label: "Overtime", amountCents: item.overtimeCents, note: `${otHours} h` });
  if (item.noPayCents > 0) earnings.push({ label: "No-pay leave", amountCents: -item.noPayCents, note: `${noPayDays} d` });

  const deductions: PayslipLine[] = [
    { label: `EPF employee ${pct(run.epfEmployeeRateBp)}`, amountCents: item.epfEmployeeCents },
  ];
  if (item.apitCents > 0) deductions.push({ label: "APIT (income tax)", amountCents: item.apitCents });
  for (const line of item.lines.filter((l) => l.source === "OTHER_DEDUCTION")) {
    deductions.push({ label: line.label, amountCents: line.amountCents });
  }

  return {
    fileName: `Payslip-${item.employeeNo}-${periodKey(period)}.pdf`,
    final: run.status === "APPROVED",
    company,
    periodLabel: periodLabel(period),
    approval:
      run.status === "APPROVED" && run.approvedAt
        ? `Approved by ${approvedBy ?? "an administrator"} on ${formatDate(run.approvedAt)}`
        : null,
    employee: {
      name: item.employeeName,
      employeeNo: item.employeeNo,
      nic: item.nic,
      epfNo: item.epfNo,
      department: item.departmentName,
      designation: item.designation,
      bank: item.bankName,
      branch: item.bankBranch,
      account: maskAccount(item.accountNo),
    },
    earnings,
    grossCents: item.grossCents,
    deductions,
    totalDeductionsCents: item.totalDeductionsCents,
    netCents: item.netCents,
    netInWords: rupeesInWords(item.netCents),
    employer: [
      { label: "EPF/ETF liable earnings", amountCents: item.epfLiableCents },
      { label: `EPF employer ${pct(run.epfEmployerRateBp)}`, amountCents: item.epfEmployerCents },
      { label: `ETF employer ${pct(run.etfEmployerRateBp)}`, amountCents: item.etfEmployerCents },
    ],
    employerCostCents: item.grossCents + item.epfEmployerCents + item.etfEmployerCents,
  };
}

import type { PayrollRates, TaxBracket } from "@/lib/payroll/types";

/** A payroll item flattened into plain JSON so it can be sent to client components. */
export type ItemView = {
  id: string;
  employeeNo: string;
  employeeName: string;
  departmentName: string;
  designation: string;
  basicCents: number;
  overtimeHundredths: number;
  noPayDaysHundredths: number;
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
  lines: { source: "FIXED_ALLOWANCE" | "EXTRA_ALLOWANCE" | "OTHER_DEDUCTION"; label: string; amountCents: number; epfLiable: boolean }[];
};

export type RunCalcContext = { rates: PayrollRates; apitBrackets: TaxBracket[] | null };

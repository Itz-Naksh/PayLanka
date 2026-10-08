import type { Cents } from "@/lib/money";

/** Rates in force for one payroll run (snapshotted onto the run when it is created). */
export type PayrollRates = {
  epfEmployeeRateBp: number; // 800 = 8%
  epfEmployerRateBp: number; // 1200 = 12%
  etfEmployerRateBp: number; // 300 = 3%
  otHourlyDivisor: number; // hourly rate = basic / 240
  otMultiplierBp: number; // 15000 = 1.5x
  noPayDayDivisor: number; // daily rate = basic / 30
};

/** A monthly income tax bracket: the slice of income from `fromCents` up to `toCents`. */
export type TaxBracket = {
  fromCents: Cents;
  toCents: Cents | null; // null = no upper limit
  rateBp: number;
};

export type EarningLine = { label: string; amountCents: Cents; epfLiable: boolean };
export type DeductionLine = { label: string; amountCents: Cents };

export type PayrollInput = {
  basicCents: Cents;
  /** From the employee record (Transport, Cost of Living, …). */
  fixedAllowances: EarningLine[];
  /** One-off for this month (bonus, arrears, …). */
  extraAllowances: EarningLine[];
  /** Hours x 100, so 2.5 hours = 250. Avoids fractional numbers. */
  overtimeHundredths: number;
  /** Days x 100, so half a day = 50. */
  noPayDaysHundredths: number;
  /** Salary advance, loan instalment, … */
  otherDeductions: DeductionLine[];
};

export type PayrollOptions = {
  rates: PayrollRates;
  /** Optional APIT hook. Omit or pass null to skip income tax entirely. */
  apitBrackets?: TaxBracket[] | null;
};

export type PayrollWarning =
  | "NET_PAY_NEGATIVE" // deductions exceed gross pay — must be fixed before submitting
  | "NO_PAY_EXCEEDS_BASIC"; // no-pay days capped so the deduction never exceeds basic salary

export type PayrollResult = {
  // Earnings
  basicCents: Cents;
  fixedAllowancesCents: Cents;
  extraAllowancesCents: Cents;
  overtimeCents: Cents;
  noPayCents: Cents; // shown as a negative earning
  grossCents: Cents;
  // EPF / ETF
  epfLiableCents: Cents;
  epfEmployeeCents: Cents; // employee's share, deducted from pay
  epfEmployerCents: Cents; // company's cost, not deducted
  etfEmployerCents: Cents; // company's cost, not deducted
  // Deductions
  apitCents: Cents;
  otherDeductionsCents: Cents;
  totalDeductionsCents: Cents;
  // Bottom line
  netCents: Cents;
  employerCostCents: Cents; // gross + employer EPF + ETF
  warnings: PayrollWarning[];
};

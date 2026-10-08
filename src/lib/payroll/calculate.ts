/**
 * PayLanka payroll engine — the ONE place where pay is calculated.
 *
 * It is a pure function: the same input always gives the same output, and it
 * never touches the database, the clock or the UI. That makes it easy to test
 * and lets the browser (live preview) and the server (saved figures) share it.
 *
 *   Overtime pay    = basic ÷ OT divisor × OT multiplier × OT hours
 *   No-pay          = basic ÷ no-pay divisor × no-pay days   (capped at basic)
 *   Gross pay       = basic + fixed allowances + extra allowances + overtime − no-pay
 *   EPF/ETF liable  = basic + EPF-liable allowances − no-pay  (overtime excluded)
 *   EPF employee    = EPF-liable × employee rate              (deducted)
 *   EPF employer    = EPF-liable × employer rate              (company cost)
 *   ETF employer    = EPF-liable × ETF rate                   (company cost)
 *   APIT            = progressive tax on gross pay            (only if brackets given)
 *   Total deductions= EPF employee + APIT + other deductions
 *   Net pay         = gross − total deductions
 *   Employer cost   = gross + EPF employer + ETF employer
 *
 * Rounding: every component is rounded to the nearest cent (half up) once, and
 * totals are sums of rounded components, so a payslip always adds up exactly.
 */
import { applyRateBp, assertCents, BP_PER_UNIT, divideRoundedBig, sumCents, type Cents } from "@/lib/money";
import type { PayrollInput, PayrollOptions, PayrollRates, PayrollResult, PayrollWarning, TaxBracket } from "./types";

const HUNDRED = BigInt(100);
const BP = BigInt(BP_PER_UNIT);

function assertNonNegativeCents(value: number, label: string) {
  assertCents(value, label);
  if (value < 0) throw new RangeError(`${label} cannot be negative`);
}

function validate(input: PayrollInput, rates: PayrollRates) {
  assertNonNegativeCents(input.basicCents, "Basic salary");
  for (const line of [...input.fixedAllowances, ...input.extraAllowances, ...input.otherDeductions]) {
    assertNonNegativeCents(line.amountCents, line.label);
  }
  assertNonNegativeCents(input.overtimeHundredths, "Overtime hours");
  assertNonNegativeCents(input.noPayDaysHundredths, "No-pay days");
  for (const [name, value] of Object.entries(rates)) {
    assertNonNegativeCents(value, name);
  }
  if (rates.otHourlyDivisor === 0) throw new RangeError("OT hourly divisor must be more than zero");
  if (rates.noPayDayDivisor === 0) throw new RangeError("No-pay day divisor must be more than zero");
}

/** basic ÷ divisor × multiplier × hours, with a single rounding at the end. */
export function overtimePay(basicCents: Cents, overtimeHundredths: number, rates: PayrollRates): Cents {
  return divideRoundedBig(
    BigInt(basicCents) * BigInt(rates.otMultiplierBp) * BigInt(overtimeHundredths),
    BigInt(rates.otHourlyDivisor) * BP * HUNDRED,
  );
}

/** basic ÷ divisor × days, with a single rounding at the end. */
export function noPayDeduction(basicCents: Cents, noPayDaysHundredths: number, rates: PayrollRates): Cents {
  return divideRoundedBig(
    BigInt(basicCents) * BigInt(noPayDaysHundredths),
    BigInt(rates.noPayDayDivisor) * HUNDRED,
  );
}

/**
 * Progressive tax: each bracket taxes only the slice of income that falls
 * inside it. Brackets are applied in order of `fromCents`.
 * This is a configurable HOOK — PayLanka ships with no tax rates.
 */
export function progressiveTax(taxableCents: Cents, brackets: readonly TaxBracket[]): Cents {
  let numerator = BigInt(0);
  for (const bracket of [...brackets].sort((a, b) => a.fromCents - b.fromCents)) {
    const upper = bracket.toCents ?? Number.MAX_SAFE_INTEGER;
    const slice = Math.min(taxableCents, upper) - bracket.fromCents;
    if (slice > 0) numerator += BigInt(slice) * BigInt(bracket.rateBp);
  }
  return divideRoundedBig(numerator, BP);
}

export function calculatePayroll(input: PayrollInput, { rates, apitBrackets }: PayrollOptions): PayrollResult {
  validate(input, rates);
  const warnings: PayrollWarning[] = [];

  const fixedAllowancesCents = sumCents(input.fixedAllowances.map((a) => a.amountCents));
  const extraAllowancesCents = sumCents(input.extraAllowances.map((a) => a.amountCents));
  const epfLiableAllowancesCents = sumCents(
    [...input.fixedAllowances, ...input.extraAllowances].filter((a) => a.epfLiable).map((a) => a.amountCents),
  );

  const overtimeCents = overtimePay(input.basicCents, input.overtimeHundredths, rates);

  let noPayCents = noPayDeduction(input.basicCents, input.noPayDaysHundredths, rates);
  if (noPayCents > input.basicCents) {
    noPayCents = input.basicCents;
    warnings.push("NO_PAY_EXCEEDS_BASIC");
  }

  const grossCents = input.basicCents + fixedAllowancesCents + extraAllowancesCents + overtimeCents - noPayCents;

  // Overtime is not part of "total earnings" for EPF/ETF; no-pay reduces it.
  const epfLiableCents = Math.max(0, input.basicCents + epfLiableAllowancesCents - noPayCents);
  const epfEmployeeCents = applyRateBp(epfLiableCents, rates.epfEmployeeRateBp);
  const epfEmployerCents = applyRateBp(epfLiableCents, rates.epfEmployerRateBp);
  const etfEmployerCents = applyRateBp(epfLiableCents, rates.etfEmployerRateBp);

  const apitCents = apitBrackets && apitBrackets.length > 0 ? progressiveTax(grossCents, apitBrackets) : 0;
  const otherDeductionsCents = sumCents(input.otherDeductions.map((d) => d.amountCents));
  const totalDeductionsCents = epfEmployeeCents + apitCents + otherDeductionsCents;

  const netCents = grossCents - totalDeductionsCents;
  if (netCents < 0) warnings.push("NET_PAY_NEGATIVE");

  return {
    basicCents: input.basicCents,
    fixedAllowancesCents,
    extraAllowancesCents,
    overtimeCents,
    noPayCents,
    grossCents,
    epfLiableCents,
    epfEmployeeCents,
    epfEmployerCents,
    etfEmployerCents,
    apitCents,
    otherDeductionsCents,
    totalDeductionsCents,
    netCents,
    employerCostCents: grossCents + epfEmployerCents + etfEmployerCents,
    warnings,
  };
}

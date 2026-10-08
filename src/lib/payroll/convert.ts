import { parseScaledDecimal } from "@/lib/money";
import type { PayrollRates, PayrollResult } from "./types";

/** Database Decimal ("2.5", Prisma Decimal) -> hundredths (250). */
export function toHundredths(value: { toString(): string } | string | number): number {
  return parseScaledDecimal(String(value), 2) ?? 0;
}

/** 250 -> "2.5", 300 -> "3", 0 -> "" (blank input) */
export function hundredthsToInput(hundredths: number): string {
  if (hundredths === 0) return "";
  return String(hundredths / 100);
}

/** 250 -> "2.50" (for Decimal columns) */
export function hundredthsToDecimal(hundredths: number): string {
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}

/** The rate fields of a payroll run (or of company settings). */
export function ratesOf(source: PayrollRates): PayrollRates {
  return {
    epfEmployeeRateBp: source.epfEmployeeRateBp,
    epfEmployerRateBp: source.epfEmployerRateBp,
    etfEmployerRateBp: source.etfEmployerRateBp,
    otHourlyDivisor: source.otHourlyDivisor,
    otMultiplierBp: source.otMultiplierBp,
    noPayDayDivisor: source.noPayDayDivisor,
  };
}

/** The calculated columns stored on a PayrollItem. */
export function itemResultColumns(result: PayrollResult) {
  return {
    basicCents: result.basicCents,
    fixedAllowancesCents: result.fixedAllowancesCents,
    extraAllowancesCents: result.extraAllowancesCents,
    overtimeCents: result.overtimeCents,
    noPayCents: result.noPayCents,
    grossCents: result.grossCents,
    epfLiableCents: result.epfLiableCents,
    epfEmployeeCents: result.epfEmployeeCents,
    epfEmployerCents: result.epfEmployerCents,
    etfEmployerCents: result.etfEmployerCents,
    apitCents: result.apitCents,
    otherDeductionsCents: result.otherDeductionsCents,
    totalDeductionsCents: result.totalDeductionsCents,
    netCents: result.netCents,
  };
}

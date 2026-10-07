/**
 * Money helpers. All amounts are integer cents (Rs. 1.00 === 100).
 *
 * Why integers? Floating-point numbers cannot represent most decimal fractions
 * exactly (0.1 + 0.2 !== 0.3), which causes payslips that are off by a cent.
 * Integers are exact, so we keep cents everywhere and only format at the edges.
 */

export type Cents = number;

/** 1% = 100 basis points, so 100% = 10,000 bp. */
export const BP_PER_UNIT = 10_000;

export function assertCents(value: number, label = "amount"): asserts value is Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a whole number of cents, got ${value}`);
  }
}

/**
 * Integer division rounded half away from zero (the "round half up" taught in
 * accounting: 0.5 cents becomes 1 cent, -0.5 becomes -1).
 */
export function divideRounded(numerator: number, denominator: number): number {
  assertCents(numerator, "numerator");
  assertCents(denominator, "denominator");
  if (denominator === 0) throw new RangeError("Division by zero");

  const negative = numerator < 0 !== denominator < 0;
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const quotient = Math.floor(n / d);
  const remainder = n - quotient * d;
  const rounded = remainder * 2 >= d ? quotient + 1 : quotient;
  return negative && rounded !== 0 ? -rounded : rounded;
}

/** Apply a rate in basis points: applyRateBp(10000000, 800) -> 8% of Rs. 100,000.00. */
export function applyRateBp(amount: Cents, rateBp: number): Cents {
  return divideRounded(amount * rateBp, BP_PER_UNIT);
}

const MONEY_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parse a rupee string such as "125,000.50" into cents without ever going
 * through a float. Returns null for anything that isn't a valid amount.
 */
export function parseRupees(input: string): Cents | null {
  const cleaned = input.trim().replace(/^rs\.?\s*/i, "").replace(/,/g, "");
  const match = MONEY_PATTERN.exec(cleaned);
  if (!match) return null;
  const [, sign, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return sign ? -cents : cents;
}

/** 12500050 -> "125000.50" (plain, for form inputs and CSV files). */
export function centsToDecimalString(cents: Cents): string {
  assertCents(cents);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

/** 12500000 -> "Rs. 125,000.00". Used only in the UI and PDFs. */
export function formatLKR(cents: Cents): string {
  const [whole, fraction] = centsToDecimalString(Math.abs(cents)).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${cents < 0 ? "-" : ""}Rs. ${grouped}.${fraction}`;
}

/** 800 -> "8%", 1250 -> "12.5%". */
export function formatRateBp(rateBp: number): string {
  const percent = rateBp / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0+$/, "")}%`;
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((total, value) => total + value, 0);
}

/** Payroll periods are calendar months, identified by year + month (1–12). */
export type Period = { year: number; month: number };

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** { 2026, 10 } -> "October 2026" */
export function periodLabel({ year, month }: Period): string {
  return `${MONTHS[month - 1]} ${year}`;
}

/** { 2026, 10 } -> "2026-10" (the value format of <input type="month">) */
export function periodKey({ year, month }: Period): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parsePeriodKey(key: string): Period | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

/** The current month in Sri Lanka time, whatever time zone the server runs in. */
export function currentPeriod(now: Date = new Date()): Period {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit" })
    .formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
  };
}

/** Months since year 0 — makes period arithmetic and comparisons simple. */
export function periodIndex({ year, month }: Period): number {
  return year * 12 + (month - 1);
}

export function addMonths(period: Period, months: number): Period {
  const index = periodIndex(period) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Last calendar day of the month, as a UTC date (matches Postgres DATE columns). */
export function lastDayOfPeriod({ year, month }: Period): Date {
  return new Date(Date.UTC(year, month, 0));
}

/**
 * Sri Lanka's tax (year of assessment) runs 1 April – 31 March.
 * { 2026, 10 } -> { startYear: 2026, label: "2026/27" } (April 2026 – March 2027).
 */
export function taxYearOf({ year, month }: Period) {
  const startYear = month >= 4 ? year : year - 1;
  return {
    startYear,
    label: `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`,
    first: { year: startYear, month: 4 } as Period,
    last: { year: startYear + 1, month: 3 } as Period,
  };
}

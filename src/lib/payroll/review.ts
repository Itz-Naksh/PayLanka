/**
 * Pre-approval review checks — the variance review an accountant does before
 * signing off a payroll: what changed versus last month, and what looks odd.
 * Pure, so it is unit-tested and the thresholds are easy to see.
 */
import { formatLKR } from "@/lib/money";

export type ReviewLine = {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  grossCents: number;
  netCents: number;
  otherDeductionsCents: number;
  overtimeHundredths: number;
  noPayDaysHundredths: number;
};

export type ReviewFlag = {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  severity: "warning" | "info";
  message: string;
};

export const REVIEW_THRESHOLDS = {
  /** Net pay moving by this much (basis points) vs last month is flagged: 2000 = 20%. */
  netChangeBp: 2_000,
  /** Overtime at or above this many hours is flagged. */
  overtimeHours: 40,
  /** Other deductions at or above this share of gross pay: 5000 = 50%. */
  deductionShareBp: 5_000,
};

export function reviewChecks(
  current: ReviewLine[],
  previous: ReviewLine[] | null,
  previousLabel: string | null,
  thresholds = REVIEW_THRESHOLDS,
): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const before = new Map((previous ?? []).map((line) => [line.employeeId, line]));
  const flag = (line: ReviewLine, severity: ReviewFlag["severity"], message: string) =>
    flags.push({ employeeId: line.employeeId, employeeNo: line.employeeNo, employeeName: line.employeeName, severity, message });

  for (const line of current) {
    if (line.netCents < 0) flag(line, "warning", `Net pay is negative (${formatLKR(line.netCents)})`);

    if (line.grossCents > 0 && line.otherDeductionsCents * 10_000 >= line.grossCents * thresholds.deductionShareBp) {
      flag(line, "warning", `Other deductions are ${formatLKR(line.otherDeductionsCents)}, half or more of gross pay`);
    }

    const last = before.get(line.employeeId);
    if (previous && !last) {
      flag(line, "info", `Not paid in ${previousLabel ?? "the previous month"} — new joiner or returning?`);
    } else if (last && last.netCents > 0) {
      const changeBp = Math.round(((line.netCents - last.netCents) * 10_000) / last.netCents);
      if (Math.abs(changeBp) >= thresholds.netChangeBp) {
        const direction = changeBp > 0 ? "up" : "down";
        flag(
          line,
          "warning",
          `Net pay ${direction} ${Math.abs(changeBp / 100).toFixed(0)}% vs ${previousLabel ?? "last month"} (${formatLKR(last.netCents)} → ${formatLKR(line.netCents)})`,
        );
      }
    }

    if (line.overtimeHundredths >= thresholds.overtimeHours * 100) {
      flag(line, "info", `${line.overtimeHundredths / 100} overtime hours`);
    }
    if (line.noPayDaysHundredths > 0) {
      const days = line.noPayDaysHundredths / 100;
      flag(line, "info", `${days} no-pay ${days === 1 ? "day" : "days"}`);
    }
  }

  // Paid last month but missing now (left, deactivated or forgotten).
  const now = new Set(current.map((line) => line.employeeId));
  for (const last of previous ?? []) {
    if (!now.has(last.employeeId)) flag(last, "info", `Paid in ${previousLabel ?? "last month"} but not in this run`);
  }

  return flags.sort((a, b) => (a.severity === b.severity ? a.employeeNo.localeCompare(b.employeeNo) : a.severity === "warning" ? -1 : 1));
}

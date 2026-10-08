import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { calculatePayroll } from "@/lib/payroll/calculate";
import { itemResultColumns, ratesOf, toHundredths } from "@/lib/payroll/convert";
import { lastDayOfPeriod, type Period } from "@/lib/payroll/period";
import { parseStoredBrackets } from "@/lib/payroll/tax";
import type { DeductionLine, EarningLine, PayrollRates, TaxBracket } from "@/lib/payroll/types";

/** Everything a new or refreshed run copies from the current settings. */
export async function loadRunSettings() {
  const settings = await prisma.companySettings.findUnique({
    where: { id: 1 },
    include: { activeTaxTable: { include: { brackets: true } } },
  });
  if (!settings) throw new Error("Company settings are missing. Run the seed script.");

  const brackets: TaxBracket[] | null =
    settings.apitEnabled && settings.activeTaxTable
      ? settings.activeTaxTable.brackets.map(({ fromCents, toCents, rateBp }) => ({ fromCents, toCents, rateBp }))
      : null;

  return { rates: ratesOf(settings), apitEnabled: brackets !== null, apitBrackets: brackets };
}

/** Active employees who had joined by the end of the month. */
export function eligibleEmployees(period: Period) {
  return prisma.employee.findMany({
    where: { status: "ACTIVE", joinDate: { lte: lastDayOfPeriod(period) } },
    orderBy: { employeeNo: "asc" },
    include: { department: { select: { name: true } }, allowances: { orderBy: { name: "asc" } } },
  });
}

type EligibleEmployee = Awaited<ReturnType<typeof eligibleEmployees>>[number];

/** Employee details frozen onto the payroll item (the payslip must not change later). */
export function employeeSnapshot(e: EligibleEmployee) {
  return {
    employeeNo: e.employeeNo,
    employeeName: `${e.firstName} ${e.lastName}`,
    nic: e.nic,
    epfNo: e.epfNo,
    departmentName: e.department.name,
    designation: e.designation,
    bankName: e.bankName,
    bankBranch: e.bankBranch,
    accountNo: e.accountNo,
  };
}

export function fixedAllowanceLines(e: EligibleEmployee): EarningLine[] {
  return e.allowances.map((a) => ({ label: a.name, amountCents: a.amountCents, epfLiable: a.epfLiable }));
}

type ItemInputs = {
  basicCents: number;
  fixedAllowances: EarningLine[];
  extraAllowances: EarningLine[];
  overtimeHundredths: number;
  noPayDaysHundredths: number;
  otherDeductions: DeductionLine[];
};

/** Run the engine and return the columns + lines to store for one item. */
export function computeItem(inputs: ItemInputs, rates: PayrollRates, apitBrackets: TaxBracket[] | null) {
  const result = calculatePayroll(inputs, { rates, apitBrackets });
  const lines: Prisma.PayrollItemLineCreateManyItemInput[] = [
    ...inputs.fixedAllowances.map((l) => ({
      type: "EARNING" as const,
      source: "FIXED_ALLOWANCE" as const,
      label: l.label,
      amountCents: l.amountCents,
      epfLiable: l.epfLiable,
    })),
    ...inputs.extraAllowances.map((l) => ({
      type: "EARNING" as const,
      source: "EXTRA_ALLOWANCE" as const,
      label: l.label,
      amountCents: l.amountCents,
      epfLiable: l.epfLiable,
    })),
    ...inputs.otherDeductions.map((l) => ({
      type: "DEDUCTION" as const,
      source: "OTHER_DEDUCTION" as const,
      label: l.label,
      amountCents: l.amountCents,
      epfLiable: false,
    })),
  ];
  return { result, columns: itemResultColumns(result), lines };
}

type StoredItem = {
  basicCents: number;
  overtimeHours: { toString(): string };
  noPayDays: { toString(): string };
  lines: { source: string; label: string; amountCents: number; epfLiable: boolean }[];
};

/** Rebuild an item's engine inputs from what is stored in the database. */
export function inputsFromStoredItem(item: StoredItem, fixedAllowances?: EarningLine[]): ItemInputs {
  const bySource = (source: string) => item.lines.filter((l) => l.source === source);
  return {
    basicCents: item.basicCents,
    fixedAllowances:
      fixedAllowances ??
      bySource("FIXED_ALLOWANCE").map((l) => ({ label: l.label, amountCents: l.amountCents, epfLiable: l.epfLiable })),
    extraAllowances: bySource("EXTRA_ALLOWANCE").map((l) => ({
      label: l.label,
      amountCents: l.amountCents,
      epfLiable: l.epfLiable,
    })),
    overtimeHundredths: toHundredths(item.overtimeHours),
    noPayDaysHundredths: toHundredths(item.noPayDays),
    otherDeductions: bySource("OTHER_DEDUCTION").map((l) => ({ label: l.label, amountCents: l.amountCents })),
  };
}

export function runBrackets(run: { apitEnabled: boolean; apitBrackets: unknown }): TaxBracket[] | null {
  return run.apitEnabled ? parseStoredBrackets(run.apitBrackets) : null;
}

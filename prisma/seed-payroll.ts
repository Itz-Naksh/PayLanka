/**
 * Twelve months of fictional payroll history for the demo:
 * the previous 11 months are APPROVED (so reports and the dashboard chart have
 * data), and the current month is waiting IN REVIEW for an Admin to approve.
 *
 * Inputs (overtime, no-pay leave, bonuses, advances) are generated from a fixed
 * formula rather than Math.random(), so every seed produces the same numbers.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { calculatePayroll } from "../src/lib/payroll/calculate";
import { hundredthsToDecimal, itemResultColumns, ratesOf } from "../src/lib/payroll/convert";
import { addMonths, currentPeriod, lastDayOfPeriod, periodIndex, type Period } from "../src/lib/payroll/period";
import type { DeductionLine, EarningLine } from "../src/lib/payroll/types";

/** Deterministic "random" number 0–99 for an employee in a month. */
function pseudo(employeeIndex: number, month: number, salt: number): number {
  return (employeeIndex * 37 + month * 61 + salt * 17 + employeeIndex * month * 7) % 100;
}

function monthlyInputs(index: number, department: string, period: Period) {
  const m = periodIndex(period);
  const overtimeHeavy = department === "Operations" || department === "Sales";

  const otRoll = pseudo(index, m, 1);
  const overtimeHundredths = overtimeHeavy ? (otRoll % 4) * 450 + (otRoll > 70 ? 600 : 0) : otRoll > 80 ? 400 : 0;

  const leaveRoll = pseudo(index, m, 2);
  const noPayDaysHundredths = leaveRoll > 92 ? 200 : leaveRoll > 85 ? 50 : 0;

  const extraAllowances: EarningLine[] = [];
  if (period.month === 4) extraAllowances.push({ label: "New Year bonus", amountCents: 1_000_000, epfLiable: false });
  if (period.month === 12) extraAllowances.push({ label: "Year-end bonus", amountCents: 1_500_000, epfLiable: false });
  if (pseudo(index, m, 3) > 90) extraAllowances.push({ label: "Attendance incentive", amountCents: 250_000, epfLiable: true });

  const otherDeductions: DeductionLine[] = [];
  if (pseudo(index, m, 4) > 88) otherDeductions.push({ label: "Salary advance", amountCents: 1_000_000 });
  if (index % 5 === 1) otherDeductions.push({ label: "Staff loan instalment", amountCents: 500_000 });

  return { overtimeHundredths, noPayDaysHundredths, extraAllowances, otherDeductions };
}

export async function seedPayrollHistory(prisma: PrismaClient): Promise<number> {
  const [settings, admin, hr, employees] = await Promise.all([
    prisma.companySettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.user.findUniqueOrThrow({ where: { email: "admin@paylanka.test" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "hr@paylanka.test" } }),
    prisma.employee.findMany({
      orderBy: { employeeNo: "asc" },
      include: { department: true, allowances: { orderBy: { name: "asc" } } },
    }),
  ]);
  const rates = ratesOf(settings);
  const now = currentPeriod();
  let created = 0;

  for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
    const period = addMonths(now, -monthsBack);
    const monthEnd = lastDayOfPeriod(period);
    const runDate = new Date(Date.UTC(period.year, period.month - 1, 25, 5, 0, 0)); // the 25th, 10:30 in Colombo

    // On the payroll that month: had joined, and was still employed on the last day.
    const eligible = employees.filter(
      (e) => e.joinDate <= monthEnd && (e.status === "ACTIVE" || (e.deactivatedAt !== null && e.deactivatedAt >= monthEnd)),
    );

    const items = eligible.map((e) => {
      const index = employees.indexOf(e);
      const inputs = monthlyInputs(index, e.department.name, period);
      const fixedAllowances = e.allowances.map((a) => ({ label: a.name, amountCents: a.amountCents, epfLiable: a.epfLiable }));
      const result = calculatePayroll(
        { basicCents: e.basicSalaryCents, fixedAllowances, ...inputs },
        { rates, apitBrackets: null },
      );
      return {
        employeeId: e.id,
        employeeNo: e.employeeNo,
        employeeName: `${e.firstName} ${e.lastName}`,
        nic: e.nic,
        epfNo: e.epfNo,
        departmentName: e.department.name,
        designation: e.designation,
        bankName: e.bankName,
        bankBranch: e.bankBranch,
        accountNo: e.accountNo,
        overtimeHours: hundredthsToDecimal(inputs.overtimeHundredths),
        noPayDays: hundredthsToDecimal(inputs.noPayDaysHundredths),
        ...itemResultColumns(result),
        lines: {
          createMany: {
            data: [
              ...fixedAllowances.map((l) => ({ type: "EARNING" as const, source: "FIXED_ALLOWANCE" as const, ...l })),
              ...inputs.extraAllowances.map((l) => ({ type: "EARNING" as const, source: "EXTRA_ALLOWANCE" as const, ...l })),
              ...inputs.otherDeductions.map((l) => ({
                type: "DEDUCTION" as const,
                source: "OTHER_DEDUCTION" as const,
                epfLiable: false,
                ...l,
              })),
            ],
          },
        },
      };
    });

    // Items can only be added while a run isn't approved (database lock), so
    // create it in review first and approve it afterwards.
    const run = await prisma.payrollRun.create({
      data: {
        year: period.year,
        month: period.month,
        status: "REVIEW",
        ...rates,
        apitEnabled: false,
        createdById: hr.id,
        createdAt: runDate,
        submittedById: hr.id,
        submittedAt: new Date(runDate.getTime() + 2 * 60 * 60 * 1000),
        items: { create: items },
      },
    });

    if (monthsBack > 0) {
      await prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "APPROVED",
          approvedById: admin.id,
          approvedAt: new Date(runDate.getTime() + 26 * 60 * 60 * 1000),
        },
      });
    }
    created++;
  }
  return created;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { errorState, parseFormData, successState, type ActionState } from "@/lib/forms/action-state";
import { hundredthsToDecimal, ratesOf } from "@/lib/payroll/convert";
import { addMonths, currentPeriod, periodIndex, periodLabel } from "@/lib/payroll/period";
import { formatLKR } from "@/lib/money";
import { createRunSchema, itemInputsSchema, returnRunSchema } from "@/lib/validation/payroll";
import { withPermission } from "@/server/guard";
import {
  computeItem,
  eligibleEmployees,
  employeeSnapshot,
  fixedAllowanceLines,
  inputsFromStoredItem,
  loadRunSettings,
  runBrackets,
} from "./engine";

const LOCKED_MESSAGE = "This payroll is no longer a draft, so it can't be edited.";

function readId(formData: FormData, key = "runId"): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function refresh(runId?: string) {
  revalidatePath("/payroll", "layout");
  revalidatePath("/", "layout"); // the sidebar shows this month's payroll status
  if (runId) revalidatePath(`/payroll/${runId}`);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string | null = null;

  const result = await withPermission("payroll:edit", async (user) => {
    const parsed = parseFormData(createRunSchema, formData);
    if (!parsed.ok) return parsed.state;
    const { period } = parsed.data;

    // Allow back-dated runs and next month (to prepare early), but not further ahead.
    if (periodIndex(period) > periodIndex(addMonths(currentPeriod(), 1))) {
      return errorState("Please fix the highlighted fields.", { period: ["You can prepare up to next month only"] });
    }

    const existing = await prisma.payrollRun.findUnique({
      where: { year_month: { year: period.year, month: period.month } },
    });
    if (existing) {
      return errorState(`A payroll run for ${periodLabel(period)} already exists.`, {
        period: ["Already exists — open it from the payroll list"],
      });
    }

    const [settings, employees] = await Promise.all([loadRunSettings(), eligibleEmployees(period)]);
    if (employees.length === 0) return errorState(`No active employees had joined by the end of ${periodLabel(period)}.`);

    const items = employees.map((employee) => {
      const { columns, lines } = computeItem(
        {
          basicCents: employee.basicSalaryCents,
          fixedAllowances: fixedAllowanceLines(employee),
          extraAllowances: [],
          overtimeHundredths: 0,
          noPayDaysHundredths: 0,
          otherDeductions: [],
        },
        settings.rates,
        settings.apitBrackets,
      );
      return { employeeId: employee.id, ...employeeSnapshot(employee), ...columns, lines: { createMany: { data: lines } } };
    });

    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollRun.create({
        data: {
          year: period.year,
          month: period.month,
          ...settings.rates,
          apitEnabled: settings.apitEnabled,
          apitBrackets: (settings.apitBrackets ?? undefined) as Prisma.InputJsonValue | undefined,
          createdById: user.id,
          items: { create: items },
        },
      });
      await logAudit(tx, user, "PAYROLL_CREATED", { type: "PayrollRun", id: created.id }, {
        period: periodLabel(period),
        employees: items.length,
      });
      return created;
    });

    createdId = run.id;
    refresh();
    return successState("Payroll created.");
  });

  if (createdId) redirect(`/payroll/${createdId}`);
  return result;
}

// ---------------------------------------------------------------------------
// Edit one employee's inputs (draft only)
// ---------------------------------------------------------------------------

export async function saveItemInputs(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("payroll:edit", async (user) => {
    const itemId = readId(formData, "itemId");
    if (!itemId) return errorState("Missing payroll line.");
    const parsed = parseFormData(itemInputsSchema, formData);
    if (!parsed.ok) return parsed.state;
    const inputs = parsed.data;

    const item = await prisma.payrollItem.findUnique({ where: { id: itemId }, include: { run: true, lines: true } });
    if (!item) return errorState("This payroll line no longer exists.");
    if (item.run.status !== "DRAFT") return errorState(LOCKED_MESSAGE);

    const stored = inputsFromStoredItem(item);
    const { result, columns, lines } = computeItem(
      {
        ...stored,
        overtimeHundredths: inputs.overtimeHours,
        noPayDaysHundredths: inputs.noPayDays,
        extraAllowances: inputs.extraAllowances.map((a) => ({
          label: a.label,
          amountCents: a.amount,
          epfLiable: a.epfLiable,
        })),
        otherDeductions: inputs.otherDeductions.map((d) => ({ label: d.label, amountCents: d.amount })),
      },
      ratesOf(item.run),
      runBrackets(item.run),
    );

    const saved = await prisma.$transaction(async (tx) => {
      // The `run: { status: "DRAFT" }` filter makes the lock check and the write
      // a single step, so a run approved a moment ago can't be edited.
      const { count } = await tx.payrollItem.updateMany({
        where: { id: itemId, run: { status: "DRAFT" } },
        data: {
          overtimeHours: hundredthsToDecimal(inputs.overtimeHours),
          noPayDays: hundredthsToDecimal(inputs.noPayDays),
          ...columns,
        },
      });
      if (count === 0) return false;
      await tx.payrollItemLine.deleteMany({ where: { itemId } });
      await tx.payrollItemLine.createMany({ data: lines.map((line) => ({ ...line, itemId })) });
      await logAudit(tx, user, "PAYROLL_UPDATED", { type: "PayrollRun", id: item.runId }, {
        employeeNo: item.employeeNo,
        overtimeHours: inputs.overtimeHours / 100,
        noPayDays: inputs.noPayDays / 100,
        extraAllowancesCents: result.extraAllowancesCents,
        otherDeductionsCents: result.otherDeductionsCents,
        netCents: result.netCents,
      });
      return true;
    });
    if (!saved) return errorState(LOCKED_MESSAGE);

    refresh(item.runId);
    if (result.warnings.includes("NET_PAY_NEGATIVE")) {
      return errorState(`Saved, but net pay is negative (${formatLKR(result.netCents)}). Reduce the deductions.`);
    }
    return successState(`Saved ${item.employeeName}. Net pay ${formatLKR(result.netCents)}.`);
  });
}

// ---------------------------------------------------------------------------
// Refresh a draft with current settings and employee records
// ---------------------------------------------------------------------------

export async function refreshDraft(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("payroll:edit", async (user) => {
    const runId = readId(formData);
    if (!runId) return errorState("Missing payroll run.");
    const run = await prisma.payrollRun.findUnique({ where: { id: runId }, include: { items: { include: { lines: true } } } });
    if (!run) return errorState("This payroll run no longer exists.");
    if (run.status !== "DRAFT") return errorState(LOCKED_MESSAGE);

    const period = { year: run.year, month: run.month };
    const [settings, employees] = await Promise.all([loadRunSettings(), eligibleEmployees(period)]);
    const existingByEmployee = new Map(run.items.map((item) => [item.employeeId, item]));
    const eligibleIds = new Set(employees.map((e) => e.id));
    const removed = run.items.filter((item) => !eligibleIds.has(item.employeeId));
    let added = 0;

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payrollRun.updateMany({
        where: { id: runId, status: "DRAFT" },
        data: {
          ...settings.rates,
          apitEnabled: settings.apitEnabled,
          apitBrackets: (settings.apitBrackets ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      if (count === 0) throw new Error(LOCKED_MESSAGE);

      if (removed.length > 0) {
        await tx.payrollItem.deleteMany({ where: { id: { in: removed.map((i) => i.id) } } });
      }

      for (const employee of employees) {
        const existing = existingByEmployee.get(employee.id);
        // Keep this month's inputs (OT, no-pay, extras, deductions); refresh everything else.
        const inputs = existing
          ? { ...inputsFromStoredItem(existing, fixedAllowanceLines(employee)), basicCents: employee.basicSalaryCents }
          : {
              basicCents: employee.basicSalaryCents,
              fixedAllowances: fixedAllowanceLines(employee),
              extraAllowances: [],
              overtimeHundredths: 0,
              noPayDaysHundredths: 0,
              otherDeductions: [],
            };
        const { columns, lines } = computeItem(inputs, settings.rates, settings.apitBrackets);
        const data = { ...employeeSnapshot(employee), ...columns };

        if (existing) {
          await tx.payrollItem.update({ where: { id: existing.id }, data });
          await tx.payrollItemLine.deleteMany({ where: { itemId: existing.id } });
          await tx.payrollItemLine.createMany({ data: lines.map((line) => ({ ...line, itemId: existing.id })) });
        } else {
          added++;
          await tx.payrollItem.create({
            data: { runId, employeeId: employee.id, ...data, lines: { createMany: { data: lines } } },
          });
        }
      }

      await logAudit(tx, user, "PAYROLL_REFRESHED", { type: "PayrollRun", id: runId }, {
        period: periodLabel(period),
        added,
        removed: removed.map((i) => i.employeeNo),
      });
    }, { timeout: 30_000 });

    refresh(runId);
    const notes = [added ? `${added} added` : null, removed.length ? `${removed.length} removed` : null].filter(Boolean);
    return successState(
      `Draft refreshed with current rates and employee details${notes.length ? ` (${notes.join(", ")})` : ""}.`,
    );
  });
}

// ---------------------------------------------------------------------------
// Delete a draft
// ---------------------------------------------------------------------------

export async function deleteDraft(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let deleted = false;
  const result = await withPermission("payroll:edit", async (user) => {
    const runId = readId(formData);
    if (!runId) return errorState("Missing payroll run.");
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return errorState("This payroll run no longer exists.");
    if (run.status !== "DRAFT") return errorState("Only draft payroll runs can be deleted.");

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payrollRun.deleteMany({ where: { id: runId, status: "DRAFT" } });
      if (count === 0) throw new Error("Only draft payroll runs can be deleted.");
      await logAudit(tx, user, "PAYROLL_DELETED", { type: "PayrollRun", id: runId }, {
        period: periodLabel(run),
      });
    });
    deleted = true;
    refresh();
    return successState("Draft deleted.");
  });

  if (deleted) redirect("/payroll");
  return result;
}

// ---------------------------------------------------------------------------
// Workflow: Draft -> Review -> Approved (or back to Draft)
// ---------------------------------------------------------------------------

export async function submitRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("payroll:submit", async (user) => {
    const runId = readId(formData);
    if (!runId) return errorState("Missing payroll run.");

    const [run, negative] = await Promise.all([
      prisma.payrollRun.findUnique({ where: { id: runId }, include: { _count: { select: { items: true } } } }),
      prisma.payrollItem.findMany({ where: { runId, netCents: { lt: 0 } }, select: { employeeName: true } }),
    ]);
    if (!run) return errorState("This payroll run no longer exists.");
    if (run.status !== "DRAFT") return errorState("Only a draft can be submitted for review.");
    if (run._count.items === 0) return errorState("There are no employees in this payroll.");
    if (negative.length > 0) {
      return errorState(`Net pay is negative for ${negative.map((n) => n.employeeName).join(", ")}. Fix it first.`);
    }

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payrollRun.updateMany({
        where: { id: runId, status: "DRAFT" },
        data: { status: "REVIEW", submittedById: user.id, submittedAt: new Date(), returnNote: null },
      });
      if (count === 0) throw new Error("Only a draft can be submitted for review.");
      await logAudit(tx, user, "PAYROLL_SUBMITTED", { type: "PayrollRun", id: runId }, { period: periodLabel(run) });
    });
    refresh(runId);
    return successState("Submitted for review. An Admin can now approve it.");
  });
}

export async function returnRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("payroll:approve", async (user) => {
    const runId = readId(formData);
    if (!runId) return errorState("Missing payroll run.");
    const parsed = parseFormData(returnRunSchema, formData);
    if (!parsed.ok) return parsed.state;

    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return errorState("This payroll run no longer exists.");
    if (run.status !== "REVIEW") return errorState("Only a payroll in review can be returned.");

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payrollRun.updateMany({
        where: { id: runId, status: "REVIEW" },
        data: {
          status: "DRAFT",
          returnedById: user.id,
          returnedAt: new Date(),
          returnNote: parsed.data.note,
          submittedById: null,
          submittedAt: null,
        },
      });
      if (count === 0) throw new Error("Only a payroll in review can be returned.");
      await logAudit(tx, user, "PAYROLL_RETURNED", { type: "PayrollRun", id: runId }, {
        period: periodLabel(run),
        note: parsed.data.note,
      });
    });
    refresh(runId);
    return successState("Returned to draft with your note.");
  });
}

export async function approveRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("payroll:approve", async (user) => {
    const runId = readId(formData);
    if (!runId) return errorState("Missing payroll run.");
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return errorState("This payroll run no longer exists.");
    if (run.status !== "REVIEW") return errorState("Only a payroll in review can be approved.");

    // Segregation of duties: whoever submitted the payroll can't also approve it.
    if (run.submittedById === user.id) {
      return errorState("You submitted this payroll, so another Admin must approve it (segregation of duties).");
    }

    const totals = await prisma.payrollItem.aggregate({
      where: { runId },
      _sum: { grossCents: true, netCents: true, epfEmployeeCents: true, epfEmployerCents: true, etfEmployerCents: true },
      _count: true,
    });

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payrollRun.updateMany({
        where: { id: runId, status: "REVIEW" },
        data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() },
      });
      if (count === 0) throw new Error("Only a payroll in review can be approved.");
      // The approved totals are written into the audit trail as well.
      await logAudit(tx, user, "PAYROLL_APPROVED", { type: "PayrollRun", id: runId }, {
        period: periodLabel(run),
        employees: totals._count,
        ...totals._sum,
      });
    });
    refresh(runId);
    return successState("Approved. This payroll is now locked.");
  });
}

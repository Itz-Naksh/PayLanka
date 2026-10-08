"use server";

import { revalidatePath } from "next/cache";
import { diffFields } from "@/lib/audit-diff";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { errorState, parseFormData, successState, type ActionState } from "@/lib/forms/action-state";
import { companySettingsSchema } from "@/lib/validation/settings";
import { withPermission } from "@/server/guard";

const TRACKED = [
  "name",
  "address",
  "epfRegNo",
  "etfRegNo",
  "epfEmployeeRateBp",
  "epfEmployerRateBp",
  "etfEmployerRateBp",
  "otHourlyDivisor",
  "otMultiplierBp",
  "noPayDayDivisor",
] as const;

export async function updateCompanySettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("settings:manage", async (user) => {
    const parsed = parseFormData(companySettingsSchema, formData);
    if (!parsed.ok) return parsed.state;

    const before = await prisma.companySettings.findUnique({ where: { id: 1 } });
    if (!before) return errorState("Company settings are missing. Run the seed script first.");

    const changes = diffFields(before, parsed.data, TRACKED);
    if (Object.keys(changes).length === 0) return successState("No changes to save.");

    await prisma.$transaction(async (tx) => {
      await tx.companySettings.update({ where: { id: 1 }, data: parsed.data });
      await logAudit(tx, user, "SETTINGS_UPDATED", { type: "CompanySettings", id: "1" }, { changes });
    });

    revalidatePath("/", "layout"); // company name appears in the sidebar on every page
    return successState("Settings saved. New rates apply to payroll runs created from now on.");
  });
}

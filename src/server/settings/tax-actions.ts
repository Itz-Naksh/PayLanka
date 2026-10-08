"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { fromDateInputValue } from "@/lib/format";
import { errorState, parseFormData, successState, type ActionState } from "@/lib/forms/action-state";
import { taxTableSchema } from "@/lib/validation/payroll";
import { withPermission } from "@/server/guard";

/** Save the single active APIT table and switch the APIT hook on or off. */
export async function saveTaxTable(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withPermission("settings:manage", async (user) => {
    const parsed = parseFormData(taxTableSchema, formData);
    if (!parsed.ok) return parsed.state;
    const { apitEnabled, name, effectiveFrom, brackets } = parsed.data;

    const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
    if (!settings) return errorState("Company settings are missing. Run the seed script first.");

    await prisma.$transaction(async (tx) => {
      const tableData = { name, effectiveFrom: fromDateInputValue(effectiveFrom) };
      const table = settings.activeTaxTableId
        ? await tx.taxTable.update({ where: { id: settings.activeTaxTableId }, data: tableData })
        : await tx.taxTable.create({ data: tableData });

      await tx.taxBracket.deleteMany({ where: { tableId: table.id } });
      if (brackets.length > 0) {
        await tx.taxBracket.createMany({ data: brackets.map((b) => ({ ...b, tableId: table.id })) });
      }
      await tx.companySettings.update({
        where: { id: 1 },
        data: { apitEnabled, activeTaxTableId: table.id },
      });
      await logAudit(tx, user, "TAX_TABLE_UPDATED", { type: "TaxTable", id: table.id }, {
        apitEnabled,
        name,
        effectiveFrom,
        brackets,
      });
    });

    revalidatePath("/settings", "layout");
    return successState(
      apitEnabled
        ? "APIT table saved and switched on. It applies to new payroll runs (or Refresh an existing draft)."
        : "APIT table saved. APIT is switched off, so no income tax is deducted.",
    );
  });
}

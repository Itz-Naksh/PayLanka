import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";
import { bpToPercentString, centsToDecimalString } from "@/lib/money";
import { TaxForm } from "./tax-form";

export const metadata = { title: "Income tax (APIT)" };

export default async function TaxSettingsPage() {
  await requirePermission("settings:manage");
  const settings = await prisma.companySettings.findUnique({
    where: { id: 1 },
    include: { activeTaxTable: { include: { brackets: { orderBy: { fromCents: "asc" } } } } },
  });
  const table = settings?.activeTaxTable;

  return (
    <TaxForm
      defaults={{
        apitEnabled: settings?.apitEnabled ?? false,
        name: table?.name ?? "",
        effectiveFrom: table ? toDateInputValue(table.effectiveFrom) : "",
        brackets: (table?.brackets ?? []).map((b) => ({
          fromCents: centsToDecimalString(b.fromCents),
          toCents: b.toCents === null ? "" : centsToDecimalString(b.toCents),
          rateBp: bpToPercentString(b.rateBp),
        })),
      }}
    />
  );
}

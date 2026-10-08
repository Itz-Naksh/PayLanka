import { ComingSoon } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { bpToMultiplierString, bpToPercentString } from "@/lib/money";
import { CompanyForm } from "./company-form";

export const metadata = { title: "Company settings" };

export default async function CompanySettingsPage() {
  await requirePermission("settings:manage");
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });

  if (!settings) {
    return <ComingSoon phase={1}>Company settings are missing. Run <code>npm run db:seed</code>.</ComingSoon>;
  }

  return (
    <CompanyForm
      defaults={{
        name: settings.name,
        address: settings.address,
        epfRegNo: settings.epfRegNo,
        etfRegNo: settings.etfRegNo,
        epfEmployeeRateBp: bpToPercentString(settings.epfEmployeeRateBp),
        epfEmployerRateBp: bpToPercentString(settings.epfEmployerRateBp),
        etfEmployerRateBp: bpToPercentString(settings.etfEmployerRateBp),
        otHourlyDivisor: String(settings.otHourlyDivisor),
        otMultiplierBp: bpToMultiplierString(settings.otMultiplierBp),
        noPayDayDivisor: String(settings.noPayDayDivisor),
      }}
    />
  );
}

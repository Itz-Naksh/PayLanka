import { ComingSoon, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings:manage");

  return (
    <>
      <PageHeader title="Settings" description="Company details, contribution rates and user accounts." />
      <ComingSoon phase={2}>Company details, EPF/ETF registration numbers and configurable contribution rates.</ComingSoon>
    </>
  );
}

import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/card";
import { TabNav } from "@/components/ui/tab-nav";
import { requirePermission } from "@/lib/auth/session";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  await requirePermission("settings:manage");

  return (
    <>
      <PageHeader title="Settings" description="Company details, contribution rates and user accounts." />
      <TabNav
        label="Settings sections"
        tabs={[
          { href: "/settings/company", label: "Company & rates" },
          { href: "/settings/tax", label: "Income tax (APIT)" },
          { href: "/settings/users", label: "Users" },
        ]}
      />
      {children}
    </>
  );
}

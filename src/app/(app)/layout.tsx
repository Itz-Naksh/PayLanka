import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { version } from "../../../package.json";
import { hasPermission, navItemsFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { periodLabel } from "@/lib/payroll/period";
import { isLockedDemoUser } from "@/server/guard";
import { currentMonthRun } from "@/server/payroll/queries";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/session-ended");
  if (user.mustChangePassword) redirect("/change-password");

  const [company, thisMonth] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 1 }, select: { name: true } }),
    hasPermission(user.role, "payroll:read") ? currentMonthRun() : null,
  ]);
  const payroll = thisMonth
    ? {
        periodLabel: periodLabel(thisMonth.period),
        status: thisMonth.run?.status ?? null,
        href: thisMonth.run ? `/payroll/${thisMonth.run.id}` : hasPermission(user.role, "payroll:edit") ? "/payroll/new" : "/payroll",
      }
    : null;

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      companyName={company?.name ?? "Company not set up"}
      nav={navItemsFor(user.role)}
      demo={isLockedDemoUser(user)}
      payroll={payroll}
      version={version}
    >
      {children}
    </AppShell>
  );
}

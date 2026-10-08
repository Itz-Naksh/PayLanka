import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { navItemsFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isLockedDemoUser } from "@/server/guard";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");

  const company = await prisma.companySettings.findUnique({
    where: { id: 1 },
    select: { name: true },
  });

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      companyName={company?.name ?? "Company not set up"}
      nav={navItemsFor(user.role)}
      demo={isLockedDemoUser(user)}
    >
      {children}
    </AppShell>
  );
}

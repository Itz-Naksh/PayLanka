"use client";

import {
  BarChart3,
  Building2,
  KeyRound,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { NavItem, Role } from "@/lib/auth/permissions";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/employees": Users,
  "/payroll": Wallet,
  "/reports": BarChart3,
  "/audit-log": History,
  "/settings": Settings,
  "/my/payslips": Receipt,
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  HR: "HR / Accountant",
  EMPLOYEE: "Employee",
};

type AppShellProps = {
  user: { name: string; email: string; role: Role };
  companyName: string;
  nav: NavItem[];
  /** Show the "you are in the public demo" strip. */
  demo?: boolean;
  children: ReactNode;
};

export function AppShell({ user, companyName, nav, demo = false, children }: AppShellProps) {
  const pathname = usePathname();
  // Remember which page the mobile drawer was opened on; navigating anywhere
  // else closes it automatically, with no effect needed.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary-hover">
          <Wallet className="size-4.5" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight">PayLanka</span>
      </div>

      <div className="flex items-center gap-2 px-5 py-4 text-sm text-white/80">
        <Building2 className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{companyName}</span>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {nav.map((item) => {
          const Icon = ICONS[item.href] ?? FileText;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white shadow-[inset_3px_0_0_var(--color-accent)]"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-white/70">{ROLE_LABELS[user.role]}</p>
        <Link
          href="/change-password"
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
        >
          <KeyRound className="size-4" aria-hidden />
          Change password
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-primary text-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85%] bg-primary text-white shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 rounded-lg p-1.5 text-white/80 hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-muted hover:bg-primary-soft"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <span className="font-semibold">PayLanka</span>
        </header>
        {demo ? (
          <div className="flex items-center justify-center gap-2 border-b border-accent/40 bg-accent-soft px-4 py-2 text-center text-sm text-foreground">
            <Sparkles className="size-4 shrink-0 text-warning-ink" aria-hidden />
            <span>
              <strong className="font-semibold">Demo mode</strong> — you&apos;re exploring sample data shared with other
              visitors. It resets regularly.
            </span>
          </div>
        ) : null}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

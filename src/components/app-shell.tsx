"use client";

import {
  ArrowRight,
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
import { useEffect, useState, type ReactNode } from "react";
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

/** Keep the order of NAV_ITEMS, but bundle consecutive items under their group heading. */
function groupNav(items: NavItem[]) {
  const groups: { group: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}

export type PayrollCard = { periodLabel: string; status: "DRAFT" | "REVIEW" | "APPROVED" | null; href: string };

const CARD_STATUS = {
  DRAFT: { label: "Draft", dot: "bg-white/70", action: "Continue" },
  REVIEW: { label: "In review", dot: "bg-accent", action: "Review" },
  APPROVED: { label: "Approved", dot: "bg-success", action: "View" },
} as const;

function PayrollStatusCard({ card }: { card: PayrollCard }) {
  const status = card.status ? CARD_STATUS[card.status] : null;
  return (
    <Link
      href={card.href}
      // Only on screens tall enough for the whole menu; the menu always wins.
      className="mx-3 mb-3 hidden rounded-xl bg-white/10 p-3.5 text-sm ring-1 ring-white/10 transition hover:bg-white/15 [@media(min-height:760px)]:block"
    >
      <p className="text-[11px] font-semibold tracking-wider text-white/55 uppercase">This month</p>
      <p className="mt-0.5 font-semibold">{card.periodLabel}</p>
      <p className="mt-2 flex items-center gap-2 text-white/85">
        <span className={cn("size-2 rounded-full", status?.dot ?? "bg-white/30")} aria-hidden />
        Payroll: {status?.label ?? "Not started"}
      </p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">
        {status?.action ?? "Start payroll"}
        <ArrowRight className="size-3.5" aria-hidden />
      </p>
    </Link>
  );
}

type AppShellProps = {
  user: { name: string; email: string; role: Role };
  companyName: string;
  nav: NavItem[];
  /** Show the "you are in the public demo" strip. */
  demo?: boolean;
  /** This month's payroll status card (only for roles that can see payroll). */
  payroll?: PayrollCard | null;
  /** App version from package.json, shown in the sidebar footer. */
  version?: string;
  children: ReactNode;
};

export function AppShell({ user, companyName, nav, demo = false, payroll = null, version, children }: AppShellProps) {
  const pathname = usePathname();
  // Remember which page the mobile drawer was opened on; navigating anywhere
  // else closes it automatically, with no effect needed.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);

  // Escape closes the mobile menu (expected behaviour for any dialog).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary-hover">
          <Wallet className="size-4.5" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight">PayLanka</span>
      </div>

      {/* Up to two lines, so long names like "… (Pvt) Ltd" aren't cut off. */}
      <div className="flex items-start gap-2 px-5 py-4 text-sm leading-snug text-white/80" title={companyName}>
        <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="line-clamp-2">{companyName}</span>
      </div>

      {/* min-h-0 lets the menu shrink and scroll on short screens instead of sliding under the card below. */}
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {groupNav(nav).map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/55 uppercase">{group}</p>
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = ICONS[item.href] ?? FileText;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                        active
                          ? "bg-white/15 text-white shadow-[inset_3px_0_0_var(--color-accent)]"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="size-4.5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {payroll ? <PayrollStatusCard card={payroll} /> : null}

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
        {version ? <p className="mt-3 px-2 text-[11px] text-white/45">PayLanka v{version}</p> : null}
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
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
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

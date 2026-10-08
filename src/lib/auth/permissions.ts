/**
 * Single source of truth for "who can do what".
 *
 * This file must stay free of server-only imports: it is used by the proxy
 * (route guard), server code (action guard) and client components (hiding nav
 * links). Hiding a link is only cosmetic — the server checks are what count.
 */
import type { Role } from "@/generated/prisma/enums";

export type { Role };

export const PERMISSIONS = {
  "dashboard:view": ["ADMIN", "HR"],
  "settings:manage": ["ADMIN"],
  "users:manage": ["ADMIN"],
  "employees:read": ["ADMIN", "HR"],
  "employees:write": ["ADMIN", "HR"],
  "payroll:read": ["ADMIN", "HR"],
  "payroll:edit": ["ADMIN", "HR"],
  "payroll:submit": ["ADMIN", "HR"],
  // Segregation of duties: the preparer (HR) cannot approve their own payroll.
  "payroll:approve": ["ADMIN"],
  "reports:read": ["ADMIN", "HR"],
  "audit:read": ["ADMIN", "HR"],
  "payslips:own": ["EMPLOYEE"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Route prefix -> permission needed to open it. Longest prefix wins. */
const ROUTE_PERMISSIONS: ReadonlyArray<[prefix: string, permission: Permission]> = [
  ["/dashboard", "dashboard:view"],
  ["/employees", "employees:read"],
  ["/payroll", "payroll:read"],
  ["/reports", "reports:read"],
  ["/settings", "settings:manage"],
  ["/audit-log", "audit:read"],
  ["/my", "payslips:own"],
];

export function canAccessPath(role: Role, pathname: string): boolean {
  const match = ROUTE_PERMISSIONS.filter(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ).sort((a, b) => b[0].length - a[0].length)[0];
  // Paths not listed (e.g. "/", "/forbidden") only require being logged in.
  return match ? hasPermission(role, match[1]) : true;
}

export function homePathFor(role: Role): string {
  return role === "EMPLOYEE" ? "/my/payslips" : "/dashboard";
}

export type NavGroup = "Overview" | "Payroll" | "Administration" | "My pay";

export type NavItem = { href: string; label: string; permission: Permission; group: NavGroup };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard:view", group: "Overview" },
  { href: "/employees", label: "Employees", permission: "employees:read", group: "Payroll" },
  { href: "/payroll", label: "Payroll", permission: "payroll:read", group: "Payroll" },
  { href: "/reports", label: "Reports", permission: "reports:read", group: "Payroll" },
  { href: "/audit-log", label: "Audit log", permission: "audit:read", group: "Administration" },
  { href: "/settings", label: "Settings", permission: "settings:manage", group: "Administration" },
  { href: "/my/payslips", label: "My payslips", permission: "payslips:own", group: "My pay" },
];

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => hasPermission(role, item.permission));
}
